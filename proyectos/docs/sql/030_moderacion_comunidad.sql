-- ============================================================
-- MIGRACION 030: MODERACION Y REPORTES DE LA COMUNIDAD
-- Comunidad, fase 2 (especificacion: docs/superpowers/specs/2026-11-24-comunidad-design.md)
-- ============================================================
-- Mismo diseno que las resenas (006, 020, 021 y 024), sobre las tablas de
-- la 029:
--   1. moderacion_comunidad_auditoria: cada decision de un moderador, de
--      solo insercion, con motivo y texto revisado (RN-11). Destino
--      exclusivo: una publicacion o una respuesta.
--      - Al insertar: moderador con rol activo, que no sea el autor (RN-16),
--        y accion coherente con el estado previo del contenido.
--      - Al confirmar: el contenido quedo en el estado que dice la accion.
--   2. Triggers diferidos en publicacion_comunidad y respuesta_comunidad:
--      salir de PENDIENTE, ocultar o restaurar, eliminar por un moderador
--      y cerrar o reabrir exigen su evento de auditoria en la misma
--      transaccion. El autor elimina o edita lo suyo sin auditoria; lo
--      eliminado no vuelve; lo RECHAZADO solo vuelve a PENDIENTE (edicion).
--   3. reporte_comunidad: destino exclusivo, un reporte abierto por usuario
--      y contenido, nadie reporta lo suyo ni lo eliminado. Transiciones
--      PENDIENTE -> EN_REVISION -> ACEPTADO | RECHAZADO, como la 021.
--   4. reporte_comunidad_historial: solo insercion; cada cambio de estado
--      de un reporte exige su evento. Quien resuelve no puede ser quien
--      reporto ni el autor del contenido.
--   5. Con 3 reportes no rechazados el contenido se oculta solo; si bajan
--      de 3, se restaura (RN-13, mismo umbral que las resenas). La marca
--      oculta_por_reportes siempre se recalcula con el conteo real: escribirla
--      a mano no tiene efecto.
--
-- Las acciones CERRAR y REABRIR quedan admitidas; sus endpoints son de la
-- fase 4.
--
-- Orden obligatorio: la auditoria se inserta ANTES de cambiar el contenido
-- (su trigger valida el estado previo) y en la misma transaccion.
-- Limite conocido: la base no sabe quien ejecuta; un moderador que firmara
-- eliminada_por con el id del autor eliminaria sin auditoria. Lo impide el
-- backend, que siempre firma con el moderador.
--
-- Seguridad: RLS sin politicas y REVOKE ALL a anon, authenticated y PUBLIC
-- en tablas, secuencias y funciones; funciones con search_path = pg_catalog.
--
-- Antes de ejecutar en Supabase: los triggers nuevos sobre las tablas de
-- la comunidad y las FK toman bloqueos breves; con lock_timeout de 5 s la
-- migracion falla limpia si estan ocupadas y basta con reintentarla.
--
-- Es reaplicable: IF NOT EXISTS, CREATE OR REPLACE y DROP TRIGGER IF EXISTS.
-- Requisitos previos: 029 aplicada.
-- Verificacion: docs/sql/tests/030_verificacion_moderacion_comunidad.sql
-- ============================================================

BEGIN;

SET LOCAL lock_timeout = '5s';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.schema_version WHERE version = '029_comunidad'
    ) THEN
        RAISE EXCEPTION 'Preflight fallido: la migracion 029 debe estar aplicada antes de 030.';
    END IF;
END $$;

