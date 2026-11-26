# Comunidad, fase 1: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** foro básico. Publicaciones generales y por producto, respuestas en 3 niveles y «Me gusta», con las tres páginas del frontend. La moderación del foro (reportes, decisiones, cola) es de la fase 2.

**Arquitectura:**
- **Migración 029:** tres tablas nuevas, separadas de reseñas y valoraciones. Las integridades estructurales se hacen cumplir en la base de datos: tipo y producto, la madre en la misma publicación, la profundidad y los campos que no cambian.
- **Backend:** paquete propio de servicios y controladores `Comunidad*`. El filtro es el mismo `AnalizadorContenido` de las reseñas.
- **Frontend:** tres rutas del App Router y componentes en `src/components/comunidad/`.

**Tecnologías:** Spring Boot 4, JPA (`ddl-auto=validate`), PostgreSQL 17 (Testcontainers para triggers), Next.js 16, React 19, Vitest.

**Especificación:** `proyectos/docs/superpowers/specs/2026-11-24-comunidad-design.md` (fase 1: CA-02 a CA-11, CA-17, CA-18). Las columnas base están en la sección E2 de la auditoría; aquí se copian con las correcciones de la especificación.

## Restricciones globales

- **Profundidad de 0 a 2** (P1), no de 0 a 3 como en la auditoría.
- **Cuotas** (P3): 5 publicaciones y 20 respuestas en 60 minutos, contando las eliminadas, con bloqueo de la fila del usuario (`UsuarioRepository.findByIdForUpdate`). La siguiente devuelve 429.
- **Textos:**
  - título de 5 a 150 caracteres;
  - publicación de 1 a 5000;
  - respuesta de 1 a 3000;
  - solo texto plano (RN-03). El frontend no convierte enlaces en clicables.
- **Visibilidad** (RN-12):
  - riesgo MEDIO o ALTO, o autor en revisión previa por reincidencia, queda PENDIENTE;
  - el contenido PENDIENTE solo lo ven su autor y los moderadores.
- **Permisos de escritura:**
  - **Suspensión:** una cuenta suspendida no escribe ni reacciona (403).
  - **Bloqueo por reincidencia:** impide publicar, responder y editar, pero no los «Me gusta» (`ReincidenciaService.verificarPuedePublicar`). En la fase 1 la reincidencia solo cuenta las faltas de reseñas; la unificación es de la fase 3.
- **Foro y reseñas separados:** el foro no escribe en `resena`, `valoracion`, calificaciones ni ranking (RN-17).
- **Cambios en la base de datos:**
  - las tablas nuevas llevan RLS sin políticas y `REVOKE ALL` a `anon`, `authenticated` y `PUBLIC`;
  - las funciones llevan `SET search_path = pg_catalog`;
  - la migración tiene dos copias idénticas.
- **Claude no aplica la 029 ni fusiona el PR.** Las entidades no se fusionan antes de que la 029 esté aplicada, porque con `ddl-auto=validate` el backend no arrancaría.
- **Frontend:** leer la guía relevante de `frontend/node_modules/next/dist/docs/` antes de crear rutas (Next.js 16 tiene cambios incompatibles).

## Decisiones de diseño que se aprueban con este plan

1. **Columna `id_respuesta_citada`.** Es una columna nueva en `respuesta_comunidad` (BIGINT nulo, FK a la misma tabla); la auditoría no la tenía. Responder a una respuesta de nivel 2 crea una hermana en el nivel 2: su madre es la madre de la citada y `id_respuesta_citada` apunta a la citada. El frontend muestra «En respuesta a @nombre». Así se guarda a quién se responde sin romper el árbol.
2. **Conteos sin columnas acumuladas.** Las respuestas visibles y los «Me gusta» se cuentan con consultas agrupadas para los ids de la página, no con contadores. Así no hay triggers de conteo ni contadores desfasados.
3. **Paginación por cursor.** El cursor es opaco: Base64 URL de `<orden>|<instante ISO>|<id>`; un cursor de otro orden da 400, ordenado de forma descendente.
   - `orden=actividad` usa `fecha_ultima_actividad`; `orden=recientes`, `fecha_creacion`.
   - Las respuestas se paginan por `fecha_creacion` ascendente.
   - `limite` va de 1 a 50, con 20 por defecto.
   - Limitación aceptada: en `orden=actividad`, una publicación de una página posterior que recibe una respuesta mientras se pagina sube al principio y no se ve en esa pasada. CA-09 se prueba con publicaciones nuevas, que no cambian el orden de las anteriores.
