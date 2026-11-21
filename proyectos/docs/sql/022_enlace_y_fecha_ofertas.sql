-- ============================================================
-- MIGRACION 022: ENLACE Y FECHA DE ACTUALIZACION DE LAS OFERTAS
-- Fase 3 de la auditoria (hallazgos H-03, H-04 y H-06)
-- ============================================================
-- Problema: producto_establecimiento solo guardaba precio y disponibilidad.
-- No habia donde registrar el enlace de la oferta (aunque el motivo de
-- reporte 'enlace_incorrecto' existe desde la 018) ni la fecha del precio,
-- de modo que la interfaz no podia mostrar «Ver tienda» ni la antiguedad
-- del dato.
--
-- Cambios:
--   1. url_oferta TEXT NULL: debe empezar por http:// o https:// y tener
--      como maximo 2048 caracteres.
--   2. fecha_actualizacion_precio TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP.
--   3. Trigger BEFORE INSERT OR UPDATE que fija fecha_actualizacion_precio
--      al insertar y cuando cambian el precio, la disponibilidad o el enlace.
--
-- Datos: no transforma datos. Verificado el 2026-11-20 en Supabase:
-- producto_establecimiento tenia 0 filas. Si hubiera filas, el DEFAULT les
-- asigna la fecha de ejecucion de esta migracion.
--
-- La funcion fija search_path = pg_catalog (criterio de la 019).
--
-- Requisitos previos: 021 aplicada (reporte_oferta referencia esta tabla).
-- ============================================================

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.schema_version
        WHERE version = '021_moderacion_reportes_ofertas'
    ) THEN
        RAISE EXCEPTION 'Preflight fallido: la migracion 021_moderacion_reportes_ofertas debe estar aplicada antes de 022.';
    END IF;
END $$;

-- 1. Enlace de la oferta.
ALTER TABLE public.producto_establecimiento
  ADD COLUMN IF NOT EXISTS url_oferta TEXT NULL;

ALTER TABLE public.producto_establecimiento
  DROP CONSTRAINT IF EXISTS chk_producto_establecimiento_url_oferta;

ALTER TABLE public.producto_establecimiento
  ADD CONSTRAINT chk_producto_establecimiento_url_oferta
    CHECK (
      url_oferta IS NULL
      OR (url_oferta ~* '^https?://[^[:space:]]+$' AND char_length(url_oferta) <= 2048)
    );

COMMENT ON COLUMN public.producto_establecimiento.url_oferta IS
  'Enlace a la oferta en la tienda. Opcional; solo http o https.';

-- 2. Fecha del ultimo cambio de precio, disponibilidad o enlace.
ALTER TABLE public.producto_establecimiento
  ADD COLUMN IF NOT EXISTS fecha_actualizacion_precio TIMESTAMP WITHOUT TIME ZONE
    NOT NULL DEFAULT CURRENT_TIMESTAMP;

COMMENT ON COLUMN public.producto_establecimiento.fecha_actualizacion_precio IS
  'Ultima vez que cambiaron el precio, la disponibilidad o el enlace de la oferta. La mantiene un trigger.';

-- 3. La fecha la decide la base de datos, no el cliente.
CREATE OR REPLACE FUNCTION public.fn_actualizar_fecha_precio_oferta()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $function$
BEGIN
    IF TG_OP = 'INSERT'
       OR NEW.precio IS DISTINCT FROM OLD.precio
       OR NEW.disponibilidad IS DISTINCT FROM OLD.disponibilidad
       OR NEW.url_oferta IS DISTINCT FROM OLD.url_oferta THEN
        NEW.fecha_actualizacion_precio := CURRENT_TIMESTAMP;
    ELSE
        NEW.fecha_actualizacion_precio := OLD.fecha_actualizacion_precio;
    END IF;
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_actualizar_fecha_precio_oferta ON public.producto_establecimiento;
CREATE TRIGGER trg_actualizar_fecha_precio_oferta
BEFORE INSERT OR UPDATE ON public.producto_establecimiento
FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_fecha_precio_oferta();

INSERT INTO public.schema_version (version, descripcion)
VALUES (
  '022_enlace_y_fecha_ofertas',
  'Agrega url_oferta y fecha_actualizacion_precio a producto_establecimiento, con trigger que mantiene la fecha'
)
ON CONFLICT (version) DO NOTHING;

COMMIT;
