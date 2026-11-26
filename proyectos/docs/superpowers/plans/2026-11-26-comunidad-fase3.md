# Comunidad, fase 3: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:**
- **Apelaciones del foro:** el autor apela una decisión de moderación sobre su contenido; si se acepta, la decisión se revierte y la falta deja de contar.
- **Reincidencia unificada (P2):** las faltas de reseñas y del foro suman en un solo historial, y el bloqueo aplica en los dos espacios.

**Arquitectura:**
- **Migración 031:** tabla `apelacion_comunidad`, con el mismo diseño que la 026. Además, se ajustan dos funciones de la 030 para que una apelación aceptada pueda volver a publicar un contenido rechazado.
- **Reincidencia:** `ReincidenciaService` suma las faltas de las dos auditorías. Como todos los flujos (reseñas, foro y lista de administración) ya la usan, el bloqueo queda unificado sin tocarlos.
- **Backend:** `ApelacionComunidadService` y sus endpoints.
- **Frontend:** «Mis decisiones del foro» en el perfil y una vista «Apelaciones» en la pestaña «Comunidad» del panel.

**Tecnologías:** Spring Boot 4, JPA (`ddl-auto=validate`), PostgreSQL 17, Next.js 16, Vitest y Playwright.

**Especificación:** `proyectos/docs/superpowers/specs/2026-11-24-comunidad-design.md` (fase 3: CA-14, CA-15, CA-17, CA-18; P2).

## Restricciones globales

- **Reglas de la 026, sin cambios:**
  - plazo de 15 días desde la decisión;
  - una apelación por decisión;
  - solo el autor del contenido;
  - motivo de 1 a 1000 caracteres;
  - la resuelve otra persona con rol activo, que no sea ni el autor ni el moderador de la decisión;
  - rechazar exige una respuesta.
- **Escalones de reincidencia, sin cambios:**
  - ventana de 90 días;
  - 2 faltas, revisión previa;
  - 3 faltas, bloqueo de 7 días;
  - 4 faltas, aparece en la lista del administrador.

  Solo cambia de dónde salen las faltas.
- **Bloqueo:** sigue sin impedir dar o retirar «Me gusta» (RN-15).
- **Migración:** Claude no aplica la 031 ni fusiona. Las entidades no se fusionan antes de que la 031 esté aplicada.

## Decisiones de diseño que se aprueban con este plan

1. **Qué cuenta como falta en el foro:**
   - `RECHAZAR`;
   - `OCULTAR` sin un `RESTAURAR` posterior sobre el mismo contenido;
   - `ELIMINAR_MODERADOR`.

   En ningún caso cuenta si tiene una apelación ACEPTADA. Es el mismo criterio que las reseñas, más la eliminación por moderador, que es más grave que ocultar.
2. **Se pueden apelar `RECHAZAR`, `OCULTAR` y `ELIMINAR_MODERADOR`.**
   - Aceptar un `RECHAZAR` publica el contenido.
   - Aceptar un `OCULTAR` lo restaura.
   - Aceptar un `ELIMINAR_MODERADOR` anula la falta, pero el contenido sigue eliminado: la eliminación no se puede deshacer (030). La respuesta lo indica.

   No se puede apelar si el autor ya eliminó el contenido por su cuenta, ni si la decisión ya no está vigente (por ejemplo, un `OCULTAR` que otro moderador restauró) o no es la más reciente sobre ese contenido. Igual que en las reseñas.
3. **Una apelación aceptada publica un rechazo en un solo paso.**
   - La 030 solo permite volver a PENDIENTE al editar, para que no se pueda ocultar sin rastro.
   - La 031 permite `APROBAR` sobre un contenido RECHAZADA solo si en la misma transacción se aceptó una apelación de la última decisión `RECHAZAR` de ese contenido. Para saberlo, la apelación guarda `id_transaccion_resolucion`.
   - Así se evita abrir otra vez el paso a PENDIENTE sin edición (hallazgo M-8 de la revisión de la 030).