4. **Contenido no visible dentro del árbol.**
   - **Respuesta eliminada, oculta o PENDIENTE ajena:** conserva su lugar y sus hijas. Se devuelve sin texto ni autor y con un `estadoVisible` (`ELIMINADA`, `OCULTA`, `EN_REVISION`).
   - **Publicación no visible:** no aparece en las listas, y su detalle responde 404 a quien no puede verla.

---

### Tarea 1: Migración 029 y su verificación (CA-02, CA-03, CA-17)

**Archivos:**
- Crear: `backend/src/main/resources/db/migration/029_comunidad.sql` y una copia idéntica en `docs/sql/`.
- Crear: `docs/sql/tests/029_verificacion_comunidad.sql`.

**Interfaces que produce (tablas):**

- **`publicacion_comunidad`:**
  - `id_publicacion` BIGSERIAL, PK (como la 026 y la 027).
  - `tipo` VARCHAR(10), `CHECK IN ('GENERAL','PRODUCTO')`.
  - `id_producto`, FK a `producto`.
  - `id_autor`, FK a `usuario`, NOT NULL.
  - `titulo` VARCHAR(150), `CHECK char_length(btrim(titulo)) BETWEEN 5 AND 150`.
  - `contenido` TEXT, `CHECK char_length BETWEEN 1 AND 5000`.
  - `estado_moderacion` VARCHAR(20), `CHECK IN ('PUBLICADA','PENDIENTE','RECHAZADA')`, por defecto PUBLICADA.
  - `oculta_por_moderacion` y `oculta_por_reportes` BOOLEAN NOT NULL, por defecto false.
  - `eliminada` BOOLEAN NOT NULL, por defecto false; `fecha_eliminacion` TIMESTAMP; `eliminada_por`, FK a `usuario`.
  - `cerrada` BOOLEAN NOT NULL, por defecto false.
  - `fecha_creacion` y `fecha_ultima_actividad` TIMESTAMP NOT NULL, por defecto `now()`; `fecha_edicion` TIMESTAMP.
  - `CHECK ((tipo='GENERAL' AND id_producto IS NULL) OR (tipo='PRODUCTO' AND id_producto IS NOT NULL))`.
  - Índices parciales sobre las visibles (`NOT eliminada AND estado_moderacion='PUBLICADA' AND NOT oculta_por_moderacion AND NOT oculta_por_reportes`):
    - `(tipo, fecha_ultima_actividad DESC, id_publicacion DESC)`;
    - `(id_producto, fecha_ultima_actividad DESC, id_publicacion DESC)`.
  - Índice `(id_autor, fecha_creacion)`.
- **`respuesta_comunidad`:**
  - `id_respuesta` BIGSERIAL, PK.
  - `id_publicacion` NOT NULL, FK.
  - `id_respuesta_padre`.
  - `id_respuesta_citada`, FK a `respuesta_comunidad`.
  - `id_autor` NOT NULL.
  - `contenido` de 1 a 3000.
  - `profundidad` SMALLINT, `CHECK BETWEEN 0 AND 2`.
  - Columnas de visibilidad, eliminación y fechas iguales a las de la publicación, sin `titulo`, `tipo` ni `cerrada`.
  - `UNIQUE (id_respuesta, id_publicacion)` y `FOREIGN KEY (id_respuesta_padre, id_publicacion) REFERENCES respuesta_comunidad (id_respuesta, id_publicacion)`.
  - Índices `(id_publicacion, id_respuesta_padre, fecha_creacion, id_respuesta)` y `(id_autor, fecha_creacion)`.
- **Trigger `BEFORE INSERT`** en `respuesta_comunidad`:
  - calcula `profundidad` (0 sin madre; madre + 1);
  - rechaza si queda en más de 2;
  - rechaza si la publicación está cerrada o eliminada;
  - rechaza si la citada no es de la misma publicación.
- **Trigger `BEFORE UPDATE`** en `respuesta_comunidad`: rechaza cambios en `id_publicacion`, `id_respuesta_padre`, `id_respuesta_citada`, `id_autor` y `profundidad`. En `publicacion_comunidad` rechaza cambios en `id_autor`, `tipo` e `id_producto`.
- **`reaccion_publicacion` y `reaccion_respuesta`:**
  - PK `(id_publicacion | id_respuesta, id_usuario)`;
  - `tipo` VARCHAR(20) `CHECK IN ('ME_GUSTA')`, por defecto ME_GUSTA;
  - `fecha_creacion`;
  - `ON DELETE CASCADE` desde el contenido.
