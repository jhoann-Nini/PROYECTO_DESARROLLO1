-- ============================================================
-- MIGRACION 020: REVISION HUMANA DE RESENAS RETENIDAS
-- Fase 1 de la auditoria (hallazgo H-01)
-- ============================================================
-- Problema: la migracion 012 introdujo estado_moderacion = 'PENDIENTE'
-- para comentarios retenidos por el filtro automatico, pero ninguna accion
-- permitia salir de ese estado ni dejaba registro de quien lo decidia.
--
-- Cambios:
--   1. resena.estado_moderacion admite 'RECHAZADA'.
--   2. resena_moderacion_auditoria admite las acciones 'APROBAR' y 'RECHAZAR'.
--   3. El trigger de insercion de auditoria valida que APROBAR/RECHAZAR solo
--      se registren sobre resenas PENDIENTE (OCULTAR/RESTAURAR sin cambios).
--   4. El trigger diferido de estado final valida el resultado de cada accion.
--   5. Nuevo trigger diferido: salir de PENDIENTE exige un evento APROBAR o
--      RECHAZAR en la misma transaccion. Entrar en PENDIENTE (edicion del
--      autor) no requiere auditoria. RECHAZADA -> PUBLICADA directo se prohibe.
--
-- Todas las funciones fijan search_path = pg_catalog (criterio de la 019);
-- CREATE OR REPLACE descarta la configuracion previa, por eso se repite.
--
-- Antes de ejecutar en Supabase: confirmar en public.schema_version que
-- 012 y 019 estan aplicadas. No requiere migracion de datos: las resenas
-- existentes conservan su estado.
-- ============================================================

BEGIN;

-- 1. Nuevo estado de moderacion de contenido.
ALTER TABLE public.resena
  DROP CONSTRAINT IF EXISTS chk_resena_estado_moderacion;

ALTER TABLE public.resena
  ADD CONSTRAINT chk_resena_estado_moderacion
    CHECK (estado_moderacion IN ('PUBLICADA', 'PENDIENTE', 'RECHAZADA'));

-- 2. Nuevas acciones de auditoria.
ALTER TABLE public.resena_moderacion_auditoria
  DROP CONSTRAINT IF EXISTS chk_resena_moderacion_auditoria_accion;

ALTER TABLE public.resena_moderacion_auditoria
  ADD CONSTRAINT chk_resena_moderacion_auditoria_accion
    CHECK (accion IN ('OCULTAR', 'RESTAURAR', 'APROBAR', 'RECHAZAR'));

-- 3. Validacion al insertar un evento de auditoria.
CREATE OR REPLACE FUNCTION public.fn_validar_insert_resena_moderacion_auditoria()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $function$
DECLARE
    v_oculta BOOLEAN;
    v_autor BIGINT;
    v_estado_moderacion VARCHAR(20);
BEGIN
    IF NOT public.fn_usuario_tiene_rol_activo(NEW.id_moderador, ARRAY['moderador', 'administrador']) THEN
        RAISE EXCEPTION 'El actor de moderacion debe tener cuenta y rol activo.';
    END IF;

    SELECT oculta_por_moderacion, id_usuario, estado_moderacion
      INTO v_oculta, v_autor, v_estado_moderacion
    FROM public.resena
    WHERE id_resena = NEW.id_resena
    FOR KEY SHARE;

    IF NOT FOUND OR v_autor = NEW.id_moderador THEN
        RAISE EXCEPTION 'No existe la resena o el actor tiene conflicto de interes.';
    END IF;

    IF (NEW.accion = 'OCULTAR' AND v_oculta IS DISTINCT FROM FALSE)
       OR (NEW.accion = 'RESTAURAR' AND v_oculta IS DISTINCT FROM TRUE) THEN
        RAISE EXCEPTION 'La accion de auditoria no coincide con el estado previo del ocultamiento manual.';
    END IF;

    IF NEW.accion IN ('APROBAR', 'RECHAZAR')
       AND v_estado_moderacion IS DISTINCT FROM 'PENDIENTE' THEN
        RAISE EXCEPTION 'Solo se puede aprobar o rechazar una resena pendiente de revision.';
    END IF;

    RETURN NEW;
