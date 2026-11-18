
BEGIN;

-- ============================================================================
-- MIGRACION 012: MODERACION AUTOMATICA DE RESENAS
--
-- Agrega un estado independiente para el filtro automatico de comentarios.
-- Las resenas existentes comienzan como PUBLICADA.
-- No modifica la moderacion manual ni el ocultamiento por reportes.
-- ============================================================================

ALTER TABLE public.resena
  ADD COLUMN IF NOT EXISTS estado_moderacion VARCHAR(20)
    NOT NULL DEFAULT 'PUBLICADA';

-- Garantizar que solo se almacenen los estados permitidos.
DO $migration$
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'chk_resena_estado_moderacion'
        AND conrelid = 'public.resena'::regclass
    ) THEN
      ALTER TABLE public.resena
        ADD CONSTRAINT chk_resena_estado_moderacion
          CHECK (estado_moderacion IN ('PUBLICADA', 'PENDIENTE'));
    END IF;
  END $migration$;

-- Registrar la migracion.
INSERT INTO public.schema_version (version, descripcion)
VALUES (
         '012_moderacion_automatica_resenas',
         'Agrega el estado de moderacion automatica de resenas'
       )
ON CONFLICT (version) DO NOTHING;
COMMIT;
