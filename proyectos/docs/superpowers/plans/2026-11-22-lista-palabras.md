# Lista de palabras de moderación administrable: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** que los administradores agreguen y desactiven términos con
categoría, y que el filtro del backend los aplique en minutos sin desplegar
código.

**Arquitectura:**
- La tabla `termino_moderacion` (migración 027) es la fuente.
- `TerminosModeracionCache` compila los patrones de los términos activos y se
  recarga después de cada cambio o cuando la carga tiene más de 5 minutos.
- `ResenaModerationService` suma esos patrones a la lista base.
- El formulario del navegador no cambia.

**Tecnologías:** Spring Boot 4 y JPA (H2 en las pruebas), PostgreSQL 17 local
para los triggers, Next.js 16, React 19 y Vitest.

**Diseño:** `proyectos/docs/superpowers/specs/2026-11-22-lista-palabras-design.md`

## Restricciones globales

- Categorías: `AMENAZA` → `ALTO`; `ACOSO`, `DISCRIMINACION`, `INSULTO` y
  `SPAM` → `MEDIO`.
- Etiquetas: Amenaza, Acoso, Discriminación, Insulto, Spam.
- Motivo literal: `Contiene «{termino}», de la lista de moderación ({Etiqueta})`.
  Uno por término detectado.
- El término normalizado tiene de 2 a 60 caracteres y al menos una letra.
- `409` con `Ese término ya está activo en la lista.` o
  `Ese término ya está en la lista base del filtro.`
- La caché se recarga después del commit y cuando la carga tiene más de 300 s.
  Si la consulta falla, conserva la carga anterior.
- El corpus compartido y `frontend/src/data/resenas.ts` no cambian.
- La migración 027 va en dos copias idénticas. Las funciones llevan
  `SET search_path = pg_catalog` y no se otorgan permisos a `anon` ni
  `authenticated`.
- Commits en `nini` con Conventional Commits.

## Puntos de atención en la revisión

1. **Un término que es parte de otra palabra** («puta» dentro de
   «computadora», «imbécil» dentro de «imbecilidad»): no debe marcar (Tarea 2).
2. **Un término con caracteres de expresiones regulares** («c++», «a.b»): se
   cita con `Pattern.quote` y no rompe el filtro (Tarea 2).
3. **Desactivar un término:** la siguiente reseña con ese término se publica
   sin esperar 5 minutos (Tarea 3).
4. **La consulta de términos falla:** el filtro base sigue clasificando, y no
   hay un error 500 al publicar (Tarea 2).
5. **Volver a agregar un término desactivado:** se permite y crea una fila
   nueva (Tareas 1 y 3).

---

### Tarea 1: Migración 027, entidad y verificación en PostgreSQL

**Archivos:**
- Crear: `backend/src/main/resources/db/migration/027_terminos_moderacion.sql` y una copia idéntica en `docs/sql/`
- Crear: `docs/sql/tests/027_verificacion_terminos.sql`, siguiendo el patrón de `026_verificacion_apelaciones.sql`
- Crear: `entity/TerminoModeracion.java` y `entity/CategoriaTerminoModeracion.java` (enum con `riesgo()` y `etiqueta()`)
- Crear: `repository/TerminoModeracionRepository.java`: `List<TerminoModeracion> findByActivoTrue()`, `findAllByOrderByFechaCreacionDesc()`, `findByActivoOrderByFechaCreacionDesc(boolean)`, `boolean existsByTerminoNormalizadoAndActivoTrue(String)`, y `Optional<TerminoModeracion> findByIdForUpdate(Long)` con `@Lock(PESSIMISTIC_WRITE)`

**Interfaces que produce:**
- `CategoriaTerminoModeracion { AMENAZA, ACOSO, DISCRIMINACION, INSULTO, SPAM }`, con `RiesgoModeracion riesgo()` y `String etiqueta()`.
- `TerminoModeracion`: `idTermino`, `termino`, `terminoNormalizado`, `categoria`, `activo`, `creadoPor` (`Usuario`), `fechaCreacion`, `desactivadoPor` (`Usuario`), `fechaDesactivacion`.

- [ ] **Paso 1: escribir el script de verificación.** Escenarios:
  - un administrador agrega un término;
  - un moderador no puede agregar;
  - un segundo término activo con la misma forma normalizada falla;
  - desactivar con un administrador funciona;
  - volver a agregar un término desactivado funciona;
  - desactivar dos veces falla;
  - cambiar el término o la categoría falla;
  - reactivar con `UPDATE` falla;
  - desactivar con un no administrador falla;
  - `DELETE` y `TRUNCATE` fallan;
  - `anon` y `authenticated` no tienen acceso.

