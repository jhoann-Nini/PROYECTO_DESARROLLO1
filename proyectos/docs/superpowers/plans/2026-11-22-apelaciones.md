# Apelaciones de decisiones de moderación: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** que el autor apele un `RECHAZAR` o un `OCULTAR` en un plazo de
15 días, que otro moderador lo resuelva, y que una apelación aceptada revierta
la decisión y anule la falta.

**Arquitectura:**
- La tabla `apelacion` (migración 026) es la fuente de verdad y sus triggers
  hacen cumplir las reglas.
- `ApelacionService` orquesta la creación y la resolución. Al aceptar,
  reutiliza los eventos `APROBAR` y `RESTAURAR` en la misma transacción.
- La reincidencia excluye las decisiones con apelación aceptada.

**Tecnologías:** Spring Boot 4 y JPA (H2 en las pruebas), PostgreSQL 17 local
para los triggers, Next.js 16, React 19 y Vitest.

**Diseño:** `proyectos/docs/superpowers/specs/2026-11-22-apelaciones-design.md`

## Restricciones globales

- Plazo: 15 días desde `fecha_evento` de la decisión. Una apelación por
  `id_auditoria`.
- Motivo y respuesta: no vacíos, máximo 1000 caracteres. La respuesta al
  aceptar es opcional en la API; si viene vacía se guarda
  `Apelación aceptada: la decisión se revirtió.`
- Quien resuelve: rol activo de moderador o administrador, que no sea el autor
  ni `resena_moderacion_auditoria.id_moderador` de la decisión. `403` con
  `Tú tomaste la decisión original; debe resolverla otra persona.` o
  `No puedes resolver una apelación sobre tu propia reseña.`
- Motivo del `APROBAR` o `RESTAURAR` que genera la aceptación, literal:
  `Apelación aceptada`.
- Una cuenta suspendida no apela. El bloqueo por reincidencia no impide apelar.
- La migración 026 va en dos copias idénticas. Las funciones llevan
  `SET search_path = pg_catalog` y no se otorgan permisos a `anon` ni
  `authenticated`.
- Commits en `nini` con Conventional Commits.

## Puntos de atención en la revisión

1. **Aceptar cuando la reseña ya no está en el estado apelado** (el autor la
   editó, u otro moderador la restauró): anula la falta y no publica ni
   genera eventos (Tarea 3).
2. **Dos moderadores resuelven la misma apelación a la vez:** el segundo
   recibe `409`. Bloqueo pesimista al leer la apelación (Tarea 3).
3. **Apelar una reseña con varias decisiones:** se apela la más reciente de
   tipo `RECHAZAR` u `OCULTAR`. Si esa ya tiene apelación, `409` aunque una
   anterior no la tenga (Tarea 2).
4. **Un `OCULTAR` revertido con `RESTAURAR`:** `409` «ya fue restaurada»
   (Tarea 2).
5. **Reseña eliminada con una apelación pendiente:** al resolverla se marca
   igual y no se publica nada (Tarea 3, como el punto 1).

---

### Tarea 1: Migración 026, entidad y verificación en PostgreSQL

**Archivos:**
- Crear: `backend/src/main/resources/db/migration/026_apelaciones.sql` y una copia idéntica en `docs/sql/`
- Crear: `docs/sql/tests/026_verificacion_apelaciones.sql`, con escenarios en bloques `DO $$ … $$` que lanzan una excepción si una regla no se cumple, siguiendo el patrón de `011_verificacion_postgresql.sql`
- Crear: `backend/src/main/java/com/example/backend/entity/Apelacion.java` y `EstadoApelacion.java` (enum `PENDIENTE, ACEPTADA, RECHAZADA`, guardado como `STRING`)
- Crear: `backend/src/main/java/com/example/backend/repository/ApelacionRepository.java`

