# Convenciones de migraciones TecReview

Derivadas de las migraciones 001–021. Ejemplo de referencia: `021_moderacion_reportes_ofertas.sql`.

## Archivo

- Nombre: `NNN_descripcion_en_snake_case.sql`, número siguiente al último existente.
- Dos copias idénticas:
  `proyectos/backend/src/main/resources/db/migration/` y `proyectos/docs/sql/`.

## Estructura

```sql
-- ============================================================
-- MIGRACION NNN: TITULO
-- <fase / hallazgo / historia de usuario>
-- ============================================================
-- Problema: …
-- Cambios: 1. … 2. …
-- Requisitos previos: migraciones que deben estar en schema_version.
-- Antes de ejecutar en Supabase: comprobaciones manuales.
-- ============================================================

BEGIN;

-- cambios, calificados con public.

INSERT INTO public.schema_version (version, descripcion)
VALUES ('NNN_descripcion', 'Descripción legible')
ON CONFLICT (version) DO NOTHING;

COMMIT;
```

## Reglas

- Todo en una transacción (`BEGIN … COMMIT`): si algo falla, no queda a medias.
- Funciones con `SET search_path = pg_catalog` y objetos calificados `public.` (019).
- Historiales append-only: trigger que impide `UPDATE`/`DELETE`.
- Transiciones de estado validadas en trigger `BEFORE UPDATE`; eventos exigidos con trigger
  diferido (`DEFERRABLE INITIALLY DEFERRED`) cuando corresponda.
- Índices únicos parciales para reglas tipo "uno abierto por usuario".
- Usar `IF NOT EXISTS` / `ON CONFLICT DO NOTHING` donde haga a la migración re-ejecutable sin daño.
- No migrar datos de forma silenciosa: si hay transformación de datos, documentarla en la
  cabecera y en `proyectos/docs/`.
- Comprobar requisitos previos consultando `schema_version` al inicio cuando dependa de otra
  migración (patrón de la 010).
- Documentar en `proyectos/docs/modelo-datos.md` y, si aplica, en un `REVISION_*.md`.
