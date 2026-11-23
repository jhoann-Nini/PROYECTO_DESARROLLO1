# Reincidencia con restricciones graduales: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** aplicar de forma automática el aviso, la revisión previa y el
bloqueo según las faltas de moderación de los últimos 90 días, y listar las
cuentas con 4 faltas o más para el administrador.

**Arquitectura:** `ReincidenciaService` deduce el estado a partir de
`resena_moderacion_auditoria`, sin guardarlo. Se consulta en tres sitios:
al publicar o editar reseñas, al reportar y al armar la cola de revisión.
Hay dos endpoints de lectura, una tarjeta en el perfil y una sección en el
panel de administración.

**Tecnologías:** Spring Boot 4 y JPA (H2 en las pruebas), Next.js 16,
React 19 y Vitest.

**Diseño:** `proyectos/docs/superpowers/specs/2026-11-22-reincidencia-design.md`

## Restricciones globales

- Ventana de faltas: 90 días. Revisión previa: 30 días. Bloqueo: 7 días. Los
  plazos se cuentan desde la falta más reciente.
- Umbrales: aviso con 1 falta, revisión previa con 2, bloqueo con 3, lista
  del administrador con 4.
- Una falta es un `RECHAZAR`, o un `OCULTAR` sin un `RESTAURAR` posterior en
  la misma reseña. Cuentan también las reseñas eliminadas (`estado = false`).
- Mensaje del 403, literal: `Tu cuenta no puede publicar ni reportar hasta el {dd/MM/yyyy HH:mm} por reincidencia.`
- Motivo en la cola, literal: `Revisión previa por reincidencia`.
- Las entidades no cambian. La migración 025 solo crea un índice y va en dos
  copias idénticas.
- Commits en `nini` con Conventional Commits.

## Puntos de atención en la revisión

1. **Una revisión previa que vence con la reseña todavía en la cola:** el
   moderador debe seguir viendo el motivo. Por eso el motivo depende de tener
   2 faltas o más en la ventana, no de que la revisión previa siga vigente
   (Tarea 3).
2. **Un `OCULTAR` revertido con `RESTAURAR` y vuelto a ocultar:** cuenta como
   una falta, no como dos ni como cero (Tarea 1).
3. **Un bloqueo con la reseña ya existente** (la creación se convierte en
   edición): también devuelve 403. La comprobación va en la entrada de
   `crearOActualizar`, antes de cualquier rama (Tarea 2).
4. **Eliminar una reseña propia con bloqueo:** sigue funcionando (Tarea 2).
5. **Faltas en el límite exacto de 90 días:** cuenta `fechaEvento >= ahora - 90 días` (Tarea 1).

---

### Tarea 1: Cálculo de reincidencia, consultas e índice 025

**Archivos:**
- Crear: `backend/src/main/java/com/example/backend/service/ReincidenciaService.java`
- Crear: `backend/src/main/java/com/example/backend/service/NivelReincidencia.java` (enum `NINGUNO, AVISO, REVISION_PREVIA, BLOQUEO`)
- Crear: `backend/src/main/java/com/example/backend/dto/EstadoReincidenciaResponse.java`
- Modificar: `backend/src/main/java/com/example/backend/repository/ResenaModeracionAuditoriaRepository.java`
- Crear: `backend/src/main/resources/db/migration/025_indice_resena_usuario.sql` y una copia idéntica en `docs/sql/`
- Pruebas: `backend/src/test/java/com/example/backend/service/ReincidenciaServiceTest.java` (cálculo puro) y `.../ReincidenciaRepositoryTest.java` (`@SpringBootTest @Transactional`, consulta sobre H2)

