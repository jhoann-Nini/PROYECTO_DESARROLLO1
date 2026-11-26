# Comunidad, fase 2: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** moderación del foro.
- **Reportes:** un usuario reporta publicaciones y respuestas; con 3 reportes activos el contenido se oculta solo.
- **Moderadores:**
  - aprueban o rechazan lo que retuvo el filtro;
  - ocultan, restauran y eliminan con motivo;
  - resuelven los reportes.
- **Auditoría:** cada decisión queda registrada con el texto revisado.

**Arquitectura:**
- **Migración 030:** tres tablas de solo inserción o con transiciones controladas por triggers, con el mismo diseño que las reseñas (006, 020, 021 y 024).
- **Backend:** servicios `ReporteComunidadService` y `ModeracionComunidadService`, y controladores bajo `/api/comunidad/**/reportes` y `/api/moderacion/comunidad/**`.
- **Frontend:** modal «Reportar» en el foro y una pestaña «Comunidad» en el panel de moderación.

**Tecnologías:** Spring Boot 4, JPA (`ddl-auto=validate`), PostgreSQL 17, Next.js 16, Vitest y Playwright (skill `pruebas-e2e-tecreview`).

**Especificación:** `proyectos/docs/superpowers/specs/2026-11-24-comunidad-design.md` (fase 2: CA-12, CA-13, CA-17, CA-18; RN-11, RN-13, RN-15, RN-16). Las tablas parten de la sección E2 de la auditoría.

## Restricciones globales

- **Umbral de ocultamiento:** 3 reportes no rechazados, igual que las reseñas. No se cambia (hallazgo H-07).
- **Límite de reportes:** 10 por hora, compartido entre reseñas, ofertas y comunidad (`LimiteReportesService`). El siguiente devuelve 429.
- **Quién reporta:**
  - nadie reporta ni modera su propio contenido (RN-16), comprobado en el trigger y en el servicio;
  - una cuenta suspendida o con bloqueo por reincidencia no reporta (RN-15).
- **Decisiones de moderación:**
  - toda decisión lleva un motivo de 1 a 500 caracteres y queda auditada con el texto revisado (RN-11);
  - la auditoría es de solo inserción.
- **Roles:** cada acción nueva valida el rol en `SecurityConfig` (`/api/moderacion/**`) **y** en el servicio (skill `moderacion-inteligente`).
- **Reincidencia:** en esta fase no cuenta las faltas del foro; la unificación es de la fase 3. Sí cuenta el bloqueo existente (de reseñas).
- **Migración:** Claude no aplica la 030 ni fusiona. Las entidades no se fusionan antes de que la 030 esté aplicada.

## Decisiones de diseño que se aprueban con este plan

1. **Reportes con destino exclusivo.** `reporte_comunidad` tiene `id_publicacion` e `id_respuesta`, una sola no nula (`CHECK num_nonnulls = 1`), y `tipo_contenido` generado. Así lo diseñó la auditoría: una cola única para el moderador y un único historial.
2. **Aceptar un reporte no oculta por sí solo.**
   - Al aceptarlo, el moderador elige una acción: `NINGUNA`, `OCULTAR` o `ELIMINAR`.
   - Si elige ocultar o eliminar, la decisión del contenido se audita en la misma transacción.
   - Rechazar un reporte lo saca del conteo del umbral, y el trigger restaura el contenido si baja de 3.
3. **El moderador puede eliminar contenido ajeno.** Era lo pendiente de la fase 1. Llega aquí con su auditoría (`ELIMINAR_MODERADOR`) y no se puede deshacer.
4. **Las acciones `CERRAR` y `REABRIR` ya entran en el CHECK de la auditoría**, para no migrar otra vez. Sus endpoints son de la fase 4 («cierre de hilos»).
5. **La cola «en revisión» calcula el riesgo y los motivos al leer**, con `AnalizadorContenido`, como la de reseñas. Ordena primero ALTO y después por antigüedad. No se guarda el riesgo en la tabla.
6. **Pruebas que dependen de triggers.** H2 no ejecuta triggers, así que el ocultamiento por 3 reportes y la auditoría obligatoria se prueban:
   - con el script SQL de la 030;
   - con pruebas de integración ejecutadas contra el PostgreSQL local con la 030 (marcadas con `@Tag("postgres-real")`, excluidas de la suite H2);
   - con una prueba E2E de pila completa (Tarea 6).

---

### Tarea 1: Migración 030 y su verificación (CA-12, CA-13, CA-17)