**Interfaces que produce:**
- `Apelacion`: `idApelacion`, `decision` (`@ManyToOne ResenaModeracionAuditoria`, columna `id_auditoria`), `autor` (`Usuario`), `motivo`, `estado`, `fechaSolicitud`, `moderador` (`Usuario`, puede ser nulo), `respuesta`, `fechaResolucion`.
- `ApelacionRepository`:
  - `Optional<Apelacion> findByDecisionIdAuditoria(Long)`;
  - `Optional<Apelacion> findByIdForUpdate(Long)`, con `@Lock(PESSIMISTIC_WRITE)`;
  - `List<Apelacion> findByEstadoOrderByFechaSolicitudAsc(EstadoApelacion)`, con `@EntityGraph` sobre la decisión, la reseña, el producto y los usuarios;
  - `List<Apelacion> findByAutorIdUsuario(Long)`;
  - `long countByEstado(EstadoApelacion)`.

- [ ] **Paso 1: escribir el script de verificación**, antes de la migración. Escenarios:
  - una apelación válida se inserta;
  - una segunda sobre la misma decisión falla;
  - una sobre un `APROBAR` falla;
  - una con `id_autor` distinto del autor falla;
  - una fuera de plazo falla (`fecha_solicitud` = decisión + 16 días);
  - una sobre una reseña eliminada falla;
  - resolverla con el moderador original falla;
  - resolverla con el autor falla;
  - resolverla con otro moderador funciona;
  - volver a resolverla falla;
  - un `UPDATE` del motivo falla;
  - un `DELETE` falla;
  - aceptar un `RECHAZAR` haciendo `UPDATE resena` a `PENDIENTE`, `INSERT APROBAR` y `UPDATE resena` a `PUBLICADA` en una transacción funciona con los triggers de la 020.

- [ ] **Paso 2: preparar la base local y comprobar que el script falla.**
  - Volcar el esquema de Supabase con `pg_dump --schema-only --schema=public`. Las credenciales están en `backend/.env`; nunca mostrarlas.
  - Restaurarlo en un `postgres:17` de Docker.
  - Ejecutar `psql -v ON_ERROR_STOP=1 -f docs/sql/tests/026_verificacion_apelaciones.sql`. Resultado esperado: falla porque la tabla `apelacion` no existe.

- [ ] **Paso 3: escribir la migración 026** con la tabla y las restricciones del diseño y estos triggers:
  - `fn_validar_insert_apelacion`, `BEFORE INSERT`;
  - `fn_validar_update_apelacion`, `BEFORE UPDATE`;
  - `fn_proteger_apelacion`, `BEFORE DELETE`, más un trigger de `TRUNCATE`;
  - el preflight comprueba que la 024 está aplicada;
  - la fila en `schema_version`;
  - `REVOKE ALL` a `anon`, `authenticated` y `PUBLIC`.

- [ ] **Paso 4: aplicarla dos veces en la base local** (debe ser idempotente) y ejecutar el script. Resultado esperado: todos los escenarios pasan. Comprobar con `cmp` que las dos copias son idénticas.

- [ ] **Paso 5: validar las entidades.** Escribir la entidad y el repositorio y arrancar el backend con `ddl-auto=validate` contra la base local. Resultado esperado: arranca. Ejecutar `./mvnw test`. Resultado esperado: todo pasa.

- [ ] **Paso 6: commit** `feat(db): tabla de apelaciones con reglas en PostgreSQL (026)`.

### Tarea 2: Crear apelaciones y ver las propias

**Archivos:**
- Crear: `service/ApelacionService.java`, `controller/ApelacionController.java`
- Crear DTOs: `CrearApelacionRequest(Long idResena, String motivo)` con `@NotNull` y `@NotBlank @Size(max = 1000)`; `DecisionApelableResponse(Long idAuditoria, Long idResena, String nombreProducto, String comentarioRevisado, String accion, String motivoDecision, LocalDateTime fechaDecision, LocalDateTime plazoHasta, ApelacionResponse apelacion)`; `ApelacionResponse(Long idApelacion, String estado, String motivo, String respuesta, LocalDateTime fechaSolicitud, LocalDateTime fechaResolucion)`
- Modificar: `ResenaModeracionAuditoriaRepository`, para agregar `findDecisionesApelables(Long idUsuario, LocalDateTime desde)` (eventos `RECHAZAR` u `OCULTAR` sobre reseñas activas del autor, del más reciente al más antiguo) y `findUltimaDecisionApelable(Long idResena)` (`Optional`)
- Prueba: `controller/ApelacionIntegrationTest.java`, con el mismo armado que `ReincidenciaIntegrationTest`