**Interfaces que produce:**
- `record EstadoReincidenciaResponse(int faltas, NivelReincidencia nivel, LocalDateTime ultimaFalta, LocalDateTime revisionPreviaHasta, LocalDateTime bloqueoHasta, LocalDateTime proximaCaducidad)` con `boolean bloqueoActivo()` y `boolean revisionPreviaActiva()`. Estos dos métodos llevan `@JsonIgnore`, o se calculan a partir del nivel, para no exponerlos en JSON.
- `static EstadoReincidenciaResponse ReincidenciaService.calcular(List<LocalDateTime> fechasFaltas, LocalDateTime ahora)`: las fechas llegan ya filtradas por la ventana, en cualquier orden.
- `EstadoReincidenciaResponse evaluar(Long idUsuario)`
- `void verificarPuedePublicar(Long idUsuario)`: lanza `ResponseStatusException(FORBIDDEN, mensaje literal)` si `bloqueoActivo()`.
- `boolean requiereRevisionPrevia(Long idUsuario)`
- Constantes: `VENTANA_DIAS = 90`, `REVISION_PREVIA_DIAS = 30`, `BLOQUEO_DIAS = 7`, `MIN_FALTAS_ADMIN = 4`, `MOTIVO_REVISION_PREVIA`.
- Repositorio: `List<LocalDateTime> findFechasFaltasDelAutorDesde(Long idUsuario, LocalDateTime desde)`. Es JPQL: evento `RECHAZAR`, o `OCULTAR` con `NOT EXISTS` de un `RESTAURAR` posterior en la misma reseña (posterior por `fechaEvento`; si las fechas son iguales, por `idAuditoria`). Une con `a.resena.usuario.idUsuario`, sin filtrar por `resena.estado`.

- [ ] **Paso 1: escribir las pruebas que fallan**
  - En `ReincidenciaServiceTest`, con `ahora = 2026-11-22T12:00`:
    - `sinFaltasNivelNinguno`: 0 faltas, todas las fechas nulas.
    - `unaFaltaEsAviso`: `proximaCaducidad = falta + 90d`.
    - `dosFaltasRecientesRevisionPrevia`: `revisionPreviaHasta = ultima + 30d` y bloqueo nulo.
    - `dosFaltasConLaUltimaDeHace31DiasVuelveAAviso`.
    - `tresFaltasBloqueaSieteDiasDesdeLaUltima`.
    - `tresFaltasConBloqueoVencidoSigueEnRevisionPrevia`: la última hace 10 días.
    - `proximaCaducidadEsLaFaltaMasAntigua`.
  - En `ReincidenciaRepositoryTest`:
    - `cuentaRechazarYOcultarNoRevertido`;
    - `ocultarRestaurarOcultarCuentaUna`;
    - `cuentaFaltasDeResenasEliminadas`;
    - `ignoraEventosAnterioresALaVentana`;
    - `ignoraAprobarYRestaurar`.

- [ ] **Paso 2: ejecutar** `./mvnw test -Dtest='Reincidencia*'`. Resultado esperado: falla de compilación.

- [ ] **Paso 3: implementar** el enum, el DTO, el servicio y la consulta. El nivel es el más alto vigente: `BLOQUEO` si el bloqueo está activo; si no, `REVISION_PREVIA` si la revisión previa está activa; si no, `AVISO` si hay faltas. Usar `LocalDateTime.now()`. El cálculo puro recibe `ahora` para poder probarlo.

- [ ] **Paso 4: escribir la migración 025**, siguiendo `.claude/skills/supabase-auditor/references/convenciones-migraciones.md`:
  - `CREATE INDEX IF NOT EXISTS idx_resena_usuario ON public.resena (id_usuario);`
  - la fila en `schema_version` con `ON CONFLICT DO NOTHING`;
  - comprobar con `cmp` que las dos copias son idénticas.

- [ ] **Paso 5: ejecutar** `./mvnw test -Dtest='Reincidencia*'`. Resultado esperado: todo pasa.

- [ ] **Paso 6: commit** `feat(moderacion): cálculo de reincidencia desde el historial e índice 025`.

### Tarea 2: Aplicar el bloqueo y la revisión previa