4. **Las apelaciones del foro van en la pestaña «Comunidad» del panel,** como tercera vista, y el contador las suma. La pestaña «Apelaciones» existente sigue siendo de las reseñas.
5. **«Mis decisiones del foro»** es una sección nueva del perfil, junto a la de reseñas, con el mismo formato: decisión, texto revisado, plazo y estado de la apelación. El estado de reincidencia del perfil ya muestra las faltas unificadas.

---

### Tarea 1: Migración 031 y su verificación (CA-15, CA-17)

**Archivos:**
- Crear: `backend/src/main/resources/db/migration/031_apelaciones_comunidad.sql` y una copia idéntica en `docs/sql/`.
- Crear: `docs/sql/tests/031_verificacion_apelaciones_comunidad.sql`.

**Interfaces que produce:**
- **`apelacion_comunidad`:**
  - `id_apelacion` BIGSERIAL;
  - `id_auditoria`: FK a `moderacion_comunidad_auditoria`, **UNIQUE**;
  - `id_autor` y `motivo` (1 a 1000 caracteres, no vacío);
  - `estado` (PENDIENTE, ACEPTADA o RECHAZADA) y `fecha_solicitud`;
  - `id_moderador`, `respuesta`, `fecha_resolucion` e `id_transaccion_resolucion`;
  - un CHECK de resolución completa, como el de la 026.
- **Trigger `BEFORE INSERT`:**
  - la decisión es `RECHAZAR`, `OCULTAR` o `ELIMINAR_MODERADOR`;
  - el autor de la apelación es el autor del contenido;
  - el contenido no lo eliminó su autor;
  - no han pasado más de 15 días;
  - el estado inicial es PENDIENTE.
- **Trigger `BEFORE UPDATE`:**
  - solo se resuelve desde PENDIENTE, una vez;
  - los datos de la solicitud no cambian;
  - quien resuelve tiene rol activo y no es ni el autor ni el moderador de la decisión;
  - fija `id_transaccion_resolucion = txid_current()`.
- **Protección:** DELETE y TRUNCATE prohibidos.
- **Cambios en funciones de la 030:**
  - `fn_validar_insert_moderacion_comunidad`: `APROBAR` también vale sobre RECHAZADA si existe una apelación ACEPTADA de la última `RECHAZAR` del contenido con `id_transaccion_resolucion = txid_current()`.
  - `fn_exigir_auditoria_contenido_comunidad`: con esa misma condición, admite RECHAZADA → PUBLICADA con su `APROBAR`.
- **Seguridad, registro y preflight:** RLS sin políticas, REVOKE, `search_path`, `lock_timeout`, preflight de la 030 y fila `031_apelaciones_comunidad`.

- [ ] **Paso 1: escribir el script de verificación,** con `debe_fallar` y `SET CONSTRAINTS ALL IMMEDIATE`, dentro de ROLLBACK. Casos:
  - **Apelar:**
    - una decisión `APROBAR` falla;
    - la decisión de otro autor falla;
    - fuera de plazo falla;
    - contenido eliminado por su autor falla;
    - una segunda apelación de la misma decisión falla;
    - un estado inicial distinto de PENDIENTE falla.
  - **Resolver:**
    - el autor falla;
    - el moderador de la decisión falla;
    - alguien sin rol falla;
    - resolver dos veces falla;
    - cambiar el motivo falla;
    - rechazar sin respuesta falla.
  - **Revertir:**
    - aceptar un `RECHAZAR` y, en la misma transacción, `APROBAR` → PUBLICADA se permite;
    - `APROBAR` sobre RECHAZADA sin apelación aceptada falla;
    - con una apelación aceptada en **otra** transacción, falla;
    - con una apelación de una `RECHAZAR` antigua (no la última), falla.
  - **Solo inserción:** DELETE y TRUNCATE fallan.
  - **CA-17:** RLS, políticas y privilegios.
  - **Regresión:** la 030 sigue rechazando volver a PENDIENTE sin edición y RECHAZADA → PUBLICADA sin apelación.