**Archivos:**
- Crear: `backend/src/main/resources/db/migration/030_moderacion_comunidad.sql` y una copia idéntica en `docs/sql/`.
- Crear: `docs/sql/tests/030_verificacion_moderacion_comunidad.sql`.

**Interfaces que produce (tablas y triggers):**
- **`moderacion_comunidad_auditoria`:**
  - `id_auditoria` BIGSERIAL;
  - `id_publicacion` o `id_respuesta`: exactamente una, y `tipo_contenido` generado;
  - `id_moderador` NOT NULL;
  - `accion`, con `CHECK IN ('APROBAR','RECHAZAR','OCULTAR','RESTAURAR','ELIMINAR_MODERADOR','CERRAR','REABRIR')`;
  - `motivo` (1 a 500 caracteres), `contenido_revisado` TEXT NOT NULL, `fecha_evento` e `id_transaccion` (`txid_current()`).
  - **Trigger `BEFORE INSERT`:**
    - el moderador tiene cuenta activa y rol Moderador o Administrador;
    - no es el autor del contenido;
    - la acción coincide con el estado previo: APROBAR y RECHAZAR solo sobre PENDIENTE; OCULTAR solo si no está oculto; RESTAURAR solo si está oculto por moderación; ELIMINAR_MODERADOR solo si no está eliminado.
  - **Solo inserción:** UPDATE, DELETE y TRUNCATE prohibidos.
- **Trigger diferido en `publicacion_comunidad` y `respuesta_comunidad`:** cuando un moderador cambia `estado_moderacion` desde PENDIENTE, `oculta_por_moderacion` o `eliminada` (con `eliminada_por` distinto del autor), exige el evento de auditoría correspondiente en la misma transacción, como la 020. Una eliminación hecha por el autor no lo exige.
- **`reporte_comunidad`:**
  - destino exclusivo y `tipo_contenido` generado;
  - `id_usuario`;
  - `motivo`, con `CHECK IN ('spam','lenguaje-ofensivo','acoso','falso','otro')`;
  - `descripcion`, obligatoria con `otro`, de hasta 500 caracteres;
  - `estado` (PENDIENTE, EN_REVISION, ACEPTADO o RECHAZADO), `fecha_creacion` y `fecha_actualizacion`.
  - **Índices únicos parciales:** un reporte abierto por usuario y contenido, uno por cada FK.
  - **Índice de cuota:** `(id_usuario, fecha_creacion)`.
  - **Trigger `BEFORE INSERT`:** rechaza que el autor reporte lo suyo y que se reporte contenido eliminado.
  - **Trigger `BEFORE UPDATE`:** transiciones PENDIENTE → EN_REVISION → ACEPTADO o RECHAZADO (los estados finales no cambian); el destino, el usuario y el motivo no cambian.
- **`reporte_comunidad_historial`:** de solo inserción, como la 021:
  - actor con rol activo, sin conflicto de interés y estado anterior igual al actual;
  - justificación obligatoria;
  - trigger diferido que exige el evento de historial en cada cambio de estado.
- **Ocultamiento por reportes:** un trigger `AFTER INSERT OR UPDATE OF estado` en `reporte_comunidad` cuenta los reportes no rechazados del contenido, bloqueando su fila con `FOR NO KEY UPDATE`. Con 3 o más pone `oculta_por_reportes = true`; con menos, false.
- **Seguridad, registro y preflight:** RLS sin políticas y `REVOKE ALL` en tablas, secuencias y funciones; funciones con `SET search_path = pg_catalog`; `lock_timeout` de 5 s; preflight de la 029; fila `030_moderacion_comunidad`.

- [ ] **Paso 1: escribir el script de verificación.** Usa `pg_temp.debe_fallar` y `SET CONSTRAINTS ALL IMMEDIATE`, dentro de una transacción con ROLLBACK. Comprueba:
  - **Reportes:**
    - autorreporte, duplicado abierto, motivo desconocido, `otro` sin descripción y reporte de contenido eliminado fallan;
    - un segundo reporte tras uno RECHAZADO se permite.
  - **Ocultamiento:**
    - el tercer reporte oculta el contenido;
    - rechazar uno restaura;
    - aceptar no restaura.
  - **Transiciones de reportes:** inválidas o sin historial fallan; historial con conflicto de interés falla.
  - **Auditoría:**
    - acción del autor, de un usuario sin rol, o incoherente con el estado (APROBAR algo publicado, RESTAURAR algo no oculto) falla;
    - UPDATE y DELETE de la auditoría fallan;
    - un moderador que oculta o elimina sin evento de auditoría falla.
  - **Eliminación:** el autor elimina lo suyo sin auditoría y se permite.
  - **CA-17:** RLS, políticas y privilegios de las 3 tablas nuevas.