**Archivos:**
- Modificar: `ResenaService.java` (`crearOActualizar`, `actualizar(Long, Long, …)`)
- Modificar: `ResenaCreateTransaction.java`, `ResenaUpdateHelper.java`
- Modificar: `ReporteResenaService.java` (`crearReporte`), `ReporteOfertaService.java` (`crearReporte`)
- Prueba: `backend/src/test/java/com/example/backend/controller/ReincidenciaIntegrationTest.java`

**Interfaces que consume:** `verificarPuedePublicar` y `requiereRevisionPrevia` (Tarea 1).

- [ ] **Paso 1: escribir las pruebas que fallan.** Crean las faltas insertando eventos con `ResenaModeracionAuditoriaRepository` sobre reseñas del autor (H2 no ejecuta triggers).
  - `bloqueoImpidePublicar403` comprueba el mensaje con «por reincidencia».
  - `bloqueoImpideEditar403`.
  - `bloqueoImpideCrearSobreResenaExistente403`.
  - `bloqueoImpideReportarResena403`.
  - `bloqueoImpideReportarOferta403`.
  - `bloqueoPermiteEliminarSuResena204`: aceptar el código que hoy devuelve la eliminación.
  - `revisionPreviaDejaPendienteUnTextoLimpio`.
  - `revisionPreviaDejaPendienteAlEditarUnaPublicada`.
  - `conUnaFaltaSePublicaNormal`.

- [ ] **Paso 2: ejecutar.** Resultado esperado: fallan.

- [ ] **Paso 3: implementar.**
  - `verificarPuedePublicar(usuario.getIdUsuario())` justo después de `validarUsuarioActivo` en `crearOActualizar`, en `actualizar` y en los dos `crearReporte`. En los reportes va antes de `limiteReportesService.verificarLimite`.
  - En los tres puntos donde se calcula `estadoModeracion`: `requiereRevisionPrevia(id) ? EstadoModeracion.PENDIENTE : <cálculo actual>`.

- [ ] **Paso 4: ejecutar** la prueba nueva y luego `./mvnw test` completo. Resultado esperado: todo pasa.

- [ ] **Paso 5: commit** `feat(moderacion): bloqueo y revisión previa por reincidencia`.

### Tarea 3: Motivo en la cola y endpoints de lectura

**Archivos:**
- Modificar: `RevisionResenasService.java` (`toResponse`)
- Modificar: `UsuarioController.java`: `GET /api/usuarios/me/reincidencia`
- Crear: `dto/CuentaReincidenteResponse.java`, `record (Long idUsuario, String nombre, String correo, long faltas, LocalDateTime ultimaFalta)`
- Modificar: `AdministracionCuentasController.java`: `GET /api/admin/usuarios/reincidentes`; y en `AdministracionCuentasService`, `List<CuentaReincidenteResponse> listarReincidentes(Jwt)` con la misma validación de administrador que ya usa
- Modificar: `ResenaModeracionAuditoriaRepository`: `List<CuentaReincidenteResponse> findCuentasReincidentes(LocalDateTime desde, long minimo)`. Es JPQL con constructor, con el mismo criterio de falta, `usuario.estado = true`, `GROUP BY`, `HAVING COUNT >= :minimo` y orden por faltas descendente.
- Prueba: ampliar `ReincidenciaIntegrationTest`

- [ ] **Paso 1: escribir las pruebas que fallan.**
  - `colaMuestraMotivoRevisionPrevia`: `riesgo` es `MEDIO` y `motivosDeteccion` contiene el motivo literal.
  - `colaConservaElMotivoAunqueLaRevisionPreviaHayaVencido`: 2 faltas, la última de hace 40 días.
  - `meReincidenciaDevuelveNivelYFechas`.
  - `meReincidenciaSinToken401`.
  - `reincidentesSoloAdministrador403`.
  - `reincidentesListaCuatroFaltasYExcluyeSuspendidasYTresFaltas`.

- [ ] **Paso 2: ejecutar.** Resultado esperado: fallan.

