-- ============================================================
-- MIGRACION 024: TEXTO REVISADO EN LA AUDITORIA Y SUSPENSION DE CUENTAS
-- Caso 6 (moderacion inteligente), prioridad 1
-- ============================================================
-- Problema:
--   * resena_moderacion_auditoria guardaba quien decidio y por que, pero no
--     el texto que se reviso. Si el autor editaba la resena despues, no
--     quedaba constancia de lo que el moderador habia visto.
--   * El backend rechaza cuentas con usuario.estado = false, pero no existia
--     forma de suspender una cuenta ni registro de quien lo hacia.
--
-- Cambios:
--   1. resena_moderacion_auditoria.comentario_revisado (TEXT). El trigger de
--      insercion lo rellena con el comentario actual de la resena: el texto
--      queda registrado aunque la aplicacion no lo envie. Las filas
--      anteriores quedan en NULL (la tabla es append-only).
--   2. Tabla append-only auditoria_usuario_estado: administrador, estado
--      anterior y nuevo, motivo obligatorio, transaccion y fecha.
--   3. Validacion al insertar: actor administrador activo, no puede
--      suspenderse a si mismo ni suspender a un administrador activo, y el
--      estado anterior debe coincidir con el actual.
--   4. Trigger diferido en usuario: cambiar estado exige su evento en la
--      misma transaccion.
--
-- Todas las funciones fijan search_path = pg_catalog (criterio de la 019).
-- La tabla nueva no se otorga a anon ni authenticated (criterio de la 023).
--
-- Requisitos previos: 020 aplicada (se reemplaza su funcion de validacion).
-- ============================================================

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.schema_version
        WHERE version = '020_revision_resenas_moderacion_automatica'
    ) THEN
        RAISE EXCEPTION 'Preflight fallido: la migracion 020 debe estar aplicada antes de 024.';
    END IF;
END $$;

-- 1. Texto revisado en cada evento de moderacion de resenas.
ALTER TABLE public.resena_moderacion_auditoria
  ADD COLUMN IF NOT EXISTS comentario_revisado TEXT NULL;

COMMENT ON COLUMN public.resena_moderacion_auditoria.comentario_revisado IS
  'Comentario de la resena en el momento de la decision. Lo rellena el trigger de insercion.';

-- Misma validacion que la 020, mas la copia del comentario.
CREATE OR REPLACE FUNCTION public.fn_validar_insert_resena_moderacion_auditoria()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $function$
DECLARE
    v_oculta BOOLEAN;
    v_autor BIGINT;
    v_estado_moderacion VARCHAR(20);
    v_comentario TEXT;
BEGIN
    IF NOT public.fn_usuario_tiene_rol_activo(NEW.id_moderador, ARRAY['moderador', 'administrador']) THEN
        RAISE EXCEPTION 'El actor de moderacion debe tener cuenta y rol activo.';
    END IF;

    SELECT oculta_por_moderacion, id_usuario, estado_moderacion, comentario
      INTO v_oculta, v_autor, v_estado_moderacion, v_comentario
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

    -- El texto revisado lo decide la base de datos, no el cliente.
    NEW.comentario_revisado := v_comentario;
    RETURN NEW;
END;
$function$;

-- 2. Historial append-only de suspensiones y reactivaciones.
CREATE TABLE IF NOT EXISTS public.auditoria_usuario_estado (
  id_auditoria     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_usuario       BIGINT  NOT NULL,
  id_administrador BIGINT  NOT NULL,
  estado_anterior  BOOLEAN NOT NULL,
  estado_nuevo     BOOLEAN NOT NULL,
  motivo           TEXT    NOT NULL,
  id_transaccion   BIGINT  NOT NULL DEFAULT txid_current(),
  fecha_evento     TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_auditoria_usuario_estado_usuario
    FOREIGN KEY (id_usuario) REFERENCES public.usuario (id_usuario) ON DELETE RESTRICT,
  CONSTRAINT fk_auditoria_usuario_estado_administrador
    FOREIGN KEY (id_administrador) REFERENCES public.usuario (id_usuario) ON DELETE RESTRICT,
  CONSTRAINT chk_auditoria_usuario_estado_cambio
    CHECK (estado_anterior <> estado_nuevo),
  CONSTRAINT chk_auditoria_usuario_estado_motivo
    CHECK (btrim(motivo) <> '' AND char_length(motivo) <= 2000)
);

CREATE INDEX IF NOT EXISTS idx_auditoria_usuario_estado_usuario_fecha
  ON public.auditoria_usuario_estado (id_usuario, fecha_evento DESC);

