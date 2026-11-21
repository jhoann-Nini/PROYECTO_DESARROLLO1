---
name: supabase-auditor
description: Usar cuando en TecReview haya que revisar el esquema de la base de datos en Supabase/PostgreSQL, comparar tablas con entidades JPA, revisar migraciones o la tabla schema_version, triggers, funciones, índices, RLS o avisos de seguridad y rendimiento de Supabase, o preparar una migración nueva. También ante errores de arranque por ddl-auto=validate.
---

# Auditor de Supabase — TecReview

## Principio

La base de datos de TecReview **ya existe en producción** (Supabase). Esta skill audita y
propone; **no aplica**. Toda conclusión se apoya en evidencia triple: lo que hay en la BD,
lo que dicen las migraciones y lo que esperan las entidades JPA.

## Cuándo usarla / cuándo no

| Usar | No usar |
|---|---|
| Diferencias BD ↔ migraciones ↔ entidades | Autenticación del navegador (`frontend/src/lib/supabase/client.ts`) sin relación con el esquema |
| Redactar la siguiente migración (borrador) | Lógica de negocio de moderación → `moderacion-inteligente` |
| RLS (Fase 5), avisos del asesor de Supabase, índices | Contratos HTTP → `springboot-api-auditor` |

## Hechos del proyecto

- **Sin Flyway ni Liquibase.** Las migraciones SQL se aplican a mano en Supabase y cada una
  se registra en `public.schema_version (version, descripcion, aplicado_en)`.
- Ubicación doble e idéntica: `proyectos/backend/src/main/resources/db/migration/` y
  `proyectos/docs/sql/` (esta última además tiene `tests/`). Al proponer una migración nueva,
  van **ambas copias**.
- Numeración `NNN_descripcion_snake.sql`; última aplicada: **021**. Existen dos `004_*`
  (una marcada `_obsoleta`) y la 021 registró la 017 y 018, que faltaban en `schema_version`.
- Backend: `spring.jpa.hibernate.ddl-auto=validate` → si una entidad no coincide con la BD,
  la aplicación no arranca. Tests: H2 con `create-drop` (no ejecuta triggers ni funciones
  PL/pgSQL), salvo `ReporteResenaPostgresIntegrationTest` (Testcontainers).
- No hay un volcado del esquema base en el repositorio.

Convenciones de migración: [references/convenciones-migraciones.md](references/convenciones-migraciones.md).
Consultas permitidas: [references/consultas-solo-lectura.sql](references/consultas-solo-lectura.sql).

## Procedimiento (sigue los 6 pasos de AGENTS.md)

1. **Migraciones**: lee las relevantes en orden y anota el estado esperado de cada objeto.
2. **Entidades JPA**: `proyectos/backend/src/main/java/com/example/backend/entity/`
   (`@Table`, `@Column(name, nullable, length, precision)`, `@Enumerated`, `@JdbcTypeCode(JSON)`).
3. **BD real (solo con autorización explícita de la sesión)** mediante el MCP de Supabase,
   únicamente: `list_tables`, `list_migrations`, `list_extensions`, `get_advisors` y
   `execute_sql` con **un único `SELECT`** de `references/consultas-solo-lectura.sql`.
4. **Comparar** y clasificar cada diferencia: falta en BD, falta en migración, tipo o
   nulabilidad distinta, CHECK/enum desalineado, trigger ausente, sin RLS.
5. **Informe** con una tabla `objeto | BD | migración (archivo:línea) | entidad (archivo:línea) | riesgo`.
6. **Propuesta** de migración como borrador en el scratchpad o en el chat, y **esperar
   aprobación** antes de crear el archivo en el repositorio.

Para probar un borrador: solo en un PostgreSQL local de Docker, a partir de
`pg_dump --schema-only --schema=public` (credenciales en `proyectos/backend/.env`; nunca
mostrarlas), y solo con permiso.

## Reglas obligatorias

- **Prohibido**: `apply_migration`, `execute_sql` con `INSERT/UPDATE/DELETE/ALTER/CREATE/DROP/
  TRUNCATE/GRANT`, `create_branch`, `merge_branch`, `reset_branch`, `deploy_edge_function`,
  `create_edge_function_secret`, `pause_project` o cualquier escritura.
- `execute_sql` también puede escribir: revisa la consulta antes de enviarla.
- Nunca leer en voz alta ni copiar valores de `.env`, URLs con contraseña o claves.
- No editar migraciones ya aplicadas: los cambios van en una migración nueva.
- No cambiar entidades para "hacerlas coincidir" sin la aprobación del paso 6.

## Validaciones

- `./mvnw test` en `proyectos/backend`; si la migración toca triggers, prueba en PostgreSQL
  (patrón `ReporteResenaPostgresIntegrationTest`) o con un script en `proyectos/docs/sql/tests/`
  (patrón `011_verificacion_postgresql.sql`).
- Las dos copias de la migración nueva deben ser idénticas: `cmp` entre ambas rutas.

## Criterios de aceptación

- Cero escrituras en Supabase durante la auditoría.
- Cada diferencia lleva su consulta y la referencia `archivo:línea`.
- Una migración propuesta sigue las convenciones, es idempotente donde aplica, registra su
  fila en `schema_version`, tiene sus dos copias y documentación (`proyectos/docs/modelo-datos.md`).

## Errores frecuentes

| Error | Corrección |
|---|---|
| Concluir que una columna falta solo porque no está en la entidad | Comprobar en la BD; puede ser intencional (columna gestionada por trigger) |
| Confiar en que los tests H2 validan la migración | H2 genera el esquema desde las entidades; no ejecuta tus SQL |
| Olvidar `search_path` en funciones nuevas | Fijar `SET search_path = pg_catalog` (criterio de la 019) y calificar con `public.` |
| Proponer RLS sin revisar que el backend usa el rol de servicio | Analizar quién se conecta (backend vía JDBC, frontend con clave pública) antes de proponer políticas |