**Interfaces que produce:**
- `ApelacionResponse crear(CrearApelacionRequest, Jwt)`
- `List<DecisionApelableResponse> listarMias(Jwt)`: ventana de 90 días (`ReincidenciaService.VENTANA_DIAS`)
- Rutas: `POST /api/apelaciones` (201) y `GET /api/apelaciones/mias`

- [ ] **Paso 1: escribir las pruebas que fallan.**
  - `creaApelacionSobreRechazo201`;
  - `apelaUnRechazoAunqueLaResenaSeHayaEditado`;
  - `segundaApelacionMismaDecision409`;
  - `fueraDePlazo409`: decisión de hace 16 días;
  - `resenaAjena403`;
  - `resenaEliminada404`;
  - `sinDecisionApelable409`;
  - `ocultamientoYaRestaurado409`;
  - `motivoVacio400`;
  - `cuentaSuspendida403`;
  - `bloqueadoPorReincidenciaPuedeApelar201`;
  - `apelaLaDecisionMasReciente`;
  - `miasListaDecisionesConPlazoYApelacion`;
  - `miasSinToken401`.

- [ ] **Paso 2: ejecutar** `./mvnw test -Dtest=ApelacionIntegrationTest`. Resultado esperado: fallan.

- [ ] **Paso 3: implementar.**
  - Las validaciones van en el servicio, con los mensajes de `409` del diseño. La base de datos repite las del trigger, pero el servicio responde antes con un mensaje claro.
  - Una violación de `uk_apelacion_auditoria` por concurrencia se traduce a `409`.

- [ ] **Paso 4: ejecutar** `./mvnw test`. Resultado esperado: todo pasa.

- [ ] **Paso 5: commit** `feat(moderacion): crear apelaciones y consultar las propias`.

### Tarea 3: Resolver apelaciones, cola, contador y reincidencia

**Archivos:**
- Modificar: `ApelacionService`, `controller/ModeracionApelacionesController.java` (nuevo, bajo `/api/moderacion/apelaciones`)
- DTOs:
  - `ApelacionModeracionResponse`: datos de la apelación, de la decisión, autor, moderador original y `boolean puedeResolver`;
  - `ResolverApelacionRequest(String respuesta)` con `@Size(max = 1000)`.
- Modificar: `ResenaModeracionAuditoriaRepository`: en las dos consultas de faltas, agregar `AND NOT EXISTS (SELECT ap.idApelacion FROM Apelacion ap WHERE ap.decision = a AND ap.estado = com.example.backend.entity.EstadoApelacion.ACEPTADA)`
- Modificar: `ResumenPendientesModeracionResponse` (campo `apelaciones` antes de `total`) y `ModeracionResumenService`
- Pruebas: ampliar `ApelacionIntegrationTest`; ajustar la prueba del contador en `SenalesSpamYContadorIntegrationTest`

**Interfaces que produce:**
- `List<ApelacionModeracionResponse> listarParaModeracion(EstadoApelacion estado, Jwt)`
- `ApelacionModeracionResponse aceptar(Long idApelacion, ResolverApelacionRequest, Jwt)`
- `ApelacionModeracionResponse rechazar(Long idApelacion, ResolverApelacionRequest, Jwt)`

- [ ] **Paso 1: escribir las pruebas que fallan.**
  - `aceptarRechazoPublicaLaResenaYRegistraAprobar`;
  - `aceptarOcultamientoRestauraYRegistraRestaurar`;
  - `aceptarConResenaEditadaNoPublicaPeroAnulaLaFalta`;
  - `aceptarAnulaLaFaltaEnReincidencia`: de 3 faltas a 2, el nivel pasa de `BLOQUEO` a `REVISION_PREVIA`;
  - `aceptarSinRespuestaUsaTextoPorDefecto`;
  - `rechazarExigeRespuesta400`;
  - `rechazarDejaLaFalta`;
  - `moderadorOriginalNoResuelve403`;
  - `autorNoResuelve403`;
  - `resolverDosVeces409`;
  - `usuarioNormal403`;
  - `colaMarcaPuedeResolverFalseAlModeradorOriginal`;
  - `contadorIncluyeApelacionesPendientes`.