- [ ] **Paso 2: ejecutarlo en PostgreSQL 17 local** restaurado con la 029. Resultado esperado: falla.
- [ ] **Paso 3: escribir la migración.**
- [ ] **Paso 4: aplicarla dos veces,** ejecutar el script y los de la 028 y la 029, y comprobar las copias con `cmp`. Resultado esperado: «OK» en todos.
- [ ] **Paso 5: punto de control 1.** Revisión independiente de la migración.
- [ ] **Paso 6: commit** `feat(db): moderación y reportes de la comunidad (030)`. Pedir que se apruebe y se aplique.

### Tarea 2: Reportes (CA-12)

**Archivos:**
- Crear:
  - `entity/ReporteComunidad.java`, `entity/ReporteComunidadHistorial.java` y `entity/MotivoReporteComunidad.java`;
  - sus repositorios;
  - `service/ReporteComunidadService.java`;
  - `controller/ComunidadReportesController.java`;
  - los DTO en `dto/comunidad/`.
- Modificar: `service/LimiteReportesService.java`, para sumar `reporte_comunidad` a la cuenta compartida.
- Pruebas: `controller/ComunidadReportesIntegrationTest.java` (H2) y casos en `LimiteReportesServiceTest` si existe.

**Interfaces que produce:**
- `POST /api/comunidad/publicaciones/{id}/reportes` y `POST /api/comunidad/respuestas/{id}/reportes`, con cuerpo `{ motivo, descripcion? }`.
  - **Respuesta `201`:** `{ idReporte, estado }`.
  - **Errores:**
    - `400` motivo inválido u `otro` sin descripción;
    - `401`;
    - `403` contenido propio, cuenta suspendida o bloqueo;
    - `404` contenido no visible o eliminado;
    - `409` reporte abierto duplicado;
    - `429` décimo primer reporte en la hora, contando reseñas y ofertas.

- [ ] **Paso 1: pruebas que fallan.**
  - `reportarPublicacion201` y `reportarRespuesta201`.
  - `reportarLoPropio403`, `duplicadoAbierto409` y `trasRechazadoPuedeVolverAReportar201`.
  - `otroSinDescripcion400`.
  - `cuentaSuspendida403` y `bloqueoReincidencia403`.
  - `contenidoNoVisible404`.
  - `elReporteOnceEnUnaHora429`, que mezcla reportes de reseñas y de comunidad.
  - `sinSesion401`.
- [ ] **Paso 2: ejecutar** `./mvnw test -Dtest='ComunidadReportes*'`. Resultado esperado: falla.
- [ ] **Paso 3: implementar.** El límite se verifica dentro de la transacción que guarda el reporte.
- [ ] **Paso 4: ejecutar el paso 2** y `ReporteResena*`, `ReporteOferta*` y `LimiteReportes*`, para comprobar que el límite compartido sigue igual. Resultado esperado: todo pasa.
- [ ] **Paso 5: commit** `feat(comunidad): reportes de publicaciones y respuestas`.

### Tarea 3: Moderación del foro (CA-12, CA-13)

**Archivos:**
- Crear:
  - `entity/ModeracionComunidadAuditoria.java` y `entity/AccionModeracionComunidad.java`;
  - el repositorio;
  - `service/ModeracionComunidadService.java`;
  - `controller/ModeracionComunidadController.java`;
  - los DTO.
- Modificar: `ModeracionResumenService`, para sumar `comunidadRevision` y `comunidadReportes` al contador.
- Pruebas:
  - `controller/ModeracionComunidadIntegrationTest.java` (H2);
  - `controller/ModeracionComunidadPostgresTest.java` (`@Tag("postgres-real")`): ocultamiento por 3 reportes, auditoría obligatoria y conflicto de interés en los triggers reales.

**Interfaces que produce** (todo bajo `/api/moderacion/comunidad`, solo Moderador o Administrador; un usuario sin rol recibe `403`):
- **`GET /en-revision`:** el contenido PENDIENTE, ALTO primero.
  - Cada elemento lleva `tipo` (PUBLICACION o RESPUESTA), `id`, `idPublicacion`, `titulo` (o el de su publicación) y `contenido`.
  - También `autor`, `fechaCreacion`, `riesgo` y `motivos`.
- **`PUT /{publicaciones|respuestas}/{id}/{aprobar|rechazar|ocultar|restaurar|eliminar}`**, con cuerpo `{ motivo }`.
  - **Errores:** `400` sin motivo; `403` contenido propio; `404`; `409` acción incoherente con el estado (lo mismo que comprueba el trigger).