- **Seguridad:** RLS sin políticas y `REVOKE ALL` en las 4 tablas y sus secuencias; funciones con `SET search_path = pg_catalog` y `REVOKE EXECUTE` a `PUBLIC`.
- **Registro y preflight:** fila `029_comunidad` en `schema_version`; preflight de la 028.

- [ ] **Paso 1: escribir el script de verificación.** Usa el patrón `pg_temp.debe_fallar` dentro de una transacción con `ROLLBACK`. Comprueba:
  - **CA-02:** GENERAL con producto y PRODUCTO sin producto fallan.
  - **CA-03:**
    - una madre de otra publicación falla;
    - responder a una respuesta de profundidad 2 directamente como madre falla;
    - cambiar madre, publicación, autor o citada falla;
    - responder en una publicación cerrada o eliminada falla.
  - **RN-08:** una segunda reacción igual viola la PK.
  - **CA-17:** RLS, cero políticas y ningún privilegio de `anon` ni `authenticated` en las 4 tablas.
- [ ] **Paso 2: ejecutarlo en PostgreSQL 17 local** restaurado desde `pg_dump --schema-only`, con la 028 registrada. Resultado esperado: falla porque las tablas no existen.
- [ ] **Paso 3: escribir la migración.**
- [ ] **Paso 4: aplicarla dos veces** (`CREATE … IF NOT EXISTS` y `DROP TRIGGER IF EXISTS`), ejecutar el script y comprobar las copias con `cmp`. Resultado esperado: «OK» y ningún error al reaplicar.
- [ ] **Paso 5: punto de control 1.** Revisión independiente de la migración. Se corrigen los hallazgos críticos o importantes.
- [ ] **Paso 6: commit** `feat(db): tablas de la comunidad (029)`. Pedir al equipo que la apruebe y la aplique. Las tareas 2 a 5 se pueden escribir mientras tanto, porque sus pruebas usan H2 y Testcontainers.

### Tarea 2: Publicaciones (CA-06, CA-07, CA-08, CA-09)

**Archivos:**
- Crear:
  - `entity/PublicacionComunidad.java` y `entity/TipoPublicacion.java`;
  - `repository/PublicacionComunidadRepository.java`;
  - `service/PublicacionComunidadService.java`, `service/LimiteContenidoComunidadService.java`, `service/CursorComunidad.java` y `service/PermisosComunidad.java`;
  - `controller/ComunidadPublicacionesController.java`;
  - los DTO en `dto/comunidad/`.
- Modificar: `config/SecurityConfig.java`, con `GET /api/comunidad/**` como `permitAll`.
- Pruebas:
  - `service/CursorComunidadTest.java`;
  - `controller/ComunidadPublicacionesIntegrationTest.java` (`@SpringBootTest`, H2);
  - `service/PublicacionComunidadPostgresIntegrationTest.java` (Testcontainers, con el patrón de `ReporteResenaPostgresIntegrationTest`).

**Interfaces que produce:**
- `CursorComunidad`:
  - `static String codificar(String orden, LocalDateTime instante, long id)`;
  - `static Posicion decodificar(String cursor, String ordenEsperado)`, con el record `Posicion(LocalDateTime instante, long id)`; un cursor inválido o de otro orden da 400.
- `PermisosComunidad`:
  - `boolean esModerador(Usuario)`: la misma regla que `ModeratorAuthorizationManager.tienePermisoModeracion`, extraída a un método compartido sin cambiar el manager;
  - `void verificarPuedeEscribir(Usuario)`: 403 si la cuenta está suspendida;
  - `void verificarPuedePublicar(Usuario)`: lo anterior más `ReincidenciaService.verificarPuedePublicar`.
- `LimiteContenidoComunidadService`:
  - constantes `MAX_PUBLICACIONES_POR_HORA = 5` y `MAX_RESPUESTAS_POR_HORA = 20`;
  - `void verificarPublicacion(Usuario)` y `void verificarRespuesta(Usuario)` llaman a `findByIdForUpdate` y lanzan `TooManyRequestsException` al superar la cuota.