- [ ] **Paso 3: implementar.**
  - En `toResponse`: si el autor tiene 2 faltas o más en la ventana y el riesgo del texto es menor que `MEDIO`, el riesgo pasa a `MEDIO` y se agrega el motivo.
  - Endpoints que delegan en los servicios.

- [ ] **Paso 4: ejecutar** `./mvnw test`. Resultado esperado: todo pasa.

- [ ] **Paso 5: commit** `feat(moderacion): motivo de revisión previa y endpoints de reincidencia`.

### Tarea 4: Frontend, perfil y panel de administración

**Archivos:**
- Modificar: `frontend/src/types/moderacion.ts`: `EstadoReincidencia`, `NivelReincidencia`, `CuentaReincidente`
- Modificar: `frontend/src/services/api.ts`: `obtenerMiReincidencia(): Promise<EstadoReincidencia>`, `obtenerCuentasReincidentes(): Promise<CuentaReincidente[]>`
- Crear: `frontend/src/components/perfil/EstadoCuentaReincidencia.tsx` y su `.test.tsx`
- Modificar: `frontend/src/app/perfil/PerfilCliente.tsx`: carga el estado con sesión y muestra la tarjeta
- Modificar: `frontend/src/components/admin/AdminUsuariosRoles.tsx` y su `.test.tsx`: sección «Cuentas reincidentes»

**Interfaces que consume:** las respuestas JSON de la Tarea 3. Las fechas llegan como cadenas ISO.

**Textos** (tuteo, fechas con `Intl.DateTimeFormat("es-CO")`):
- `AVISO`: «Una de tus reseñas fue rechazada por moderación. Si se acumulan más, tus próximas reseñas pasarán por revisión antes de publicarse.»
- `REVISION_PREVIA`: «Tus reseñas pasarán por revisión antes de publicarse hasta el {fecha}.»
- `BLOQUEO`: «No puedes publicar ni reportar hasta el {fecha}.»
- Siempre: «Faltas en los últimos 90 días: {n}. La más antigua deja de contar el {fecha}.»

- [ ] **Paso 1: escribir las pruebas que fallan.**
  - Tarjeta:
    - con `NINGUNO` o `null` no muestra nada;
    - muestra el texto de cada nivel con su fecha;
    - usa `role="status"`.
  - Panel de administración:
    - lista nombre, correo y faltas;
    - «Revisar» rellena la búsqueda con el correo y selecciona la cuenta;
    - si no hay reincidentes muestra «No hay cuentas con 4 faltas o más.»;
    - si falla la carga, el resto del panel sigue funcionando.
  - Perfil: con un mock de `obtenerMiReincidencia`, la tarjeta aparece.

- [ ] **Paso 2: ejecutar** `npx vitest run src/components/perfil src/components/admin src/app/perfil`. Resultado esperado: fallan.

- [ ] **Paso 3: implementar.** Si la consulta del perfil falla, no se muestra la tarjeta y no hay mensaje de error.

- [ ] **Paso 4: ejecutar** `npx tsc --noEmit`, `npm run lint`, `npm test` y `npm run build`. Resultado esperado: todo pasa.

- [ ] **Paso 5: commit** `feat(frontend): estado de la cuenta y cuentas reincidentes`.

### Tarea 5: Documentación

**Archivos:**
- `docs/api.md`: §33.5, con reglas, 403 y los dos endpoints
- `backend/API_DOCUMENTATION.md`: una fila en la tabla
- `docs/modelo-datos.md`: índice 025
- `docs/caso6-moderacion-antibots.md`: marcar la reincidencia como hecha
- `frontend/docs/moderacion-resenas.md`
- Estado del diseño: «aprobado e implementado»

- [ ] **Paso 1:** escribir la documentación.
- [ ] **Paso 2:** ejecutar `./mvnw test` y `npm test`. Resultado esperado: todo pasa.
- [ ] **Paso 3:** commit `docs(moderacion): reincidencia con restricciones graduales`.