- [ ] **Paso 2: ejecutarlo** en PostgreSQL local con la 030. Resultado esperado: falla.
- [ ] **Paso 3: escribir la migración.**
- [ ] **Paso 4: aplicarla dos veces** y ejecutar los scripts 031, 030, 029 y 028. Comprobar las copias con `cmp`. Resultado esperado: «OK» en todos.
- [ ] **Paso 5: punto de control 1.** Revisión independiente de la migración.
- [ ] **Paso 6: commit** `feat(db): apelaciones de la comunidad (031)`. Pedir que se apruebe y se aplique.

### Tarea 2: Reincidencia unificada (CA-14)

**Archivos:**
- Modificar:
  - `repository/ModeracionComunidadAuditoriaRepository.java`: consulta de fechas de faltas del autor y conteo por usuario;
  - `service/ReincidenciaService.java`: suma las dos fuentes;
  - `service/AdministracionCuentasService.java`: la lista de reincidentes suma las dos fuentes.
- Pruebas: `controller/ReincidenciaUnificadaIntegrationTest.java` (H2) y casos en `ReincidenciaServiceTest`, si existe.

**Interfaces que produce:**
- `ModeracionComunidadAuditoriaRepository.findFechasFaltasDelAutorDesde(Long idUsuario, LocalDateTime desde)` devuelve `List<LocalDateTime>`, con el criterio de la decisión 1.
- `ModeracionComunidadAuditoriaRepository.contarFaltasPorUsuarioDesde(LocalDateTime desde)` devuelve `List<Object[]>` con id de usuario, conteo y última fecha.
- `ReincidenciaService.evaluar` y `contarFaltas` usan la unión de las dos fuentes. La firma no cambia.

- [ ] **Paso 1: pruebas que fallan.**
  - **Faltas del foro:**
    - `tresFaltasDelForoBloqueanPublicarUnaResena`: `POST /api/resenas` da 403 «por reincidencia»;
    - `tresFaltasDelForoBloqueanPublicarEnElForo`;
    - `dosDeResenasYUnaDelForoBloquean`.
  - **Revisión previa:** `dosFaltasDelForoDanRevisionPrevia`; la reseña nueva queda PENDIENTE.
  - **Lo que no cuenta:**
    - `ocultarYRestaurarNoCuenta`;
    - `faltaConApelacionAceptadaNoCuenta`;
    - `faltasDeHaceMasDe90DiasNoCuentan`.
  - **«Me gusta»:** `bloqueoNoImpideMeGusta` sigue en verde.
  - **Lista del administrador:** `listaDeReincidentesSumaAmbosEspacios`, con 2 faltas de reseñas y 2 del foro.
- [ ] **Paso 2: ejecutar.** Resultado esperado: falla.
- [ ] **Paso 3: implementar.**
- [ ] **Paso 4: ejecutar** `./mvnw clean test` (que incluye `Reincidencia*` y `ReincidenciaIntegrationTest`). Resultado esperado: todo pasa.
- [ ] **Paso 5: commit** `feat(moderacion): reincidencia única para reseñas y foro`.

### Tarea 3: Apelaciones del foro (CA-15)

**Archivos:**
- Crear:
  - `entity/ApelacionComunidad.java`;
  - `repository/ApelacionComunidadRepository.java`;
  - `service/ApelacionComunidadService.java`;
  - `controller/ComunidadApelacionesController.java` y `controller/ModeracionComunidadApelacionesController.java`;
  - los DTO en `dto/comunidad/`.
- Modificar: `ModeracionComunidadService.contar…` y el resumen del panel (`comunidadApelaciones`).
- Pruebas: `controller/ApelacionesComunidadIntegrationTest.java` (H2) y `controller/ApelacionesComunidadPostgresTest.java` (`postgres-real`).