ALTER TABLE public.auditoria_usuario_estado ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.auditoria_usuario_estado FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.fn_proteger_inmutabilidad_auditoria_usuario_estado()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $function$
BEGIN
    RAISE EXCEPTION
        'Operación denegada: auditoria_usuario_estado es append-only; no se permiten UPDATE, DELETE ni TRUNCATE.';
END;
$function$;

DROP TRIGGER IF EXISTS trg_proteger_inmutabilidad_auditoria_usuario_estado
    ON public.auditoria_usuario_estado;
CREATE TRIGGER trg_proteger_inmutabilidad_auditoria_usuario_estado
BEFORE UPDATE OR DELETE ON public.auditoria_usuario_estado
FOR EACH ROW EXECUTE FUNCTION public.fn_proteger_inmutabilidad_auditoria_usuario_estado();

DROP TRIGGER IF EXISTS trg_proteger_truncate_auditoria_usuario_estado
    ON public.auditoria_usuario_estado;
CREATE TRIGGER trg_proteger_truncate_auditoria_usuario_estado
BEFORE TRUNCATE ON public.auditoria_usuario_estado
FOR EACH STATEMENT EXECUTE FUNCTION public.fn_proteger_inmutabilidad_auditoria_usuario_estado();

-- 3. Validacion al insertar un evento.
CREATE OR REPLACE FUNCTION public.fn_validar_insert_auditoria_usuario_estado()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $function$
DECLARE
    v_estado BOOLEAN;
BEGIN
    IF NOT public.fn_usuario_tiene_rol_activo(NEW.id_administrador, ARRAY['administrador']) THEN
        RAISE EXCEPTION 'Solo un administrador con cuenta y rol activo puede cambiar el estado de una cuenta.';
    END IF;

    IF NEW.id_usuario = NEW.id_administrador THEN
        RAISE EXCEPTION 'Un administrador no puede cambiar el estado de su propia cuenta.';
    END IF;

    IF NEW.estado_nuevo = FALSE
       AND public.fn_usuario_tiene_rol_activo(NEW.id_usuario, ARRAY['administrador']) THEN
        RAISE EXCEPTION 'No se puede suspender a un administrador activo; primero retira su rol.';
    END IF;

    SELECT estado INTO v_estado
    FROM public.usuario
    WHERE id_usuario = NEW.id_usuario
    FOR KEY SHARE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No existe la cuenta %.', NEW.id_usuario;
    END IF;

    IF v_estado IS DISTINCT FROM NEW.estado_anterior THEN
        RAISE EXCEPTION 'El estado anterior del evento no coincide con el estado actual de la cuenta.';
    END IF;

    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_validar_insert_auditoria_usuario_estado
    ON public.auditoria_usuario_estado;
CREATE TRIGGER trg_validar_insert_auditoria_usuario_estado
BEFORE INSERT ON public.auditoria_usuario_estado
FOR EACH ROW EXECUTE FUNCTION public.fn_validar_insert_auditoria_usuario_estado();

-- 4. Cambiar usuario.estado exige su evento en la misma transaccion.
CREATE OR REPLACE FUNCTION public.fn_exigir_auditoria_estado_usuario()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $function$
BEGIN
    IF OLD.estado IS DISTINCT FROM NEW.estado
       AND NOT EXISTS (
           SELECT 1
           FROM public.auditoria_usuario_estado a
           WHERE a.id_usuario = NEW.id_usuario
             AND a.estado_anterior = OLD.estado
             AND a.estado_nuevo = NEW.estado
             AND a.id_transaccion = txid_current()
       ) THEN
        RAISE EXCEPTION 'El cambio de estado de la cuenta % no tiene auditoria en la misma transaccion.',
            NEW.id_usuario;
    END IF;
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_exigir_auditoria_estado_usuario ON public.usuario;
CREATE CONSTRAINT TRIGGER trg_exigir_auditoria_estado_usuario
AFTER UPDATE ON public.usuario
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.fn_exigir_auditoria_estado_usuario();

-- Las funciones nuevas no son ejecutables por la API publica (criterio de la 023).
REVOKE EXECUTE ON FUNCTION public.fn_proteger_inmutabilidad_auditoria_usuario_estado() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_validar_insert_auditoria_usuario_estado() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_exigir_auditoria_estado_usuario() FROM PUBLIC, anon, authenticated;

INSERT INTO public.schema_version (version, descripcion)
VALUES (
  '024_texto_revisado_y_suspension_cuentas',
  'Guarda el texto revisado en cada decision de moderacion y agrega la suspension auditada de cuentas'
)
ON CONFLICT (version) DO NOTHING;

COMMIT;