- [ ] **Paso 2: preparar la base local y comprobar que el script falla.**
  - Volcar el esquema con `pg_dump --schema-only --schema=public`. Las credenciales están en `backend/.env`; nunca mostrarlas.
  - Quitar la línea `CREATE SCHEMA public;` y restaurarlo en `postgres:17`, creando antes los roles `anon`, `authenticated` y `service_role`.
  - Insertar en `schema_version` las filas de las migraciones requeridas.
  - Ejecutar el script. Resultado esperado: falla porque la tabla no existe.

- [ ] **Paso 3: escribir la migración 027.** El preflight comprueba la 026. La migración crea la tabla, el índice único parcial, los triggers `fn_validar_insert_termino_moderacion`, `fn_validar_update_termino_moderacion` y `fn_proteger_termino_moderacion`, ejecuta los `REVOKE` y agrega la fila en `schema_version`.

- [ ] **Paso 4: aplicarla dos veces y ejecutar el script.** Resultado esperado: todo pasa, y cada escenario falla por la razón esperada (comprobarlo con `RAISE NOTICE`). Comprobar con `cmp` que las dos copias son idénticas.

- [ ] **Paso 5: validar las entidades.** Escribir la entidad y el repositorio y arrancar el backend con `ddl-auto=validate` contra la base local. Ejecutar `./mvnw clean test`. Resultado esperado: todo pasa.

- [ ] **Paso 6: commit** `feat(db): términos de moderación administrables (027)`.

### Tarea 2: Detección con los términos agregados

**Archivos:**
- Crear: `service/TerminosModeracionCache.java` (`@Component`)
- Modificar: `service/ResenaModerationService.java`
- Prueba: `service/ResenaModerationServiceTerminosTest.java`, unitaria y sin Spring, con una implementación en memoria

**Interfaces que produce:**
- `record TerminoCompilado(String termino, CategoriaTerminoModeracion categoria, List<Pattern> patrones)`, anidado en `TerminosModeracionCache`.
- `TerminosModeracionCache`:
  - `List<TerminoCompilado> activos()`: recarga de forma perezosa si pasaron 300 s y, si falla, devuelve la carga anterior;
  - `void invalidar()`: la próxima lectura recarga;
  - `static TerminoCompilado compilar(String termino, String normalizado, CategoriaTerminoModeracion categoria)`.
- `ResenaModerationService`:
  - constructor `@Autowired` que recibe `TerminosModeracionCache`;
  - constructor sin argumentos, sin términos agregados;
  - `static String normalizarTermino(String)`;
  - `boolean estaEnListaBase(String normalizado)`.
- Para probar sin Spring, una interfaz `FuenteTerminosModeracion { List<TerminoCompilado> activos(); }` que la caché implementa.

- [ ] **Paso 1: escribir las pruebas que fallan.**
  - `detectaTerminoConTildesYLeet`: «1mb3cil» con el término «imbécil»;
  - `detectaPluralYLetrasRepetidas`: «imbeciles», «imbeeecil»;
  - `detectaFraseConSeparadores`: «gana-dinero desde  casa»;
  - `noMarcaDentroDeOtraPalabra`: «imbecilidad»;
  - `terminoConCaracteresEspecialesNoRompe`: «c++»;
  - `amenazaDaRiesgoAlto`;
  - `motivoIncluyeTerminoYEtiqueta`;
  - `normalizarTerminoRechazaSinLetras`;
  - `estaEnListaBaseDetectaIdiota`;
  - `fuenteQueFallaNoImpideClasificar`: el filtro base sigue funcionando.

- [ ] **Paso 2: ejecutar** `./mvnw test -Dtest='ResenaModeration*'`. Resultado esperado: fallan las nuevas y las del corpus siguen pasando.

- [ ] **Paso 3: implementar.**
  - Una palabra usa el patrón de `nucleo()`.
  - Una frase usa `(?:^|[^a-z])` y las palabras unidas por `[^a-z]+`, más `(?![a-z])`.
  - Cada letra va citada con `Pattern.quote`.
  - En `analizar(...)`, después de las reglas base, se recorren `fuente.activos()`.

- [ ] **Paso 4: ejecutar** `./mvnw clean test`. Resultado esperado: todo pasa.

- [ ] **Paso 5: commit** `feat(moderacion): el filtro aplica los términos agregados por administradores`.

### Tarea 3: Endpoints de administración