-- ---------- 1. Auditoria de moderacion ----------
CREATE TABLE IF NOT EXISTS public.moderacion_comunidad_auditoria (
  id_auditoria       BIGSERIAL PRIMARY KEY,
  id_publicacion     BIGINT NULL,
  id_respuesta       BIGINT NULL,
  tipo_contenido     VARCHAR(12) GENERATED ALWAYS AS (
                       CASE WHEN id_publicacion IS NOT NULL THEN 'PUBLICACION' ELSE 'RESPUESTA' END) STORED,
  id_moderador       BIGINT NOT NULL,
  accion             VARCHAR(20) NOT NULL,
  motivo             TEXT NOT NULL,
  contenido_revisado TEXT NOT NULL,
  id_transaccion     BIGINT NOT NULL DEFAULT txid_current(),
  fecha_evento       TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT fk_moderacion_comunidad_publicacion FOREIGN KEY (id_publicacion)
    REFERENCES public.publicacion_comunidad (id_publicacion) ON DELETE RESTRICT,
  CONSTRAINT fk_moderacion_comunidad_respuesta FOREIGN KEY (id_respuesta)
    REFERENCES public.respuesta_comunidad (id_respuesta) ON DELETE RESTRICT,
  CONSTRAINT fk_moderacion_comunidad_moderador FOREIGN KEY (id_moderador)
    REFERENCES public.usuario (id_usuario) ON DELETE RESTRICT,
  CONSTRAINT chk_moderacion_comunidad_destino
    CHECK (num_nonnulls(id_publicacion, id_respuesta) = 1),
  CONSTRAINT chk_moderacion_comunidad_accion
    CHECK (accion IN ('APROBAR', 'RECHAZAR', 'OCULTAR', 'RESTAURAR', 'ELIMINAR_MODERADOR', 'CERRAR', 'REABRIR')),
  CONSTRAINT chk_moderacion_comunidad_motivo
    CHECK (btrim(motivo, E' \t\r\n') <> '' AND char_length(motivo) <= 500),
  CONSTRAINT chk_moderacion_comunidad_contenido_revisado
    CHECK (btrim(contenido_revisado, E' \t\r\n') <> '')
);

COMMENT ON TABLE public.moderacion_comunidad_auditoria IS
  'Decisiones de moderacion de la comunidad: solo insercion, con motivo y texto revisado.';

CREATE INDEX IF NOT EXISTS idx_moderacion_comunidad_publicacion
  ON public.moderacion_comunidad_auditoria (id_publicacion, fecha_evento) WHERE id_publicacion IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_moderacion_comunidad_respuesta
  ON public.moderacion_comunidad_auditoria (id_respuesta, fecha_evento) WHERE id_respuesta IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_moderacion_comunidad_moderador
  ON public.moderacion_comunidad_auditoria (id_moderador, fecha_evento);

CREATE OR REPLACE FUNCTION public.fn_validar_insert_moderacion_comunidad()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
DECLARE
    v_autor BIGINT;
    v_estado VARCHAR(20);
    v_oculta BOOLEAN;
    v_eliminada BOOLEAN;
    v_cerrada BOOLEAN;
    v_valida BOOLEAN;
BEGIN
    IF num_nonnulls(NEW.id_publicacion, NEW.id_respuesta) <> 1 THEN
        RAISE EXCEPTION 'Una decision de moderacion tiene exactamente un destino.';
    END IF;
    IF NOT public.fn_usuario_tiene_rol_activo(NEW.id_moderador, ARRAY['moderador', 'administrador']) THEN
        RAISE EXCEPTION 'El actor de moderacion debe tener cuenta y rol activo.';
    END IF;

    IF NEW.id_publicacion IS NOT NULL THEN
        SELECT id_autor, estado_moderacion, oculta_por_moderacion, eliminada, cerrada
          INTO v_autor, v_estado, v_oculta, v_eliminada, v_cerrada
          FROM public.publicacion_comunidad
         WHERE id_publicacion = NEW.id_publicacion
           FOR NO KEY UPDATE;
    ELSE
        SELECT id_autor, estado_moderacion, oculta_por_moderacion, eliminada, NULL
          INTO v_autor, v_estado, v_oculta, v_eliminada, v_cerrada
          FROM public.respuesta_comunidad
         WHERE id_respuesta = NEW.id_respuesta
           FOR NO KEY UPDATE;
    END IF;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No existe el contenido de la decision.';
    END IF;
    IF v_autor = NEW.id_moderador THEN
        RAISE EXCEPTION 'Conflicto de interes: el moderador es el autor del contenido.';
    END IF;

    -- Una misma decision no se registra dos veces en la misma transaccion.
    IF EXISTS (
        SELECT 1 FROM public.moderacion_comunidad_auditoria a
         WHERE a.accion = NEW.accion AND a.id_transaccion = txid_current()
           AND a.id_publicacion IS NOT DISTINCT FROM NEW.id_publicacion
           AND a.id_respuesta IS NOT DISTINCT FROM NEW.id_respuesta
    ) THEN
        RAISE EXCEPTION 'La decision % ya esta registrada para este contenido en esta transaccion.', NEW.accion;
    END IF;

    v_valida := CASE NEW.accion
        WHEN 'APROBAR' THEN v_estado = 'PENDIENTE' AND NOT v_eliminada
        WHEN 'RECHAZAR' THEN v_estado = 'PENDIENTE' AND NOT v_eliminada
        WHEN 'OCULTAR' THEN NOT v_oculta AND NOT v_eliminada
        WHEN 'RESTAURAR' THEN v_oculta AND NOT v_eliminada
        WHEN 'ELIMINAR_MODERADOR' THEN NOT v_eliminada
        WHEN 'CERRAR' THEN v_cerrada IS NOT NULL AND NOT v_cerrada AND NOT v_eliminada
        WHEN 'REABRIR' THEN v_cerrada IS NOT NULL AND v_cerrada
        ELSE FALSE
    END;
    IF NOT v_valida THEN
        RAISE EXCEPTION 'La accion % no coincide con el estado actual del contenido.', NEW.accion;
    END IF;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validar_insert_moderacion_comunidad ON public.moderacion_comunidad_auditoria;
