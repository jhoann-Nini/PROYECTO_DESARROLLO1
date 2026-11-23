-- ============================================================
-- MIGRACION 026: APELACIONES DE DECISIONES DE MODERACION
-- Caso 6 (moderacion inteligente), prioridad media
-- ============================================================
-- Problema:
--   Un autor no podia impugnar un rechazo o un ocultamiento, y esas
--   decisiones cuentan como faltas para la reincidencia. El historial
--   resena_moderacion_auditoria es append-only: no se puede borrar una
--   decision equivocada, hay que registrar que se anulo.
--
-- Cambios:
--   1. Tabla apelacion: una fila por apelacion, con la decision apelada
--      (id_auditoria), el autor, su motivo y el estado
--      PENDIENTE -> ACEPTADA | RECHAZADA. Al resolverse se rellenan una sola
--      vez el moderador, la respuesta y la fecha.
--   2. Validacion al insertar: solo decisiones RECHAZAR u OCULTAR, solo el
--      autor de la resena, resena no eliminada, dentro de 15 dias desde la
--      decision, estado inicial PENDIENTE. Una apelacion por decision
--      (restriccion unica).
--   3. Validacion al actualizar: solo se resuelve desde PENDIENTE; los datos
--      de la solicitud no cambian; quien resuelve tiene rol activo de
--      moderador o administrador y no es el autor ni el moderador de la
--      decision original.
--   4. Se prohiben DELETE y TRUNCATE.
--
-- Al aceptar, el backend revierte la decision en la misma transaccion con
-- los eventos que ya existen (APROBAR para un rechazo, RESTAURAR para un
-- ocultamiento); los triggers de la 020 y la 024 validan esas transiciones.
-- La reincidencia deja de contar las decisiones con apelacion ACEPTADA.
--
-- Todas las funciones fijan search_path = pg_catalog (criterio de la 019).
-- La tabla no se otorga a anon ni authenticated (criterio de la 023).
--
-- Requisitos previos: 024 aplicada.
-- Despliegue: el backend que usa la entidad Apelacion necesita esta tabla
-- (ddl-auto=validate). Aplicar ANTES de desplegar ese backend.
-- ============================================================

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.schema_version
        WHERE version = '024_texto_revisado_y_suspension_cuentas'
    ) THEN
        RAISE EXCEPTION 'Preflight fallido: la migracion 024 debe estar aplicada antes de 026.';
    END IF;
END $$;

-- 1. Tabla.
CREATE TABLE IF NOT EXISTS public.apelacion (
  id_apelacion     BIGSERIAL PRIMARY KEY,
  id_auditoria     BIGINT NOT NULL,
  id_autor         BIGINT NOT NULL,
  motivo           TEXT NOT NULL,
  estado           VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
  fecha_solicitud  TIMESTAMP NOT NULL DEFAULT now(),
  id_moderador     BIGINT NULL,
  respuesta        TEXT NULL,
  fecha_resolucion TIMESTAMP NULL,
  CONSTRAINT uk_apelacion_auditoria UNIQUE (id_auditoria),
  CONSTRAINT fk_apelacion_auditoria FOREIGN KEY (id_auditoria)
    REFERENCES public.resena_moderacion_auditoria (id_auditoria),
  CONSTRAINT fk_apelacion_autor FOREIGN KEY (id_autor)
    REFERENCES public.usuario (id_usuario),
  CONSTRAINT fk_apelacion_moderador FOREIGN KEY (id_moderador)
    REFERENCES public.usuario (id_usuario),
  CONSTRAINT chk_apelacion_estado
    CHECK (estado IN ('PENDIENTE', 'ACEPTADA', 'RECHAZADA')),
  CONSTRAINT chk_apelacion_motivo
    CHECK (btrim(motivo) <> '' AND char_length(motivo) <= 1000),
  CONSTRAINT chk_apelacion_resolucion CHECK (
    (estado = 'PENDIENTE' AND id_moderador IS NULL AND respuesta IS NULL AND fecha_resolucion IS NULL)
    OR (estado <> 'PENDIENTE' AND id_moderador IS NOT NULL AND fecha_resolucion IS NOT NULL
        AND respuesta IS NOT NULL AND btrim(respuesta) <> '' AND char_length(respuesta) <= 1000))
);

COMMENT ON TABLE public.apelacion IS
  'Apelaciones de decisiones de moderacion (RECHAZAR u OCULTAR). Una por decision; inmutable una vez resuelta.';

CREATE INDEX IF NOT EXISTS idx_apelacion_estado_fecha
  ON public.apelacion (estado, fecha_solicitud);
CREATE INDEX IF NOT EXISTS idx_apelacion_autor
  ON public.apelacion (id_autor);

-- 2. Validacion al insertar.
CREATE OR REPLACE FUNCTION public.fn_validar_insert_apelacion()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
DECLARE
    v_accion       VARCHAR(20);
    v_fecha_evento TIMESTAMP;
    v_autor        BIGINT;
    v_activa       BOOLEAN;