- `PublicacionComunidadService`:
  - `crear(Jwt, CrearPublicacionRequest)` devuelve `PublicacionDetalleResponse`;
  - `editar(Jwt, Long, EditarPublicacionRequest)`;
  - `eliminar(Jwt, Long)`;
  - `listarGeneral(Jwt|null, String orden, String cursor, Integer limite)` y `listarPorProducto(Jwt|null, Long idProducto, String orden, String cursor, Integer limite)` devuelven `PaginaPublicaciones(items, nextCursor, total)`;
  - `detalle(Jwt|null, Long)`.
- `PublicacionResumenResponse`:
  - `idPublicacion`, `tipo`, `idProducto`, `nombreProducto`, `titulo`;
  - `extracto` (200 caracteres), `autor` (nombre visible);
  - `fechaCreacion`, `fechaUltimaActividad`;
  - `respuestas`, `meGusta`;
  - `estadoModeracion`, solo para el autor y los moderadores; nulo para los demás;
  - `cerrada`.
- `PublicacionDetalleResponse`: lo anterior con `contenido`, `fechaEdicion`, `meGustaPropio` y `esAutor`.
- Endpoints, de la sección H de la auditoría:
  - `GET /api/comunidad/publicaciones?orden=actividad|recientes&cursor=&limite=` (las generales);
  - `GET /api/productos/{id}/comunidad/publicaciones?...`;
  - `GET /api/comunidad/publicaciones/{id}`;
  - `POST /api/comunidad/publicaciones` → 201;
  - `PUT /api/comunidad/publicaciones/{id}` → 200;
  - `DELETE /api/comunidad/publicaciones/{id}` → 204.

- [ ] **Paso 1: pruebas que fallan.**
  - `CursorComunidadTest`: ida y vuelta, y cursor manipulado → 400.
  - En `ComunidadPublicacionesIntegrationTest`:
    - `crearSinSesion401`, `crearCuentaSuspendida403` y `crearConBloqueoReincidencia403`;
    - `crearGeneralConProducto400`, `crearProductoInactivo409` y `tituloDe4Caracteres400`;
    - `textoConInsultoQuedaPendienteYSoloLoVenAutorYModerador` (CA-08);
    - `editarAjeno403`, `eliminarAjeno403` y `moderadorEliminaAjeno204`;
    - `editarVuelveAPasarPorElFiltro` y `editarOcultaPorModeracion409`;
    - `sextaPublicacionEnUnaHora429` y `laEliminadaCuentaParaLaCuota` (CA-07);
    - `paginaConCursorNoRepiteNiSaltaConPublicacionesNuevas` (CA-09);
    - `limite0y51Dan400`;
    - `eliminadaNoApareceEnListasYSuDetalleEs404ParaTerceros`.
- [ ] **Paso 2: ejecutar** `./mvnw test -Dtest='CursorComunidadTest,ComunidadPublicaciones*'`. Resultado esperado: falla de compilación.
- [ ] **Paso 3: implementar.**
  - Las entidades replican la 029 columna por columna.
  - Las listas usan consultas keyset (`(fecha, id) < (:fecha, :id)`) más dos consultas agrupadas para conteos.
  - `crear` pasa título y contenido juntos por `AnalizadorContenido.analizar(titulo + "\n" + contenido)`.
- [ ] **Paso 4: ejecutar el paso 2 y `PublicacionComunidadPostgresIntegrationTest`** contra PostgreSQL. Esta prueba comprueba que las entidades validan contra la 029 real. Resultado esperado: pasan.
- [ ] **Paso 5: commit** `feat(comunidad): publicaciones con cuotas, filtro y paginación por cursor`.

### Tarea 3: Respuestas (CA-04, CA-06, CA-07, CA-08)

**Archivos:**
- Crear:
  - `entity/RespuestaComunidad.java`;
  - `repository/RespuestaComunidadRepository.java`;
  - `service/RespuestaComunidadService.java`;
  - `controller/ComunidadRespuestasController.java`.
- Pruebas:
  - `controller/ComunidadRespuestasIntegrationTest.java`;
  - casos de profundidad en `PublicacionComunidadPostgresIntegrationTest`.

**Interfaces que produce:**
- `RespuestaComunidadService`:
  - `crear(Jwt, Long idPublicacion, CrearRespuestaRequest(contenido, idRespuestaPadre?))` devuelve `RespuestaResponse`;
  - `editar(Jwt, Long, EditarRespuestaRequest)`;
  - `eliminar(Jwt, Long)`;
  - `listarNivel(Jwt|null, Long idPublicacion, Long padre|null, String cursor, Integer limite)` devuelve `PaginaRespuestas(items, nextCursor)`.