CREATE TRIGGER trg_validar_insert_moderacion_comunidad
  BEFORE INSERT ON public.moderacion_comunidad_auditoria
  FOR EACH ROW EXECUTE FUNCTION public.fn_validar_insert_moderacion_comunidad();

-- Al confirmar, el contenido debe haber quedado como dice la accion.
CREATE OR REPLACE FUNCTION public.fn_verificar_estado_final_moderacion_comunidad()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
DECLARE
    v_estado VARCHAR(20);
    v_oculta BOOLEAN;
    v_eliminada BOOLEAN;
    v_eliminada_por BIGINT;
    v_cerrada BOOLEAN;
    v_coincide BOOLEAN;
BEGIN
    IF NEW.id_publicacion IS NOT NULL THEN
        SELECT estado_moderacion, oculta_por_moderacion, eliminada, eliminada_por, cerrada
          INTO v_estado, v_oculta, v_eliminada, v_eliminada_por, v_cerrada
          FROM public.publicacion_comunidad WHERE id_publicacion = NEW.id_publicacion;
    ELSE
        SELECT estado_moderacion, oculta_por_moderacion, eliminada, eliminada_por, NULL
          INTO v_estado, v_oculta, v_eliminada, v_eliminada_por, v_cerrada
          FROM public.respuesta_comunidad WHERE id_respuesta = NEW.id_respuesta;
    END IF;

    v_coincide := CASE NEW.accion
        WHEN 'APROBAR' THEN v_estado = 'PUBLICADA'
        WHEN 'RECHAZAR' THEN v_estado = 'RECHAZADA'
        WHEN 'OCULTAR' THEN v_oculta
        WHEN 'RESTAURAR' THEN NOT v_oculta
        WHEN 'ELIMINAR_MODERADOR' THEN v_eliminada AND v_eliminada_por = NEW.id_moderador
        WHEN 'CERRAR' THEN v_cerrada
        WHEN 'REABRIR' THEN NOT v_cerrada
        ELSE FALSE
    END;
    IF v_coincide IS NOT TRUE THEN
        RAISE EXCEPTION 'El evento % (auditoria %) no coincide con el estado final del contenido.',
            NEW.accion, NEW.id_auditoria;
    END IF;
    RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_verificar_estado_final_moderacion_comunidad ON public.moderacion_comunidad_auditoria;
CREATE CONSTRAINT TRIGGER trg_verificar_estado_final_moderacion_comunidad
  AFTER INSERT ON public.moderacion_comunidad_auditoria
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.fn_verificar_estado_final_moderacion_comunidad();

CREATE OR REPLACE FUNCTION public.fn_proteger_moderacion_comunidad()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
    RAISE EXCEPTION 'Operacion denegada: % es de solo insercion.', TG_TABLE_NAME;
END $$;

DROP TRIGGER IF EXISTS trg_proteger_moderacion_comunidad ON public.moderacion_comunidad_auditoria;
CREATE TRIGGER trg_proteger_moderacion_comunidad
  BEFORE UPDATE OR DELETE ON public.moderacion_comunidad_auditoria
  FOR EACH ROW EXECUTE FUNCTION public.fn_proteger_moderacion_comunidad();
DROP TRIGGER IF EXISTS trg_proteger_truncate_moderacion_comunidad ON public.moderacion_comunidad_auditoria;
CREATE TRIGGER trg_proteger_truncate_moderacion_comunidad
  BEFORE TRUNCATE ON public.moderacion_comunidad_auditoria
  FOR EACH STATEMENT EXECUTE FUNCTION public.fn_proteger_moderacion_comunidad();

-- ---------- 2. Cambios del contenido que exigen auditoria ----------
CREATE OR REPLACE FUNCTION public.fn_exigir_auditoria_contenido_comunidad()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
DECLARE
    v_es_publicacion BOOLEAN := TG_TABLE_NAME = 'publicacion_comunidad';
    v_id BIGINT;
    v_accion VARCHAR(20);
