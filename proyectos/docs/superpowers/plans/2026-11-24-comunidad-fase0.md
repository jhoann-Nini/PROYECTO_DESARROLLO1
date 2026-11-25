# Comunidad, fase 0: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** dejar listo el terreno de la comunidad sin cambiar ningún
comportamiento. El motor de moderación pasa a un componente común,
`AnalizadorContenido`, y el RLS de `apelacion` y `termino_moderacion` se
activa con la migración 028 en las 23 tablas de `public`. En producción ya está activo en todas, así que la 028 no cambia nada allí; sirve para que una base creada desde el repositorio quede igual que producción.

**Arquitectura:**
- `AnalizadorContenido` (`@Component`) contiene todo el análisis que hoy está en `ResenaModerationService`: listas, normalización, patrones, términos agregados, señales de spam, niveles de riesgo y motivos.
- `ResenaModerationService` conserva su API pública y delega en él.

**Tecnologías:** Spring Boot 4, JUnit 5, PostgreSQL 17 local para la 028.

**Especificación:** `proyectos/docs/superpowers/specs/2026-11-24-comunidad-design.md` (fase 0: CA-01, CA-17 y CA-18).

## Restricciones globales

- **Ningún cambio de comportamiento:** los textos de los motivos, los niveles, las listas y la normalización quedan idénticos.
- **Las pruebas existentes no cambian**, salvo el import mecánico si se mueve el record `ResultadoModeracion`.
- **El frontend no se toca.**
- **La 028 no modifica columnas ni entidades:** el backend funciona con o sin ella.
- **Claude no aplica la migración ni fusiona.**
- Commits en `nini` con Conventional Commits.

## Puntos de atención en la revisión

1. **Un caso del corpus que cambie de nivel tras la extracción:** debe fallar `ResenaModerationServiceCorpusTest` (Tarea 2).
2. **Llamadas estáticas existentes** (`ResenaModerationService.normalizarTermino`, `compilarTermino`, `estaEnListaBase`, `riesgoDe`, `normalizar` y las constantes `MOTIVO_*`): siguen compilando y devolviendo lo mismo (Tarea 2).
3. **Los dos constructores de `ResenaModerationService`** que usan las pruebas (sin argumentos y con `FuenteTerminosModeracion`) siguen funcionando (Tarea 2).
4. **Que Spring tenga un solo candidato** para `FuenteTerminosModeracion` y para `AnalizadorContenido` (Tarea 2: el contexto arranca en las pruebas de integración).
5. **La 028 aplicada dos veces:** no falla (Tarea 1).

---

### Tarea 1: Migración 028 y su verificación

**Archivos:**
- Crear: `backend/src/main/resources/db/migration/028_rls_tablas_publicas.sql` y una copia idéntica en `docs/sql/`
- Crear: `docs/sql/tests/028_verificacion_rls.sql`

- [ ] **Paso 1: escribir el script de verificación.** Para **todas** las tablas de `public` comprueba:
  - `relrowsecurity` verdadero;
  - ninguna política en `pg_policies`;
  - `anon` y `authenticated` sin ningún privilegio (incluidos `TRUNCATE`, `REFERENCES` y `TRIGGER`, que RLS no frena) en tablas, vistas y secuencias;
  - la fila `028_rls_tablas_publicas` en `schema_version`.
- [ ] **Paso 2: ejecutarlo antes de la migración** en PostgreSQL 17 local restaurado con `pg_dump --schema-only --schema=public`, desactivando RLS en las 20 tablas que las migraciones no cubren (así queda una base «creada desde el repositorio»). Resultado esperado: falla.
- [ ] **Paso 3: escribir la migración.** Preflight de la 027; `SET LOCAL lock_timeout = '5s'`; `ALTER TABLE … ENABLE ROW LEVEL SECURITY` en las 23 tablas, nombradas una por una; comprobación final de que no queda ninguna tabla sin RLS; fila en `schema_version`.
- [ ] **Paso 4: aplicarla dos veces** y ejecutar el script. Resultado esperado: «OK». Comprobar con `cmp` que las dos copias son idénticas.
- [ ] **Paso 5: punto de control 1.** Revisión independiente de la migración contra la especificación y la salida del script. Se corrigen los hallazgos críticos o importantes.
- [ ] **Paso 6: commit** `feat(db): RLS en todas las tablas de public desde las migraciones (028)`. Pedir al equipo que la apruebe y la aplique en Supabase.

