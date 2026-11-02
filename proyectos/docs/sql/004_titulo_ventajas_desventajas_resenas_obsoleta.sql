BEGIN;

-- ============================================================================
-- ### Migración 004 — No ejecutada

-- Este archivo corresponde a una propuesta anterior para ampliar la tabla `resena` con los campos `titulo`, `ventajas` y `desventajas`.

-- **Importante:**
-- Esta migración nunca fue ejecutada en Supabase.
-- No forma parte del esquema actual de la base de datos.
-- Sus cambios fueron reemplazados por la migración `005_unificar_valoraciones_resenas.sql`.
-- No debe ejecutarse ni considerarse una migración pendiente.

-- Se conserva únicamente como referencia histórica del proceso de evolución del modelo de datos de TecReview.
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