**Archivos:**
- Crear: `service/TerminoModeracionService.java`, `controller/AdministracionTerminosController.java` bajo `/api/admin/terminos-moderacion`
- DTOs:
  - `CrearTerminoModeracionRequest(@NotBlank @Size(max=60) String termino, @NotNull CategoriaTerminoModeracion categoria)`;
  - `TerminoModeracionResponse(Long idTermino, String termino, String categoria, String etiquetaCategoria, boolean activo, String creadoPor, LocalDateTime fechaCreacion, String desactivadoPor, LocalDateTime fechaDesactivacion)`.
- Prueba: `controller/TerminosModeracionIntegrationTest.java`

**Interfaces que produce:** `listar(String estado, Jwt)`, `crear(request, Jwt)` (201) y `desactivar(Long, Jwt)`. Las dos últimas registran `TransactionSynchronization.afterCommit(cache::invalidar)`.

- [ ] **Paso 1: escribir las pruebas que fallan.**
  - `creaTermino201`;
  - `duplicadoActivo409`;
  - `terminoDeListaBase409`;
  - `terminoSinLetras400`;
  - `categoriaDesconocida400`;
  - `moderador403`;
  - `sinToken401`;
  - `desactivar200YDosVeces409`;
  - `reagregarTrasDesactivar201`;
  - `listarFiltraPorEstado`;
  - `resenaConTerminoQuedaPendienteConMotivo`;
  - `trasDesactivarSePublica`;
  - `colaMuestraTerminoYCategoria`.

- [ ] **Paso 2: ejecutar.** Resultado esperado: fallan.

- [ ] **Paso 3: implementar.**
  - Normalizar con `ResenaModerationService.normalizarTermino`.
  - Validar la longitud, que haya letras, la lista base y los duplicados.
  - Validar que quien llama sea administrador activo, igual que `AdministracionCuentasService`.
  - Traducir la violación de `uk_termino_moderacion_activo` a `409`.

- [ ] **Paso 4: ejecutar** `./mvnw clean test`, y la prueba nueva también contra PostgreSQL local. Resultado esperado: todo pasa.

- [ ] **Paso 5: commit** `feat(moderacion): administración de términos de moderación`.

### Tarea 4: Frontend, pestaña «Palabras de moderación»

**Archivos:**
- `types/administracion.ts` (o `moderacion.ts`): `TerminoModeracion` y `CategoriaTerminoModeracion`
- `services/api.ts`: `obtenerTerminosModeracion(estado?)`, `crearTerminoModeracion(termino, categoria)` y `desactivarTerminoModeracion(id)`
- Crear: `components/admin/AdminTerminosModeracion.tsx` y su `.test.tsx`
- Modificar: `components/AdminPanelModal.tsx`: `TabAdministracion` incluye `"terminos"`, con una opción en el selector móvil, un botón lateral «🚫 Palabras de moderación» y el render

**Textos:**
- Ayuda: «Estas palabras solo las revisa el servidor: el autor no recibe aviso previo y su reseña queda en revisión.»
- Confirmación: «¿Desactivar «{termino}»? Las reseñas nuevas con este término ya no quedarán en revisión.»
- Vacío: «No hay términos agregados.»

- [ ] **Paso 1: escribir las pruebas que fallan.**
  - lista los términos activos con su categoría y su autor;
  - el formulario exige término y categoría y llama a la API;
  - muestra el `409` del backend;
  - «Desactivar» pide confirmación y quita el término de la lista de activos;
  - el filtro «Inactivos» muestra quién lo desactivó;
  - el estado vacío.

- [ ] **Paso 2: ejecutar** `npx vitest run src/components/admin`. Resultado esperado: fallan.

- [ ] **Paso 3: implementar.**

- [ ] **Paso 4: ejecutar** `npx tsc --noEmit`, `npm run lint`, `npm test` y `npm run build`. Resultado esperado: todo pasa.

- [ ] **Paso 5: commit** `feat(frontend): administración de palabras de moderación`.

### Tarea 5: Documentación

- `docs/api.md`: §33.7
- `backend/API_DOCUMENTATION.md`
- `docs/modelo-datos.md`: tabla y migración 027
- `docs/caso6-moderacion-antibots.md`: prioridad media completa; actualizar las limitaciones del corpus («insultos fuera de la lista» y «discriminación» ahora se pueden cubrir con la lista agregada)
- `frontend/docs/moderacion-resenas.md`
- Estado del diseño

- [ ] **Paso 1:** escribir la documentación. **Paso 2:** commit `docs(moderacion): lista de palabras administrable`.