BEGIN
    SELECT a.accion, a.fecha_evento, r.id_usuario, r.estado
      INTO v_accion, v_fecha_evento, v_autor, v_activa
      FROM public.resena_moderacion_auditoria a
      JOIN public.resena r ON r.id_resena = a.id_resena
     WHERE a.id_auditoria = NEW.id_auditoria;

    IF v_accion IS NULL THEN
        RAISE EXCEPTION 'No existe la decision de moderacion %.', NEW.id_auditoria;
    END IF;
    IF v_accion NOT IN ('RECHAZAR', 'OCULTAR') THEN
        RAISE EXCEPTION 'Solo se pueden apelar decisiones RECHAZAR u OCULTAR.';
    END IF;
    IF NEW.id_autor IS DISTINCT FROM v_autor THEN
        RAISE EXCEPTION 'Solo el autor de la resena puede apelar la decision.';
    END IF;
    IF v_activa IS DISTINCT FROM TRUE THEN
        RAISE EXCEPTION 'No se puede apelar una decision sobre una resena eliminada.';
    END IF;
    IF NEW.estado IS DISTINCT FROM 'PENDIENTE' THEN
        RAISE EXCEPTION 'Una apelacion se crea en estado PENDIENTE.';
    END IF;

    NEW.fecha_solicitud := now();
    IF NEW.fecha_solicitud > v_fecha_evento + interval '15 days' THEN
        RAISE EXCEPTION 'El plazo de 15 dias para apelar esta decision ya vencio.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_insert_apelacion ON public.apelacion;
CREATE TRIGGER trg_validar_insert_apelacion
BEFORE INSERT ON public.apelacion
FOR EACH ROW EXECUTE FUNCTION public.fn_validar_insert_apelacion();

-- 3. Validacion al resolver.
CREATE OR REPLACE FUNCTION public.fn_validar_update_apelacion()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
DECLARE
    v_moderador_original BIGINT;
BEGIN
    IF OLD.estado IS DISTINCT FROM 'PENDIENTE' THEN
        RAISE EXCEPTION 'La apelacion % ya fue resuelta.', OLD.id_apelacion;
    END IF;
    IF NEW.id_auditoria IS DISTINCT FROM OLD.id_auditoria
       OR NEW.id_autor IS DISTINCT FROM OLD.id_autor
       OR NEW.motivo IS DISTINCT FROM OLD.motivo
       OR NEW.fecha_solicitud IS DISTINCT FROM OLD.fecha_solicitud THEN
        RAISE EXCEPTION 'Los datos de la solicitud de apelacion no se pueden modificar.';
    END IF;
    IF NEW.estado NOT IN ('ACEPTADA', 'RECHAZADA') THEN
        RAISE EXCEPTION 'Una apelacion solo se resuelve como ACEPTADA o RECHAZADA.';
    END IF;

    IF NOT public.fn_usuario_tiene_rol_activo(NEW.id_moderador, ARRAY['moderador', 'administrador']) THEN
        RAISE EXCEPTION 'Quien resuelve una apelacion debe tener cuenta y rol activo de moderacion.';
    END IF;
    IF NEW.id_moderador = OLD.id_autor THEN
        RAISE EXCEPTION 'No se puede resolver una apelacion sobre una resena propia.';
    END IF;

    SELECT id_moderador INTO v_moderador_original
      FROM public.resena_moderacion_auditoria
     WHERE id_auditoria = OLD.id_auditoria;
    IF NEW.id_moderador = v_moderador_original THEN
        RAISE EXCEPTION 'El moderador de la decision original no puede resolver su apelacion.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_update_apelacion ON public.apelacion;
CREATE TRIGGER trg_validar_update_apelacion
BEFORE UPDATE ON public.apelacion
FOR EACH ROW EXECUTE FUNCTION public.fn_validar_update_apelacion();

-- 4. Sin borrados.
CREATE OR REPLACE FUNCTION public.fn_proteger_apelacion()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
    RAISE EXCEPTION 'Las apelaciones no se pueden borrar.';
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_delete_apelacion ON public.apelacion;
CREATE TRIGGER trg_proteger_delete_apelacion
BEFORE DELETE ON public.apelacion
FOR EACH ROW EXECUTE FUNCTION public.fn_proteger_apelacion();

DROP TRIGGER IF EXISTS trg_proteger_truncate_apelacion ON public.apelacion;
CREATE TRIGGER trg_proteger_truncate_apelacion
BEFORE TRUNCATE ON public.apelacion
FOR EACH STATEMENT EXECUTE FUNCTION public.fn_proteger_apelacion();

-- 5. Sin acceso desde la API publica de Supabase.
REVOKE ALL ON TABLE public.apelacion FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.apelacion_id_apelacion_seq FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_validar_insert_apelacion() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_validar_update_apelacion() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_proteger_apelacion() FROM PUBLIC, anon, authenticated;

INSERT INTO public.schema_version (version, descripcion)
VALUES (
  '026_apelaciones',
  'Apelaciones de decisiones de moderacion con reglas en PostgreSQL'
)
ON CONFLICT (version) DO NOTHING;

COMMIT;