BEGIN
    -- PL/pgSQL resuelve los campos de NEW aunque la rama no se ejecute:
    -- cada tabla se trata en su propia rama IF.
    IF v_es_publicacion THEN
        v_id := NEW.id_publicacion;
    ELSE
        v_id := NEW.id_respuesta;
    END IF;

    -- Estado de moderacion.
    IF OLD.estado_moderacion IS DISTINCT FROM NEW.estado_moderacion THEN
        IF NEW.estado_moderacion = 'PENDIENTE' THEN
            -- Solo como edicion del autor: pasar a PENDIENTE sin editar
            -- ocultaria el contenido sin rastro (RN-12).
            IF NEW.fecha_edicion IS NOT DISTINCT FROM OLD.fecha_edicion THEN
                RAISE EXCEPTION 'Volver a PENDIENTE solo ocurre al editar el contenido.';
            END IF;
        ELSIF OLD.estado_moderacion = 'PENDIENTE' THEN
            v_accion := CASE NEW.estado_moderacion WHEN 'PUBLICADA' THEN 'APROBAR' ELSE 'RECHAZAR' END;
            IF NOT public.fn_auditoria_contenido_comunidad_existe(v_es_publicacion, v_id, v_accion) THEN
                RAISE EXCEPTION 'Salir de revision (%) exige su auditoria en la misma transaccion.', v_accion;
            END IF;
        ELSE
            RAISE EXCEPTION 'Transicion de moderacion no permitida: % -> %.', OLD.estado_moderacion, NEW.estado_moderacion;
        END IF;
    END IF;

    -- Ocultamiento manual.
    IF OLD.oculta_por_moderacion IS DISTINCT FROM NEW.oculta_por_moderacion THEN
        v_accion := CASE WHEN NEW.oculta_por_moderacion THEN 'OCULTAR' ELSE 'RESTAURAR' END;
        IF NOT public.fn_auditoria_contenido_comunidad_existe(v_es_publicacion, v_id, v_accion) THEN
            RAISE EXCEPTION '% exige su auditoria en la misma transaccion.', v_accion;
        END IF;
    END IF;

    -- Eliminacion: irreversible; la de un moderador se audita.
    IF OLD.eliminada IS DISTINCT FROM NEW.eliminada THEN
        IF NOT NEW.eliminada THEN
            RAISE EXCEPTION 'Un contenido eliminado no se puede restaurar.';
        END IF;
        IF NEW.eliminada_por IS DISTINCT FROM NEW.id_autor
           AND NOT public.fn_auditoria_contenido_comunidad_existe(v_es_publicacion, v_id, 'ELIMINAR_MODERADOR') THEN
            RAISE EXCEPTION 'La eliminacion por un moderador exige su auditoria en la misma transaccion.';
        END IF;
    END IF;

    -- Cierre de hilos (solo publicaciones).
    IF v_es_publicacion THEN
        IF OLD.cerrada IS DISTINCT FROM NEW.cerrada THEN
            v_accion := CASE WHEN NEW.cerrada THEN 'CERRAR' ELSE 'REABRIR' END;
            IF NOT public.fn_auditoria_contenido_comunidad_existe(TRUE, v_id, v_accion) THEN
                RAISE EXCEPTION '% exige su auditoria en la misma transaccion.', v_accion;
            END IF;
        END IF;
    END IF;
    RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.fn_auditoria_contenido_comunidad_existe(
    p_es_publicacion BOOLEAN, p_id BIGINT, p_accion VARCHAR)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = pg_catalog
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.moderacion_comunidad_auditoria a
         WHERE a.accion = p_accion
           AND a.id_transaccion = txid_current()
           AND ((p_es_publicacion AND a.id_publicacion = p_id)
                OR (NOT p_es_publicacion AND a.id_respuesta = p_id))
    );
$$;

DROP TRIGGER IF EXISTS trg_exigir_auditoria_publicacion_comunidad ON public.publicacion_comunidad;
CREATE CONSTRAINT TRIGGER trg_exigir_auditoria_publicacion_comunidad
  AFTER UPDATE OF estado_moderacion, oculta_por_moderacion, eliminada, cerrada ON public.publicacion_comunidad
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.fn_exigir_auditoria_contenido_comunidad();

DROP TRIGGER IF EXISTS trg_exigir_auditoria_respuesta_comunidad ON public.respuesta_comunidad;
CREATE CONSTRAINT TRIGGER trg_exigir_auditoria_respuesta_comunidad
  AFTER UPDATE OF estado_moderacion, oculta_por_moderacion, eliminada ON public.respuesta_comunidad
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.fn_exigir_auditoria_contenido_comunidad();