END;
$function$;

-- 4. Validacion diferida del estado final tras cada evento.
CREATE OR REPLACE FUNCTION public.fn_exigir_estado_final_evento_resena()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $function$
DECLARE
    v_oculta BOOLEAN;
    v_estado_moderacion VARCHAR(20);
BEGIN
    SELECT oculta_por_moderacion, estado_moderacion
      INTO v_oculta, v_estado_moderacion
    FROM public.resena
    WHERE id_resena = NEW.id_resena;

    IF NEW.accion IN ('OCULTAR', 'RESTAURAR') THEN
        IF v_oculta IS DISTINCT FROM (NEW.accion = 'OCULTAR') THEN
            RAISE EXCEPTION 'El evento de auditoria no coincide con el ocultamiento manual final de la resena %.', NEW.id_resena;
        END IF;
    ELSIF NEW.accion = 'APROBAR' THEN
        IF v_estado_moderacion IS DISTINCT FROM 'PUBLICADA' THEN
            RAISE EXCEPTION 'El evento APROBAR no coincide con el estado final de la resena %.', NEW.id_resena;
        END IF;
    ELSIF NEW.accion = 'RECHAZAR' THEN
        IF v_estado_moderacion IS DISTINCT FROM 'RECHAZADA' THEN
            RAISE EXCEPTION 'El evento RECHAZAR no coincide con el estado final de la resena %.', NEW.id_resena;
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;

-- 5. Salir de PENDIENTE exige auditoria en la misma transaccion.
CREATE OR REPLACE FUNCTION public.fn_exigir_auditoria_estado_moderacion_resena()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $function$
DECLARE
    v_accion VARCHAR(20);
BEGIN
    IF OLD.estado_moderacion IS NOT DISTINCT FROM NEW.estado_moderacion
       OR NEW.estado_moderacion = 'PENDIENTE' THEN
        RETURN NEW;
    END IF;

    IF OLD.estado_moderacion = 'RECHAZADA' THEN
        RAISE EXCEPTION 'La resena % fue rechazada; debe volver a revision antes de publicarse.', NEW.id_resena;
    END IF;

    IF OLD.estado_moderacion = 'PENDIENTE' THEN
        v_accion := CASE NEW.estado_moderacion
            WHEN 'PUBLICADA' THEN 'APROBAR'
            WHEN 'RECHAZADA' THEN 'RECHAZAR'
        END;

        IF NOT EXISTS (
            SELECT 1
            FROM public.resena_moderacion_auditoria a
            WHERE a.id_resena = NEW.id_resena
              AND a.accion = v_accion
              AND a.id_transaccion = txid_current()
        ) THEN
            RAISE EXCEPTION 'La salida de revision de la resena % no tiene auditoria % en la misma transaccion.', NEW.id_resena, v_accion;
        END IF;
        RETURN NEW;
    END IF;

    -- PUBLICADA -> RECHAZADA sin pasar por revision.
    RAISE EXCEPTION 'Transicion de moderacion no permitida para la resena %: % -> %.',
        NEW.id_resena, OLD.estado_moderacion, NEW.estado_moderacion;
END;
$function$;

DROP TRIGGER IF EXISTS trg_exigir_auditoria_estado_moderacion_resena ON public.resena;
CREATE CONSTRAINT TRIGGER trg_exigir_auditoria_estado_moderacion_resena
AFTER UPDATE OF estado_moderacion ON public.resena
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.fn_exigir_auditoria_estado_moderacion_resena();

INSERT INTO public.schema_version (version, descripcion)
VALUES (
  '020_revision_resenas_moderacion_automatica',
  'Permite aprobar o rechazar con auditoria las resenas retenidas por el filtro automatico'
)
ON CONFLICT (version) DO NOTHING;

COMMIT;