- **`GET /{publicaciones|respuestas}/{id}/historial`:** decisiones de moderación, con el texto revisado.
- **`GET /reportes?estado=`:** reportes con el contenido reportado, el número de reportes activos y si está oculto.
- **`PUT /reportes/{id}/en-revision`** con `{ justificacion }`, y **`PUT /reportes/{id}/rechazar`** con `{ justificacion }`.
- **`PUT /reportes/{id}/aceptar`** con `{ justificacion, accion: NINGUNA | OCULTAR | ELIMINAR, motivo? }`.
- **Contador:** `GET /api/moderacion/resumen` suma `comunidadRevision` y `comunidadReportes`.

- [ ] **Paso 1: pruebas que fallan** (H2).
  - Revisión:
    - `aprobarPendientePublica`;
    - `rechazarPendienteLoDejaVisibleSoloAlAutor`;
    - `aprobarPublicada409`.
  - Ocultar, restaurar y eliminar:
    - `ocultarYRestaurarConMotivo`;
    - `ocultarSinMotivo400`;
    - `moderarLoPropio403`;
    - `usuarioSinRol403`;
    - `eliminarComoModeradorQuedaAuditadoYNoSePuedeEditar`.
  - Auditoría y cola:
    - `cadaDecisionGuardaElTextoRevisado`;
    - `colaEnRevisionOrdenaAltoPrimero`.
  - Reportes:
    - `aceptarReporteConOcultarAuditaAmbos`;
    - `rechazarReporteRegistraHistorial`;
    - `transicionDeReporteInvalida409`.
  - `resumenCuentaLaComunidad`.
- [ ] **Paso 2: pruebas con triggers reales** (`postgres-real`):
  - `tercerReporteOcultaYRechazarRestaura`;
  - `moderadorQueOcultaSinAuditoriaFalla`, que actualiza directamente por repositorio;
  - `historialObligatorioEnCadaTransicion`.
- [ ] **Paso 3: ejecutar los pasos 1 y 2.** Resultado esperado: fallan.
- [ ] **Paso 4: implementar.** Cada acción cambia el contenido y guarda la auditoría en la misma transacción. `contenido_revisado` es el texto en el momento de decidir: título y contenido en las publicaciones, contenido en las respuestas.
- [ ] **Paso 5: ejecutar** la suite H2 completa y las `postgres-real` contra el PostgreSQL local con la 030. Resultado esperado: todo pasa.
- [ ] **Paso 6: commit** `feat(comunidad): moderación del foro con auditoría`.

### Tarea 4: Pendientes de las fases 0 y 1

Son los menores que quedaron diferidos y que esta fase toca de todos modos.

- [ ] **Paso 1: pruebas que fallan, y luego los arreglos, uno por uno:**
  - **Producto desactivado (M-10):** `detalleInformaProductoActivo` en el backend (campo `productoActivo` en el detalle) y, en el frontend, `productoDesactivadoNoOfreceResponder`.
  - **Respuesta propia rechazada (M-11):** `respuestaPropiaRechazadaMuestraAviso`. Además, el aviso de publicación rechazada dice «solo tú y los moderadores».
  - **Eliminación simultánea (M-3):** si el trigger rechaza la respuesta porque la publicación se cerró o eliminó mientras tanto, la API responde 409 y no 500. Prueba `postgres-real`: `respuestaEnPublicacionEliminadaMientrasTanto409`.
  - **Lecturas públicas con token (M-4):** con un token caducado o de un correo sin verificar se tratan como anónimas; un GET no aprovisiona usuarios. Prueba: `lecturaPublicaConTokenDeUsuarioInexistenteNoLoCrea`.
  - **`AnalizadorContenidoTest`:** se reemplaza la comparación tautológica por valores fijos del corpus (riesgo y motivos esperados) y por una prueba de contexto que confirma que `ResenaModerationService` recibe el bean `AnalizadorContenido`.
- [ ] **Paso 2: actualizar la skill `moderacion-inteligente`.** Las listas están en `AnalizadorContenido`, y la comunidad tiene su propio flujo de reportes y auditoría.
- [ ] **Paso 3: ejecutar** las suites del backend y del frontend. Resultado esperado: todo pasa.
- [ ] **Paso 4: commit** `fix(comunidad): pendientes de las fases 0 y 1`.

### Tarea 5: Frontend

**Archivos:**
- Crear:
  - `src/components/comunidad/ReportarContenidoModal.tsx`: motivo, descripción obligatoria con «Otro», foco atrapado y cierre con Escape, como `ReportarOfertaModal`;
  - `src/components/moderacion/ColaComunidad.tsx`, con dos vistas: «En revisión» y «Reportes».