-- ---------- 3. Reportes ----------
CREATE TABLE IF NOT EXISTS public.reporte_comunidad (
  id_reporte          BIGSERIAL PRIMARY KEY,
  id_publicacion      BIGINT NULL,
  id_respuesta        BIGINT NULL,
  tipo_contenido      VARCHAR(12) GENERATED ALWAYS AS (
                        CASE WHEN id_publicacion IS NOT NULL THEN 'PUBLICACION' ELSE 'RESPUESTA' END) STORED,
  id_usuario          BIGINT NOT NULL,
  motivo              VARCHAR(30) NOT NULL,
  descripcion         TEXT NULL,
  estado              VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
  fecha_creacion      TIMESTAMP NOT NULL DEFAULT now(),
  fecha_actualizacion TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT fk_reporte_comunidad_publicacion FOREIGN KEY (id_publicacion)
    REFERENCES public.publicacion_comunidad (id_publicacion) ON DELETE RESTRICT,
  CONSTRAINT fk_reporte_comunidad_respuesta FOREIGN KEY (id_respuesta)
    REFERENCES public.respuesta_comunidad (id_respuesta) ON DELETE RESTRICT,
  CONSTRAINT fk_reporte_comunidad_usuario FOREIGN KEY (id_usuario)
    REFERENCES public.usuario (id_usuario) ON DELETE RESTRICT,
  CONSTRAINT chk_reporte_comunidad_destino
    CHECK (num_nonnulls(id_publicacion, id_respuesta) = 1),
  CONSTRAINT chk_reporte_comunidad_motivo
    CHECK (motivo IN ('spam', 'lenguaje-ofensivo', 'acoso', 'falso', 'otro')),
  CONSTRAINT chk_reporte_comunidad_descripcion CHECK (
    (descripcion IS NULL OR char_length(descripcion) <= 500)
    AND (motivo <> 'otro' OR (descripcion IS NOT NULL AND btrim(descripcion, E' \t\r\n') <> ''))),
  CONSTRAINT chk_reporte_comunidad_estado
    CHECK (estado IN ('PENDIENTE', 'EN_REVISION', 'ACEPTADO', 'RECHAZADO'))
);

COMMENT ON TABLE public.reporte_comunidad IS
  'Reportes de publicaciones y respuestas de la comunidad. Un reporte abierto por usuario y contenido.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_reporte_comunidad_abierto_publicacion
  ON public.reporte_comunidad (id_usuario, id_publicacion)
  WHERE id_publicacion IS NOT NULL AND estado IN ('PENDIENTE', 'EN_REVISION');
CREATE UNIQUE INDEX IF NOT EXISTS uq_reporte_comunidad_abierto_respuesta
  ON public.reporte_comunidad (id_usuario, id_respuesta)
  WHERE id_respuesta IS NOT NULL AND estado IN ('PENDIENTE', 'EN_REVISION');
CREATE INDEX IF NOT EXISTS idx_reporte_comunidad_usuario_fecha
  ON public.reporte_comunidad (id_usuario, fecha_creacion);
CREATE INDEX IF NOT EXISTS idx_reporte_comunidad_publicacion
  ON public.reporte_comunidad (id_publicacion) WHERE id_publicacion IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reporte_comunidad_respuesta
  ON public.reporte_comunidad (id_respuesta) WHERE id_respuesta IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reporte_comunidad_estado_fecha
  ON public.reporte_comunidad (estado, fecha_creacion);

CREATE OR REPLACE FUNCTION public.fn_validar_insert_reporte_comunidad()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
DECLARE
    v_autor BIGINT;
    v_eliminada BOOLEAN;