- [ ] **Paso 2: ejecutar.** Resultado esperado: fallan.

- [ ] **Paso 3: implementar** la aceptación en este orden, dentro de una transacción:
  1. guardar la apelación como `ACEPTADA` (`saveAndFlush`);
  2. si la decisión es `RECHAZAR` y la reseña sigue `RECHAZADA` y activa: reseña a `PENDIENTE` (flush), `APROBAR` (flush) y reseña a `PUBLICADA` (flush);
  3. si la decisión es `OCULTAR` y la reseña sigue con `ocultaPorModeracion = true`: `RESTAURAR` (flush) y quitar el ocultamiento (flush), igual que `ReporteResenaService.publicarResena`.

- [ ] **Paso 4: ejecutar** `./mvnw clean test`. Resultado esperado: todo pasa.

- [ ] **Paso 5: volver a ejecutar en la base local** la parte del script de verificación que acepta un `RECHAZAR`, para confirmar el orden real de las operaciones.

- [ ] **Paso 6: commit** `feat(moderacion): resolver apelaciones y anular faltas`.

### Tarea 4: Frontend

**Archivos:**
- `frontend/src/types/moderacion.ts`: `DecisionApelable`, `Apelacion`, `ApelacionModeracion`, `EstadoApelacion`, y `apelaciones` en `ResumenPendientesModeracion`
- `frontend/src/services/api.ts`: `crearApelacion(idResena, motivo)`, `obtenerMisDecisiones()`, `obtenerApelacionesModeracion(estado?)`, `resolverApelacion(id, "aceptar" | "rechazar", respuesta?)`
- Crear: `components/perfil/DecisionesModeracion.tsx` y su `.test.tsx`; se integra en `PerfilCliente.tsx` después de `EstadoCuentaReincidencia`
- Crear: `components/moderacion/ColaApelaciones.tsx` y su `.test.tsx`, con la prop `onCambio`
- Modificar: `PanelModeracionModal.tsx`: cuarta pestaña «Apelaciones» con `pendientes: resumen?.apelaciones`

**Textos:**
- Botón «Apelar».
- Ayuda del formulario: «Puedes apelar hasta el {fecha}. Explica por qué crees que la decisión fue un error.»
- Estados: «En revisión», «Aceptada», «Rechazada».
- Aviso de conflicto: «Tú tomaste la decisión original; debe resolverla otra persona.»

- [ ] **Paso 1: escribir las pruebas que fallan.**
  - Perfil:
    - sin decisiones no muestra nada;
    - una decisión apelable muestra «Apelar»;
    - el formulario exige motivo y llama a `crearApelacion`;
    - una apelación pendiente o resuelta muestra su estado y la respuesta;
    - una fuera de plazo no muestra «Apelar».
  - Cola:
    - lista la decisión y el motivo del autor;
    - «Aceptar» envía la respuesta opcional;
    - «Rechazar» exige respuesta;
    - con `puedeResolver = false`, los botones están deshabilitados y aparece el aviso;
    - llama a `onCambio` tras resolver.
  - Panel: la pestaña «Apelaciones» con su contador.

- [ ] **Paso 2: ejecutar** `npx vitest run src/components/perfil src/components/moderacion`. Resultado esperado: fallan.

- [ ] **Paso 3: implementar.**

- [ ] **Paso 4: ejecutar** `npx tsc --noEmit`, `npm run lint`, `npm test` y `npm run build`. Resultado esperado: todo pasa.

- [ ] **Paso 5: commit** `feat(frontend): apelaciones en el perfil y en el panel de moderación`.

### Tarea 5: Documentación

- `docs/api.md`: §33.6, con las reglas, los cinco endpoints y los errores
- `backend/API_DOCUMENTATION.md`: tabla
- `docs/modelo-datos.md`: tabla `apelacion` y migración 026
- `docs/caso6-moderacion-antibots.md`: apelaciones hechas
- `frontend/docs/moderacion-resenas.md`
- Estado del diseño: «aprobado e implementado»

- [ ] **Paso 1:** escribir la documentación. **Paso 2:** commit `docs(moderacion): apelaciones`.