- Modificar:
  - `RespuestaItem.tsx` y `DetallePublicacionCliente.tsx`: botón «Reportar» para quien tiene sesión y no es el autor;
  - `PanelModeracionModal.tsx`: pestaña «Comunidad» con su contador;
  - `services/api.ts` y `types/comunidad.ts`.
- Pruebas: `*.test.tsx` de cada componente.

- [ ] **Paso 1: pruebas que fallan.**
  - **Modal de reporte:**
    - `otroExigeDescripcion`;
    - un `409` muestra «Ya reportaste este contenido»;
    - el `429` muestra el mensaje del servidor;
    - Escape cierra el modal y el foco vuelve al botón.
  - **Cola de moderación:**
    - aprobar o rechazar exige motivo;
    - la cola muestra el riesgo y los motivos;
    - aceptar un reporte permite elegir «Ocultar» o «Eliminar»;
    - un `409` recarga la cola.
  - **Botón «Reportar»:** no aparece en el contenido propio ni sin sesión; sin sesión abre el inicio de sesión.
- [ ] **Paso 2: implementar.**
- [ ] **Paso 3: ejecutar** `npx tsc --noEmit`, `npm run lint`, `npm test` y `npm run build`. Resultado esperado: todo pasa.
- [ ] **Paso 4: commit** `feat(comunidad): reportar contenido y cola de moderación`.

### Tarea 6: Pruebas E2E (skill `pruebas-e2e-tecreview`)

- [ ] **Paso 1: capa A** en `e2e/simulada/`:
  - `comunidad-reportar.spec.ts`: reportar una respuesta, el duplicado (409) y el límite (429);
  - `moderacion-comunidad.spec.ts`: un moderador abre la pestaña Comunidad, rechaza un contenido con motivo y acepta un reporte con «Ocultar».
- [ ] **Paso 2: capa B,** la primera vez:
  - `playwright.config.ts` con la variable `E2E_PILA`;
  - `e2e/pila-completa/preparar.ts`: servidor JWKS y tokens;
  - script `test:e2e:pila`.

  El recorrido es `moderacion-reportes.spec.ts`:
  1. Ana publica un texto ofensivo, que queda pendiente, y Bea no lo ve.
  2. Un moderador lo aprueba.
  3. Tres usuarios lo reportan y queda oculto para Bea.
  4. El moderador rechaza un reporte y vuelve a verse.

  Es la evidencia de punta a punta de CA-12, con triggers reales.
- [ ] **Paso 3: ejecutar** `npm run test:e2e` y `npm run test:e2e:pila`, con la salida real. Resultado esperado: todo pasa.
- [ ] **Paso 4: commit** `test(comunidad): E2E de reportes y moderación`.

### Tarea 7: Documentación, revisión y PR

- [ ] **Paso 1: documentar.**
  - `docs/api.md`: §34.4 Reportes y §34.5 Moderación.
  - `docs/modelo-datos.md`: la 030.
  - `frontend/docs/comunidad.md`: reportar y la pestaña de moderación.
  - Skill `pruebas-e2e-tecreview`: la capa B ya implementada.
- [ ] **Paso 2: ejecutar los comandos de CA-18,** las pruebas `postgres-real` y las E2E de las dos capas. Resultado esperado: todo pasa.
- [ ] **Paso 3: punto de control 2.** Revisión independiente de la rama. Los hallazgos críticos o importantes se corrigen con una prueba que primero falla.
- [ ] **Paso 4: push y PR** con la evidencia y el aviso de la 030. No se fusiona.

## Puntos de atención en la revisión

1. **Carrera de reportes.** Tres usuarios reportan a la vez el mismo contenido: queda oculto exactamente una vez y sin interbloqueo. Prueba `postgres-real` de concurrencia en la Tarea 3.
2. **Un moderador que es autor.** No puede aprobar, ocultar, eliminar ni resolver reportes de su propio contenido, ni siquiera siendo administrador. Pruebas `moderarLoPropio403` y el script SQL.
3. **El autor edita un contenido oculto por reportes.** Sigue oculto y la edición vuelve a pasar por el filtro; los reportes abiertos siguen contando. Tarea 3: añadir `editarOcultoPorReportesSigueOculto`.
4. **Visibilidad tras moderar.** Lo rechazado u oculto aparece como «no disponible» en el árbol para terceros, y el autor ve el aviso. Tareas 4 y 5.
5. **Límite compartido.** Un usuario con 10 reportes de reseñas en la hora recibe 429 al reportar en la comunidad. Prueba `elReporteOnceEnUnaHora429`.