### Tarea 2: Extraer `AnalizadorContenido`

**Archivos:**
- Crear: `backend/src/main/java/com/example/backend/service/AnalizadorContenido.java`
- Crear (si se mueve): `service/ResultadoModeracion.java`, record de nivel superior; se actualizan sus usos (`RevisionResenasService` y las pruebas que lo nombran)
- Modificar: `service/ResenaModerationService.java`
- Crear: `backend/src/test/java/com/example/backend/service/AnalizadorContenidoTest.java`

**Interfaces que produce:**
- `AnalizadorContenido(FuenteTerminosModeracion)` y `AnalizadorContenido()` (sin términos agregados).
- `ResultadoModeracion analizar(String texto, Collection<String> otrosTextosDelAutor)` y `analizar(String texto)`.
- Estáticos: `normalizar`, `normalizarTermino`, `compilarTermino`, `estaEnListaBase`, `riesgoDe`, `colapsarRepeticiones`.
- Constantes `MOTIVO_*` con los mismos textos.
- `ResenaModerationService(AnalizadorContenido)` con `@Autowired`, más los dos constructores actuales, que crean su propio `AnalizadorContenido`. Los estáticos y las constantes de `ResenaModerationService` delegan en `AnalizadorContenido`.

- [ ] **Paso 1: escribir la prueba que falla.** `AnalizadorContenidoTest.clasificaIgualQueResenaModerationService` recorre todos los casos del corpus compartido y además los de `limitacionesConocidas`. Comprueba que `AnalizadorContenido.analizar` devuelve el mismo riesgo y los mismos motivos que `ResenaModerationService.analizar`, con y sin otros textos del autor.
- [ ] **Paso 2: ejecutar** `./mvnw test -Dtest=AnalizadorContenidoTest`. Resultado esperado: falla de compilación.
- [ ] **Paso 3: mover el motor** a `AnalizadorContenido` sin cambiar su lógica, copiando el código tal cual. `ResenaModerationService` queda con `determinarEstado`, `estadoTrasEdicion` y `detectarMotivos`, y delega `analizar`.
- [ ] **Paso 4: ejecutar** `./mvnw clean test`. Resultado esperado: todas pasan; el número de pruebas existentes no cambia, más las nuevas.
- [ ] **Paso 5: comprobar** que `git diff` de `src/test` solo contiene la prueba nueva y, si se movió el record, los imports.
- [ ] **Paso 6: commit** `refactor(moderacion): extraer AnalizadorContenido sin cambios de comportamiento`.

### Tarea 3: Documentación, revisión y PR

- [ ] **Paso 1: actualizar la documentación.**
  - `docs/modelo-datos.md`: migración 028.
  - `frontend/docs/moderacion-resenas.md`: el motor está en `AnalizadorContenido`.
  - `docs/caso6-moderacion-antibots.md`: el hallazgo D4 corregido.
- [ ] **Paso 2: ejecutar los comandos de CA-18:** `./mvnw clean test`, `npx tsc --noEmit`, `npm run lint`, `npm test` y `npm run build`. Resultado esperado: todo pasa.
- [ ] **Paso 3: punto de control 2.** Revisión independiente de toda la rama contra la especificación. Cada hallazgo crítico o importante se corrige con una prueba que primero falla.
- [ ] **Paso 4: commit de la documentación, push y PR**, con la salida de CA-18, el informe de la revisión y el aviso de que la 028 debe estar aplicada antes de fusionar. No se fusiona.
