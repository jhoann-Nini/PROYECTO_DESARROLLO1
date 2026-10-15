BEGIN;

-- ============================================================================
-- Migración 002: Soporte para Supabase Auth e Identidad Externa
-- Proyecto: TecReview
-- Propósito:
--   1. Incorporar el identificador externo único de Supabase Auth (UUID 'sub').
--   2. Permitir que la columna password sea nullable para delegar credenciales.
--   3. Mantener intactas las claves primarias (id_usuario), roles y relaciones
--      (reseñas, valoraciones, establecimientos).
-- ============================================================================

-- 0. Garantizar existencia de tabla de versiones
CREATE TABLE IF NOT EXISTS public.schema_version (
    version VARCHAR(50) PRIMARY KEY,
    descripcion VARCHAR(255) NOT NULL,
    aplicado_en TIMESTAMP WITHOUT TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 1. Agregar columna para el identificador externo de Supabase Auth (UUID 'sub')
ALTER TABLE public.usuario
    ADD COLUMN IF NOT EXISTS supabase_uid VARCHAR(64);

-- 2. Índice único parcial: garantiza unicidad de UIDs de Supabase
--    admitiendo múltiples valores NULL durante la transición de usuarios históricos
CREATE UNIQUE INDEX IF NOT EXISTS uq_usuario_supabase_uid
    ON public.usuario (supabase_uid)
    WHERE supabase_uid IS NOT NULL;

-- 3. Permitir valores nulos en password para usuarios autenticados vía Supabase Auth
--    (las credenciales y hashes se custodian exclusivamente en Supabase Auth)
ALTER TABLE public.usuario
    ALTER COLUMN password DROP NOT NULL;

-- 4. Registrar la migración en schema_version
INSERT INTO public.schema_version (version, descripcion)
VALUES (
    '002_soporte_supabase_auth',
    'Integración Supabase Auth: supabase_uid único condicional, password nullable y preservación de relaciones de usuario'
)
ON CONFLICT (version) DO NOTHING;

COMMIT;