- `RespuestaResponse`:
  - `idRespuesta`, `idRespuestaPadre`, `profundidad`;
  - `contenido` y `autor`, nulos si no es visible;
  - `enRespuestaA`: el nombre del autor de la citada, o nulo;
  - `estadoVisible`: `VISIBLE`, `ELIMINADA`, `OCULTA` o `EN_REVISION`;
  - `estadoModeracion`: solo para el autor y los moderadores;
  - `respuestasHijas` (conteo), `meGusta`, `meGustaPropio`, `esAutor`;
  - `fechaCreacion`, `fechaEdicion`.
- Endpoints:
  - `GET /api/comunidad/publicaciones/{id}/respuestas?padre=&cursor=&limite=`;
  - `POST` al mismo recurso → 201;
  - `PUT /api/comunidad/respuestas/{id}`;
  - `DELETE /api/comunidad/respuestas/{id}` → 204.

- [ ] **Paso 1: pruebas que fallan.**
  - `responderEnNivel2CreaHermanaConEnRespuestaA` (CA-04): la respuesta nueva tiene profundidad 2, el mismo padre que la citada y `enRespuestaA` con el nombre de su autor.
  - `responderEnPublicacionCerrada409` y `responderEnPublicacionDeProductoInactivo409`.
  - `madreDeOtraPublicacion400`.
  - `respuesta21EnUnaHora429` (CA-07).
  - `respuestaVisibleActualizaFechaUltimaActividad` y `respuestaPendienteNoLaActualiza`.
  - `eliminadaConservaSuLugarYSusHijas`, sin texto ni autor (CA-08).
  - `pendienteAjenaSaleComoEnRevision`.
  - `editarAjena403`.
  - `listarNivelSoloDevuelveUnNivel`.
- [ ] **Paso 2: ejecutar** `./mvnw test -Dtest='ComunidadRespuestas*'`. Resultado esperado: falla.
- [ ] **Paso 3: implementar.**
  - Si la madre tiene profundidad 2, el servicio guarda `padre = madre.padre` y `citada = madre`. El trigger sigue siendo la garantía final.
  - `fecha_ultima_actividad` se actualiza en la misma transacción solo cuando la respuesta queda PUBLICADA.
- [ ] **Paso 4: ejecutar** las pruebas del paso 2 y `PublicacionComunidadPostgresIntegrationTest`. Resultado esperado: pasan.
- [ ] **Paso 5: commit** `feat(comunidad): respuestas en tres niveles`.

### Tarea 4: «Me gusta» y regresión (CA-05, CA-10)

**Archivos:**
- Crear:
  - `entity/ReaccionPublicacion.java` y `entity/ReaccionRespuesta.java`, con `@IdClass`;
  - `entity/TipoReaccion.java`;
  - dos repositorios;
  - `service/ReaccionComunidadService.java`;
  - `controller/ComunidadReaccionesController.java`.
- Pruebas:
  - `ComunidadReaccionesIntegrationTest.java`;
  - `ComunidadReaccionesConcurrencyTest.java` (PostgreSQL);
  - `ComunidadNoAfectaCalificacionesTest.java`.

**Interfaces que produce:**
- `ReaccionComunidadService.darMeGusta(Jwt, TipoContenido, Long)` y `retirarMeGusta(...)` devuelven `MeGustaResponse(meGusta, meGustaPropio)`.
- Endpoints `PUT` y `DELETE` en `/api/comunidad/publicaciones/{id}/me-gusta` y `/api/comunidad/respuestas/{id}/me-gusta`.

- [ ] **Paso 1: pruebas que fallan.**
  - `dosMeGustaSimultaneosDejanUno`: dos hilos con `CountDownLatch` en PostgreSQL (CA-05).
  - `retirarSinHaberDado200` y `darDosVeces200ConConteo1`.
  - `cuentaSuspendidaNoReacciona403` y `bloqueoPorReincidenciaSiReacciona200`.
  - `meGustaEnContenidoNoVisible404`.
  - `ComunidadNoAfectaCalificacionesTest` (CA-10): crear publicaciones, respuestas y «Me gusta» sobre un producto no cambia su calificación, su conteo de reseñas ni `GET /api/rankings`.
- [ ] **Paso 2: ejecutar.** Resultado esperado: falla.
- [ ] **Paso 3: implementar.**
  - Dar el «Me gusta» es un `INSERT … ON CONFLICT DO NOTHING` con `@Modifying` nativo. En H2 se captura `DataIntegrityViolationException` como respaldo.
  - Retirarlo es un `DELETE` físico.