BEGIN
    IF num_nonnulls(NEW.id_publicacion, NEW.id_respuesta) <> 1 THEN
        RAISE EXCEPTION 'Un reporte tiene exactamente un destino.';
    END IF;
    IF NEW.estado <> 'PENDIENTE' THEN
        RAISE EXCEPTION 'Un reporte nuevo empieza en PENDIENTE.';
    END IF;
    -- FOR NO KEY UPDATE: si el contenido se esta eliminando, el reporte espera
    -- y ve el resultado (es el mismo bloqueo que toma el recalculo).
    IF NEW.id_publicacion IS NOT NULL THEN
        SELECT id_autor, eliminada INTO v_autor, v_eliminada
          FROM public.publicacion_comunidad WHERE id_publicacion = NEW.id_publicacion FOR NO KEY UPDATE;
    ELSE
        SELECT rc.id_autor, rc.eliminada OR p.eliminada INTO v_autor, v_eliminada
          FROM public.respuesta_comunidad rc
          JOIN public.publicacion_comunidad p ON p.id_publicacion = rc.id_publicacion
         WHERE rc.id_respuesta = NEW.id_respuesta
           FOR NO KEY UPDATE OF rc;
    END IF;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No existe el contenido reportado.';
    END IF;
    IF v_eliminada THEN
        RAISE EXCEPTION 'No se puede reportar contenido eliminado.';
    END IF;
    IF v_autor = NEW.id_usuario THEN
        RAISE EXCEPTION 'Nadie puede reportar su propio contenido.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.usuario WHERE id_usuario = NEW.id_usuario AND estado = TRUE) THEN
        RAISE EXCEPTION 'Una cuenta inactiva o suspendida no puede reportar.';
    END IF;
    NEW.fecha_creacion := now();
    NEW.fecha_actualizacion := NEW.fecha_creacion;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validar_insert_reporte_comunidad ON public.reporte_comunidad;
CREATE TRIGGER trg_validar_insert_reporte_comunidad
  BEFORE INSERT ON public.reporte_comunidad
  FOR EACH ROW EXECUTE FUNCTION public.fn_validar_insert_reporte_comunidad();

CREATE OR REPLACE FUNCTION public.fn_validar_update_reporte_comunidad()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
    IF NEW.id_publicacion IS DISTINCT FROM OLD.id_publicacion
       OR NEW.id_respuesta IS DISTINCT FROM OLD.id_respuesta
       OR NEW.id_usuario IS DISTINCT FROM OLD.id_usuario
       OR NEW.motivo IS DISTINCT FROM OLD.motivo
       OR NEW.descripcion IS DISTINCT FROM OLD.descripcion
       OR NEW.fecha_creacion IS DISTINCT FROM OLD.fecha_creacion THEN
        RAISE EXCEPTION 'Solo el estado del reporte % puede cambiar.', OLD.id_reporte;
    END IF;
    IF OLD.estado IS DISTINCT FROM NEW.estado AND NOT (
        (OLD.estado = 'PENDIENTE' AND NEW.estado = 'EN_REVISION')
        OR (OLD.estado = 'EN_REVISION' AND NEW.estado IN ('ACEPTADO', 'RECHAZADO'))
    ) THEN
        RAISE EXCEPTION 'Transicion no permitida para el reporte %: % -> %.', OLD.id_reporte, OLD.estado, NEW.estado;
    END IF;
    NEW.fecha_actualizacion := now();
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validar_update_reporte_comunidad ON public.reporte_comunidad;
CREATE TRIGGER trg_validar_update_reporte_comunidad
  BEFORE UPDATE ON public.reporte_comunidad
  FOR EACH ROW EXECUTE FUNCTION public.fn_validar_update_reporte_comunidad();

DROP TRIGGER IF EXISTS trg_proteger_reporte_comunidad ON public.reporte_comunidad;
CREATE TRIGGER trg_proteger_reporte_comunidad
  BEFORE DELETE ON public.reporte_comunidad
  FOR EACH ROW EXECUTE FUNCTION public.fn_proteger_moderacion_comunidad();
DROP TRIGGER IF EXISTS trg_proteger_truncate_reporte_comunidad ON public.reporte_comunidad;
CREATE TRIGGER trg_proteger_truncate_reporte_comunidad
  BEFORE TRUNCATE ON public.reporte_comunidad
  FOR EACH STATEMENT EXECUTE FUNCTION public.fn_proteger_moderacion_comunidad();

-- Ocultamiento por reportes (RN-13): 3 o mas no rechazados ocultan.
CREATE OR REPLACE FUNCTION public.fn_recalcular_ocultamiento_reporte_comunidad()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
DECLARE
    v_activos BIGINT;
BEGIN
    IF NEW.id_publicacion IS NOT NULL THEN
        PERFORM 1 FROM public.publicacion_comunidad WHERE id_publicacion = NEW.id_publicacion FOR NO KEY UPDATE;
        SELECT count(*) INTO v_activos FROM public.reporte_comunidad
         WHERE id_publicacion = NEW.id_publicacion AND estado <> 'RECHAZADO';
        UPDATE public.publicacion_comunidad SET oculta_por_reportes = (v_activos >= 3)
         WHERE id_publicacion = NEW.id_publicacion AND oculta_por_reportes IS DISTINCT FROM (v_activos >= 3);
    ELSE
        PERFORM 1 FROM public.respuesta_comunidad WHERE id_respuesta = NEW.id_respuesta FOR NO KEY UPDATE;
        SELECT count(*) INTO v_activos FROM public.reporte_comunidad
         WHERE id_respuesta = NEW.id_respuesta AND estado <> 'RECHAZADO';
        UPDATE public.respuesta_comunidad SET oculta_por_reportes = (v_activos >= 3)
         WHERE id_respuesta = NEW.id_respuesta AND oculta_por_reportes IS DISTINCT FROM (v_activos >= 3);
    END IF;
    RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_recalcular_ocultamiento_reporte_comunidad ON public.reporte_comunidad;