**Interfaces que produce:**
- **Autor:**
  - `POST /api/comunidad/apelaciones`, con `{ idAuditoria, motivo }`: `201`.
    - **Errores:** `400` motivo inválido; `403` no es el autor; `404` decisión inexistente; `409` ya apelada, fuera de plazo, no vigente o no la más reciente.
  - `GET /api/comunidad/apelaciones/mias`: decisiones del foro sobre su contenido en los últimos 90 días. Cada una lleva `idAuditoria`, `tipo`, `idPublicacion`, `titulo`, `contenidoRevisado`, `accion`, `motivoDecision`, `fechaDecision`, `plazoHasta`, `apelable` y la `apelacion`, si existe.
- **Moderación:**
  - `GET /api/moderacion/comunidad/apelaciones?estado=`, por defecto las PENDIENTE;
  - `PUT …/{id}/aceptar`, con `{ respuesta? }`;
  - `PUT …/{id}/rechazar`, con `{ respuesta }`, obligatoria.

  Al aceptar, si la decisión sigue vigente se revierte en la misma transacción: `APROBAR` para un `RECHAZAR` y `RESTAURAR` para un `OCULTAR`. La respuesta incluye `contenidoRevertido` (`true`, o `false` para una eliminación).
- **Contador:** `comunidadApelaciones` en `GET /api/moderacion/pendientes/resumen`.

- [ ] **Paso 1: pruebas que fallan** (H2):
  - **Apelar:**
    - `apelarUnRechazo201`;
    - `apelarDecisionAjena403`;
    - `apelarDosVeces409`;
    - `apelarFueraDePlazo409`;
    - `apelarOcultamientoYaRestaurado409`;
    - `misDecisionesMuestraPlazoYEstado`.
  - **Resolver:**
    - `aceptarRechazoPublicaYAnulaLaFalta`: CA-15, comprobando también la reincidencia;
    - `aceptarOcultamientoRestaura`;
    - `aceptarEliminacionAnulaLaFaltaPeroSigueEliminada`;
    - `rechazarSinRespuesta400`;
    - `resolverElAutorOElModeradorDeLaDecision403`;
    - `resumenCuentaApelacionesDelForo`.
- [ ] **Paso 2: pruebas `postgres-real`:**
  - `aceptarRechazoPasaLosTriggers`: con `SET CONSTRAINTS ALL IMMEDIATE`;
  - `aprobarRechazadaSinApelacionFalla`;
  - `dosModeradorasResuelvenLaMismaApelacion`: una gana y la otra recibe 409, sin `@Transactional`, como la prueba de concurrencia de la fase 2.
- [ ] **Paso 3: implementar.**
  - Releer con bloqueo la apelación y el contenido antes de validar.
  - Solo los rechazos de los triggers (P0001) se traducen a 409.
- [ ] **Paso 4: ejecutar** la suite H2 completa y las `postgres-real` contra el PostgreSQL local con la 031. Resultado esperado: todo pasa.
- [ ] **Paso 5: commit** `feat(comunidad): apelaciones de decisiones del foro`.

### Tarea 4: Frontend

**Archivos:**
- Crear:
  - `src/components/perfil/DecisionesComunidad.tsx`: lista de decisiones del foro y formulario «Apelar», con motivo, contador y plazo;
  - en `ColaComunidad.tsx`, la vista «Apelaciones»: motivo del autor, decisión original y texto revisado; aceptar (respuesta opcional) o rechazar (respuesta obligatoria).
- Modificar: `app/perfil/PerfilCliente.tsx` (la sección nueva), `PanelModeracionModal.tsx` (el contador de la pestaña suma las apelaciones), `services/api.ts` y `types/comunidad.ts`.
- Pruebas: los `*.test.tsx` correspondientes.