- [ ] **Paso 4: ejecutar** `./mvnw clean test`. Resultado esperado: todo pasa.
- [ ] **Paso 5: commit** `feat(comunidad): me gusta idempotente`.

### Tarea 5: Frontend (CA-08, CA-11)

**Archivos:**
- Modificar:
  - `frontend/src/services/api.ts`, con funciones de los endpoints de las tareas 2 a 4;
  - `src/types/comunidad.ts`;
  - `src/components/Header.tsx`, con un enlace «Comunidad»;
  - el detalle del producto, con un enlace «Comunidad (N)» que toma N de `total`.
- Crear las rutas:
  - `src/app/comunidad/page.tsx`;
  - `src/app/comunidad/publicacion/[id]/page.tsx`;
  - `src/app/productos/[id]/comunidad/page.tsx`.
- Crear en `src/components/comunidad/`:
  - `ListaPublicaciones`, `TarjetaPublicacion` y `FormularioPublicacion`, con el aviso previo de `analizarComentario`;
  - `HiloRespuestas` y `RespuestaItem`, recursivo hasta el nivel 2 y con «Ver N respuestas»;
  - `FormularioRespuesta`;
  - `BotonMeGusta`, optimista con reversión si falla;
  - `ContenidoNoVisible`;
  - el hook `usePaginacionCursor`.
- Reutilizar `EstadoVacio`, `ContadorPerfil` (o el contador de caracteres existente), `foco.ts` y `AuthModal`. Cada componente tiene su prueba `*.test.tsx`.

- [ ] **Paso 1: leer** `node_modules/next/dist/docs/` sobre rutas dinámicas y `params`.
- [ ] **Paso 2: pruebas que fallan.**
  - Estados de cada página: cargando (`aria-busy`), vacío, error con «Reintentar», 401 que abre `AuthModal`, 403 con el mensaje del servidor, 404 y 429.
  - `ContenidoNoVisible` muestra «Esta respuesta fue eliminada» o «En revisión» y no el texto.
  - `BotonMeGusta` revierte el estado si la petición falla.
  - El árbol usa `role="list"` anidado y `aria-level`, y se puede usar solo con teclado.
  - El texto con una URL se muestra como texto, sin `<a>`.
  - Los contadores de caracteres coinciden con los límites del backend.
- [ ] **Paso 3: implementar.**
- [ ] **Paso 4: ejecutar** `npx tsc --noEmit`, `npm run lint`, `npm test` y `npm run build`. Resultado esperado: todo pasa.
- [ ] **Paso 5: commit** `feat(comunidad): páginas del foro`.

### Tarea 6: Documentación, revisión y PR

- [ ] **Paso 1: documentar.**
  - `docs/api.md`: nueva sección de la comunidad con los endpoints, los códigos y las cuotas.
  - `docs/modelo-datos.md`: la migración 029.
  - `frontend/docs/`: una nota sobre las páginas.
- [ ] **Paso 2: ejecutar los comandos de CA-18.** Resultado esperado: todo pasa.
- [ ] **Paso 3: punto de control 2.** Revisión independiente de la rama. Los hallazgos críticos o importantes se corrigen con una prueba que primero falla.
- [ ] **Paso 4: push y PR** con la evidencia y el aviso de que la 029 debe estar aplicada antes de fusionar. No se fusiona.

## Puntos de atención en la revisión

1. **Publicación de producto cuyo producto se desactiva después.** Sigue visible y no acepta respuestas nuevas (RN-02). Tarea 3: `responderEnPublicacionDeProductoInactivo409`.
2. **Carrera de cuota.** Dos publicaciones simultáneas cuando el usuario tiene 4 en la última hora: solo una pasa. Tarea 2: añadir `cuotaConcurrenteSoloAdmiteUna` en PostgreSQL.
3. **Eliminar una respuesta con hijas.** Las hijas siguen accesibles con «Ver N respuestas» (Tarea 3: `eliminadaConservaSuLugarYSusHijas`).
4. **El autor edita una publicación PENDIENTE o RECHAZADA.** Sigue la misma regla que `estadoTrasEdicion` de las reseñas: vuelve a PENDIENTE y no se publica sola. Tarea 2: añadir `editarRechazadaVuelveAPendiente`.
5. **Cursor de otra lista u otro orden.** Responde 400, sin resultados mezclados. Tarea 2: `cursorDeOtroOrden400`, con el orden incluido en el cursor.