CREATE TRIGGER trg_recalcular_ocultamiento_reporte_comunidad
  AFTER INSERT OR UPDATE OF estado ON public.reporte_comunidad
  FOR EACH ROW EXECUTE FUNCTION public.fn_recalcular_ocultamiento_reporte_comunidad();

-- La marca solo refleja el conteo real: un UPDATE directo no la cambia.
CREATE OR REPLACE FUNCTION public.fn_marca_reportes_contenido_comunidad()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
DECLARE
    v_activos BIGINT;
BEGIN
    IF TG_TABLE_NAME = 'publicacion_comunidad' THEN
        SELECT count(*) INTO v_activos FROM public.reporte_comunidad
         WHERE id_publicacion = NEW.id_publicacion AND estado <> 'RECHAZADO';
    ELSE
        SELECT count(*) INTO v_activos FROM public.reporte_comunidad
         WHERE id_respuesta = NEW.id_respuesta AND estado <> 'RECHAZADO';
    END IF;
    NEW.oculta_por_reportes := v_activos >= 3;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_marca_reportes_publicacion_comunidad ON public.publicacion_comunidad;
CREATE TRIGGER trg_marca_reportes_publicacion_comunidad
  BEFORE UPDATE OF oculta_por_reportes ON public.publicacion_comunidad
  FOR EACH ROW EXECUTE FUNCTION public.fn_marca_reportes_contenido_comunidad();
DROP TRIGGER IF EXISTS trg_marca_reportes_respuesta_comunidad ON public.respuesta_comunidad;
CREATE TRIGGER trg_marca_reportes_respuesta_comunidad
  BEFORE UPDATE OF oculta_por_reportes ON public.respuesta_comunidad
  FOR EACH ROW EXECUTE FUNCTION public.fn_marca_reportes_contenido_comunidad();

-- ---------- 4. Historial de reportes ----------
CREATE TABLE IF NOT EXISTS public.reporte_comunidad_historial (
  id_historial    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_reporte      BIGINT NOT NULL,
  id_moderador    BIGINT NOT NULL,
  estado_anterior VARCHAR(20) NOT NULL,
  estado_nuevo    VARCHAR(20) NOT NULL,
  justificacion   TEXT NOT NULL,
  id_transaccion  BIGINT NOT NULL DEFAULT txid_current(),
  fecha_evento    TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT fk_reporte_comunidad_historial_reporte FOREIGN KEY (id_reporte)
    REFERENCES public.reporte_comunidad (id_reporte) ON DELETE RESTRICT,
  CONSTRAINT fk_reporte_comunidad_historial_moderador FOREIGN KEY (id_moderador)
    REFERENCES public.usuario (id_usuario) ON DELETE RESTRICT,
  CONSTRAINT chk_reporte_comunidad_historial_transicion CHECK (
    (estado_anterior = 'PENDIENTE' AND estado_nuevo = 'EN_REVISION')
    OR (estado_anterior = 'EN_REVISION' AND estado_nuevo IN ('ACEPTADO', 'RECHAZADO'))),
  CONSTRAINT chk_reporte_comunidad_historial_justificacion
    CHECK (btrim(justificacion, E' \t\r\n') <> '' AND char_length(justificacion) <= 2000)
);

CREATE INDEX IF NOT EXISTS idx_reporte_comunidad_historial_reporte
  ON public.reporte_comunidad_historial (id_reporte, fecha_evento);
CREATE INDEX IF NOT EXISTS idx_reporte_comunidad_historial_moderador
  ON public.reporte_comunidad_historial (id_moderador, fecha_evento);

CREATE OR REPLACE FUNCTION public.fn_validar_insert_reporte_comunidad_historial()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
DECLARE
    v_estado VARCHAR(20);
    v_reportante BIGINT;
    v_autor BIGINT;
