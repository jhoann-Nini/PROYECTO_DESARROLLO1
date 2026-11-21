-- ============================================================
-- MIGRACION 021: MODERACION DE REPORTES DE OFERTAS
-- Fase 2 de la auditoria (hallazgos H-05 y H-07)
-- ============================================================
-- Problema: la migracion 018 creo reporte_oferta, pero no habia forma de
-- revisar los reportes, ni registro de quien los resolvia, ni control de
-- duplicados: un usuario podia reportar la misma oferta sin limite.
--
-- Cambios:
--   0. Registra en schema_version la 017 y la 018. Sus estructuras ya
--      existen en Supabase (verificado el 2026-11-20), pero sus filas no
--      quedaron registradas. Solo inserta lo que falta.
--   1. Indice unico parcial: un usuario solo puede tener un reporte abierto
--      (PENDIENTE o EN_REVISION) sobre la misma oferta.
--   2. Tabla append-only reporte_oferta_historial con cada cambio de estado.
--   3. Validacion al insertar en el historial: actor con rol activo, sin
--      conflicto de interes y estado anterior igual al actual.
--   4. Trigger BEFORE UPDATE en reporte_oferta: transiciones permitidas,
--      columnas de origen inmutables y fecha_actualizacion automatica.
--   5. Trigger diferido: cada cambio de estado exige su evento de historial
--      en la misma transaccion.
--
-- Transiciones: PENDIENTE -> EN_REVISION -> ACEPTADO | RECHAZADO.
-- ACEPTADO y RECHAZADO son finales.
--
-- Todas las funciones fijan search_path = pg_catalog (criterio de la 019).
--
-- Antes de ejecutar en Supabase: confirmar que reporte_oferta existe y que
-- la 020 esta aplicada. No migra datos: el indice unico se crea sobre una
-- tabla que hoy esta vacia; si hubiera duplicados abiertos, el CREATE
-- UNIQUE INDEX fallaria y la transaccion se revertiria completa.
-- ============================================================

BEGIN;

-- 0. Registro de migraciones aplicadas sin fila en schema_version.
INSERT INTO public.schema_version (version, descripcion)
VALUES
  ('017_verificacion_establecimientos',
   'Agrega el estado de verificación administrativa a los establecimientos'),
  ('018_reportes_ofertas',
   'Crea la tabla para reportes de precios y enlaces incorrectos de ofertas')
ON CONFLICT (version) DO NOTHING;

-- 1. Un solo reporte abierto por usuario y oferta.
CREATE UNIQUE INDEX IF NOT EXISTS uq_reporte_oferta_abierto_usuario
  ON public.reporte_oferta (id_usuario, id_producto, id_establecimiento)
  WHERE estado IN ('PENDIENTE', 'EN_REVISION');

-- Apoya el limite de reportes por hora.
CREATE INDEX IF NOT EXISTS idx_reporte_oferta_usuario_fecha
  ON public.reporte_oferta (id_usuario, fecha_creacion DESC);

-- 2. Historial append-only.
CREATE TABLE IF NOT EXISTS public.reporte_oferta_historial (
  id_historial    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_reporte      BIGINT      NOT NULL,
  id_moderador    BIGINT      NOT NULL,
  estado_anterior VARCHAR(20) NOT NULL,
  estado_nuevo    VARCHAR(20) NOT NULL,
  justificacion   TEXT        NULL,
  id_transaccion  BIGINT      NOT NULL DEFAULT txid_current(),
  fecha_evento    TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_reporte_oferta_historial_reporte
    FOREIGN KEY (id_reporte) REFERENCES public.reporte_oferta (id_reporte) ON DELETE RESTRICT,
  CONSTRAINT fk_reporte_oferta_historial_moderador
    FOREIGN KEY (id_moderador) REFERENCES public.usuario (id_usuario) ON DELETE RESTRICT,
  CONSTRAINT chk_reporte_oferta_historial_transicion
    CHECK (
      (estado_anterior = 'PENDIENTE' AND estado_nuevo = 'EN_REVISION')
      OR
      (estado_anterior = 'EN_REVISION' AND estado_nuevo IN ('ACEPTADO', 'RECHAZADO'))
    ),
  CONSTRAINT chk_reporte_oferta_historial_justificacion_rechazo
    CHECK (
      estado_nuevo <> 'RECHAZADO'
      OR (justificacion IS NOT NULL AND btrim(justificacion) <> '')
    ),
  CONSTRAINT chk_reporte_oferta_historial_justificacion_longitud
    CHECK (justificacion IS NULL OR char_length(justificacion) <= 2000)
);

CREATE INDEX IF NOT EXISTS idx_reporte_oferta_historial_reporte_fecha
  ON public.reporte_oferta_historial (id_reporte, fecha_evento DESC);

CREATE INDEX IF NOT EXISTS idx_reporte_oferta_historial_moderador_fecha
  ON public.reporte_oferta_historial (id_moderador, fecha_evento DESC);

-- Mismo criterio que reporte_oferta (018): RLS activo y sin politicas.
-- El backend accede con el rol propietario; la API publica no puede leerla.
ALTER TABLE public.reporte_oferta_historial ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.fn_proteger_inmutabilidad_reporte_oferta_historial()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $function$
BEGIN
    RAISE EXCEPTION
        'Operación denegada: reporte_oferta_historial es append-only; no se permiten UPDATE ni DELETE.';
END;
$function$;

