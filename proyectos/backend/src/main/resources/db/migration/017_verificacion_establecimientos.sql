
-- ============================================================================
-- MIGRACION 017: VERIFICACION DE ESTABLECIMIENTOS
-- Ticket: TEC-151 / HU-S2-15
-- ============================================================================

BEGIN;

ALTER TABLE public.establecimiento
  ADD COLUMN IF NOT EXISTS verificado BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.establecimiento.verificado IS
  'Indica si el establecimiento fue verificado por un administrador.';

COMMIT;