- [ ] **Paso 1: pruebas que fallan.**
  - **Perfil:**
    - `decisionApelableMuestraElFormulario`;
    - `fueraDePlazoNoSePuedeApelar`;
    - `apelacionPendienteMuestraSuEstado`;
    - un `409` muestra el mensaje del servidor.
  - **Cola:**
    - `rechazarApelacionExigeRespuesta`;
    - `aceptarEliminacionAvisaQueSigueEliminada`;
    - un `409` recarga y explica.
- [ ] **Paso 2: implementar.**
- [ ] **Paso 3: ejecutar** `npx tsc --noEmit`, `npm run lint`, `npm test` y `npm run build`. Resultado esperado: todo pasa.
- [ ] **Paso 4: commit** `feat(comunidad): apelar decisiones del foro y su cola de moderación`.

### Tarea 5: Pruebas E2E

- [ ] **Paso 1: capa simulada** (`e2e/simulada/apelaciones-comunidad.spec.ts`):
  1. Ana ve en su perfil una respuesta ocultada y la apela.
  2. La moderadora la acepta desde la pestaña «Comunidad», en la vista «Apelaciones».
- [ ] **Paso 2: pila completa** (`e2e/pila-completa/reincidencia-unificada.spec.ts`), que es la evidencia de CA-14 y CA-15 con triggers reales:
  1. La moderadora rechaza tres publicaciones de Ana.
  2. Ana no puede publicar en el foro ni crear una reseña (`POST /api/resenas` da 403).
  3. Ana apela un rechazo y otra moderadora lo acepta.
  4. La publicación queda visible y Ana puede volver a publicar en los dos espacios.
- [ ] **Paso 3: ejecutar** `npm run test:e2e` y `npm run test:e2e:pila`. Resultado esperado: todo pasa.
- [ ] **Paso 4: commit** `test(comunidad): E2E de apelaciones y reincidencia unificada`.

### Tarea 6: Documentación, revisión y PR

- [ ] **Paso 1: documentar.**
  - `docs/api.md`: §34.6 Apelaciones del foro y §33.5, la reincidencia unificada.
  - `docs/modelo-datos.md`: la 031.
  - `frontend/docs/comunidad.md`.
  - Skill `moderacion-inteligente`: apelaciones del foro y faltas unificadas.
- [ ] **Paso 2: ejecutar los comandos de CA-18,** las pruebas `postgres-real` y las E2E de las dos capas. Resultado esperado: todo pasa.
- [ ] **Paso 3: punto de control 2.** Revisión independiente de la rama. Los hallazgos críticos o importantes se corrigen con una prueba que primero falla.
- [ ] **Paso 4: push y PR** con la evidencia y el aviso de la 031. No se fusiona.

## Puntos de atención en la revisión

1. **Apelación de una decisión que ya no es la más reciente.** El contenido se ocultó, se restauró y se volvió a ocultar: solo se apela el último `OCULTAR`. Prueba en la Tarea 3: `apelarOcultamientoAnterior409`.
2. **El autor edita el contenido rechazado mientras su apelación está PENDIENTE.** Vuelve a PENDIENTE por la edición. Al aceptar la apelación, el contenido ya no está RECHAZADA, así que no se revierte, pero la falta se anula. Tarea 3: añadir `editarDuranteLaApelacionYAceptar`.
3. **Bloqueo y desbloqueo inmediatos.** Al aceptar la apelación que dejaba a Ana con 3 faltas, Ana deja de estar bloqueada en la misma respuesta, sin caché. Tarea 2: `aceptarApelacionLevantaElBloqueo`.
4. **Faltas con la misma fecha en los dos espacios.** No se pierden ni se duplican al unir las fuentes. Tarea 2: `faltasSimultaneasEnAmbosEspaciosSuman`.
5. **Decisión eliminada apelada.** La UI no ofrece «Ver publicación» de un contenido eliminado y lo dice claramente. Tarea 4.