DROP TRIGGER IF EXISTS trg_proteger_inmutabilidad_reporte_oferta_historial
    ON public.reporte_oferta_historial;
CREATE TRIGGER trg_proteger_inmutabilidad_reporte_oferta_historial
BEFORE UPDATE OR DELETE ON public.reporte_oferta_historial
FOR EACH ROW EXECUTE FUNCTION public.fn_proteger_inmutabilidad_reporte_oferta_historial();

CREATE OR REPLACE FUNCTION public.fn_proteger_truncate_reporte_oferta_historial()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $function$
BEGIN
    RAISE EXCEPTION
        'Operación denegada: reporte_oferta_historial no puede ser truncada.';
END;
$function$;

DROP TRIGGER IF EXISTS trg_proteger_truncate_reporte_oferta_historial
    ON public.reporte_oferta_historial;
CREATE TRIGGER trg_proteger_truncate_reporte_oferta_historial
BEFORE TRUNCATE ON public.reporte_oferta_historial
FOR EACH STATEMENT EXECUTE FUNCTION public.fn_proteger_truncate_reporte_oferta_historial();

-- 3. Validacion al insertar un evento.
CREATE OR REPLACE FUNCTION public.fn_validar_insert_reporte_oferta_historial()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $function$
DECLARE
    v_estado VARCHAR(20);
    v_autor BIGINT;
BEGIN
    IF NOT public.fn_usuario_tiene_rol_activo(NEW.id_moderador, ARRAY['moderador', 'administrador']) THEN
        RAISE EXCEPTION 'El actor de moderacion debe tener cuenta y rol activo.';
    END IF;

    SELECT estado, id_usuario INTO v_estado, v_autor
    FROM public.reporte_oferta
    WHERE id_reporte = NEW.id_reporte
    FOR KEY SHARE;

    IF NOT FOUND OR v_autor = NEW.id_moderador THEN
        RAISE EXCEPTION 'No existe el reporte o el actor tiene conflicto de interes.';
    END IF;

    IF v_estado IS DISTINCT FROM NEW.estado_anterior THEN
        RAISE EXCEPTION 'El estado anterior del evento no coincide con el estado actual del reporte.';
    END IF;

    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_validar_insert_reporte_oferta_historial
    ON public.reporte_oferta_historial;
CREATE TRIGGER trg_validar_insert_reporte_oferta_historial
BEFORE INSERT ON public.reporte_oferta_historial
FOR EACH ROW EXECUTE FUNCTION public.fn_validar_insert_reporte_oferta_historial();

-- 4. Transiciones, columnas inmutables y fecha_actualizacion.
CREATE OR REPLACE FUNCTION public.fn_validar_update_reporte_oferta()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $function$
BEGIN
    IF NEW.id_producto IS DISTINCT FROM OLD.id_producto
       OR NEW.id_establecimiento IS DISTINCT FROM OLD.id_establecimiento
       OR NEW.id_usuario IS DISTINCT FROM OLD.id_usuario
       OR NEW.motivo IS DISTINCT FROM OLD.motivo
       OR NEW.descripcion IS DISTINCT FROM OLD.descripcion
       OR NEW.fecha_creacion IS DISTINCT FROM OLD.fecha_creacion THEN
        RAISE EXCEPTION 'Solo el estado del reporte de oferta % puede cambiar.', OLD.id_reporte;
    END IF;

    IF OLD.estado IS DISTINCT FROM NEW.estado AND NOT (
        (OLD.estado = 'PENDIENTE' AND NEW.estado = 'EN_REVISION')
        OR (OLD.estado = 'EN_REVISION' AND NEW.estado IN ('ACEPTADO', 'RECHAZADO'))
    ) THEN
        RAISE EXCEPTION 'Transicion no permitida para el reporte de oferta %: % -> %.',
            OLD.id_reporte, OLD.estado, NEW.estado;
    END IF;

    NEW.fecha_actualizacion := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_validar_update_reporte_oferta ON public.reporte_oferta;
CREATE TRIGGER trg_validar_update_reporte_oferta
BEFORE UPDATE ON public.reporte_oferta
FOR EACH ROW EXECUTE FUNCTION public.fn_validar_update_reporte_oferta();

-- 5. Cada cambio de estado exige su evento en la misma transaccion.
CREATE OR REPLACE FUNCTION public.fn_exigir_historial_transicion_reporte_oferta()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $function$
BEGIN
    IF OLD.estado IS DISTINCT FROM NEW.estado
       AND NOT EXISTS (
           SELECT 1
           FROM public.reporte_oferta_historial h
           WHERE h.id_reporte = NEW.id_reporte
             AND h.estado_anterior = OLD.estado
             AND h.estado_nuevo = NEW.estado
             AND h.id_transaccion = txid_current()
       ) THEN
        RAISE EXCEPTION 'La transicion del reporte de oferta % no tiene historial en la misma transaccion.',
            NEW.id_reporte;
    END IF;
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_exigir_historial_transicion_reporte_oferta ON public.reporte_oferta;
CREATE CONSTRAINT TRIGGER trg_exigir_historial_transicion_reporte_oferta
AFTER UPDATE ON public.reporte_oferta
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.fn_exigir_historial_transicion_reporte_oferta();

INSERT INTO public.schema_version (version, descripcion)
VALUES (
  '021_moderacion_reportes_ofertas',
  'Moderacion de reportes de ofertas: historial append-only, transiciones validadas y un reporte abierto por usuario y oferta'
)
ON CONFLICT (version) DO NOTHING;

COMMIT;
