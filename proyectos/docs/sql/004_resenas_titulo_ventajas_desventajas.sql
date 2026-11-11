BEGIN;

-- ============================================================================
-- Migración 004: Título, Ventajas y Desventajas en Reseñas
-- Proyecto: TecReview
-- Tarea: S2-12
-- Propósito:
--   1. Incorporar columnas titulo, ventajas y desventajas a la tabla resena.
--   2. Permitir valores nulos para garantizar retrocompatibilidad con las
--      reseñas previamente registradas.
--   3. Registrar la migración en schema_version.
-- ============================================================================

-- 0. Garantizar existencia de tabla de versiones
CREATE TABLE IF NOT EXISTS public.schema_version (
    version VARCHAR(50) PRIMARY KEY,
    descripcion VARCHAR(255) NOT NULL,
    aplicado_en TIMESTAMP WITHOUT TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 1. Agregar columnas titulo, ventajas y desventajas a la tabla resena
ALTER TABLE public.resena
    ADD COLUMN IF NOT EXISTS titulo VARCHAR(150),
    ADD COLUMN IF NOT EXISTS ventajas TEXT,
    ADD COLUMN IF NOT EXISTS desventajas TEXT;

-- 2. Registrar la migración en schema_version
INSERT INTO public.schema_version (version, descripcion)
VALUES (
    '004_resenas_titulo_ventajas_desventajas',
    'S2-12: Agregar columnas titulo, ventajas y desventajas a la tabla resena'
)
ON CONFLICT (version) DO NOTHING;

COMMIT;