BEGIN
    IF NOT public.fn_usuario_tiene_rol_activo(NEW.id_moderador, ARRAY['moderador', 'administrador']) THEN
        RAISE EXCEPTION 'El actor de moderacion debe tener cuenta y rol activo.';
    END IF;
    SELECT r.estado, r.id_usuario, coalesce(p.id_autor, rc.id_autor)
      INTO v_estado, v_reportante, v_autor
      FROM public.reporte_comunidad r
      LEFT JOIN public.publicacion_comunidad p ON p.id_publicacion = r.id_publicacion
      LEFT JOIN public.respuesta_comunidad rc ON rc.id_respuesta = r.id_respuesta
     WHERE r.id_reporte = NEW.id_reporte
       FOR NO KEY UPDATE OF r;  -- Dos resoluciones a la vez: la segunda espera y ve el estado nuevo.
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No existe el reporte.';
    END IF;
    IF v_reportante = NEW.id_moderador OR v_autor = NEW.id_moderador THEN
        RAISE EXCEPTION 'Conflicto de interes: el actor creo el reporte o es el autor del contenido.';
    END IF;
    IF v_estado IS DISTINCT FROM NEW.estado_anterior THEN
        RAISE EXCEPTION 'El estado anterior del evento no coincide con el estado actual del reporte.';
    END IF;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validar_insert_reporte_comunidad_historial ON public.reporte_comunidad_historial;
CREATE TRIGGER trg_validar_insert_reporte_comunidad_historial
  BEFORE INSERT ON public.reporte_comunidad_historial
  FOR EACH ROW EXECUTE FUNCTION public.fn_validar_insert_reporte_comunidad_historial();

DROP TRIGGER IF EXISTS trg_proteger_reporte_comunidad_historial ON public.reporte_comunidad_historial;
CREATE TRIGGER trg_proteger_reporte_comunidad_historial
  BEFORE UPDATE OR DELETE ON public.reporte_comunidad_historial
  FOR EACH ROW EXECUTE FUNCTION public.fn_proteger_moderacion_comunidad();
DROP TRIGGER IF EXISTS trg_proteger_truncate_reporte_comunidad_historial ON public.reporte_comunidad_historial;
CREATE TRIGGER trg_proteger_truncate_reporte_comunidad_historial
  BEFORE TRUNCATE ON public.reporte_comunidad_historial
  FOR EACH STATEMENT EXECUTE FUNCTION public.fn_proteger_moderacion_comunidad();

CREATE OR REPLACE FUNCTION public.fn_exigir_historial_reporte_comunidad()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
    IF OLD.estado IS DISTINCT FROM NEW.estado AND NOT EXISTS (
        SELECT 1 FROM public.reporte_comunidad_historial h
         WHERE h.id_reporte = NEW.id_reporte
           AND h.estado_anterior = OLD.estado
           AND h.estado_nuevo = NEW.estado
           AND h.id_transaccion = txid_current()
    ) THEN
        RAISE EXCEPTION 'La transicion del reporte % no tiene historial en la misma transaccion.', NEW.id_reporte;
    END IF;
    RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_exigir_historial_reporte_comunidad ON public.reporte_comunidad;
CREATE CONSTRAINT TRIGGER trg_exigir_historial_reporte_comunidad
  AFTER UPDATE ON public.reporte_comunidad
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.fn_exigir_historial_reporte_comunidad();

-- ---------- 5. Seguridad ----------
ALTER TABLE public.moderacion_comunidad_auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reporte_comunidad ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reporte_comunidad_historial ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.moderacion_comunidad_auditoria FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.reporte_comunidad FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.reporte_comunidad_historial FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.moderacion_comunidad_auditoria_id_auditoria_seq FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.reporte_comunidad_id_reporte_seq FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.reporte_comunidad_historial_id_historial_seq FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_validar_insert_moderacion_comunidad() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_verificar_estado_final_moderacion_comunidad() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_proteger_moderacion_comunidad() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_exigir_auditoria_contenido_comunidad() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_auditoria_contenido_comunidad_existe(BOOLEAN, BIGINT, VARCHAR) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_validar_insert_reporte_comunidad() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_validar_update_reporte_comunidad() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_recalcular_ocultamiento_reporte_comunidad() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_marca_reportes_contenido_comunidad() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_validar_insert_reporte_comunidad_historial() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_exigir_historial_reporte_comunidad() FROM PUBLIC, anon, authenticated;

INSERT INTO public.schema_version (version, descripcion)
VALUES (
  '030_moderacion_comunidad',
  'Comunidad: auditoria de moderacion, reportes con historial y ocultamiento por 3 reportes'
)
ON CONFLICT (version) DO NOTHING;

COMMIT;
