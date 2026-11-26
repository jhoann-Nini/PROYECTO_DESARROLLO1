-- ============================================================
-- MIGRACION 031: APELACIONES DE LA COMUNIDAD
-- Comunidad, fase 3 (especificacion: docs/superpowers/specs/2026-11-24-comunidad-design.md)
-- ============================================================
-- Mismo diseno que la 026 (apelaciones de resenas), sobre las decisiones de
-- moderacion_comunidad_auditoria (030):
--   1. apelacion_comunidad: una apelacion por decision (UNIQUE), del autor
--      del contenido, dentro de 15 dias, solo de RECHAZAR, OCULTAR o
--      ELIMINAR_MODERADOR, y no si el autor elimino el contenido por su
--      cuenta. PENDIENTE -> ACEPTADA | RECHAZADA, una sola vez.
--   2. Quien resuelve tiene rol activo y no es el autor ni el moderador de
--      la decision. Al resolver se guardan fecha e id_transaccion_resolucion.
--   3. Se prohiben DELETE y TRUNCATE.
--   4. Revertir un rechazo en un solo paso: la 030 solo deja volver a
--      PENDIENTE al editar (para que no se pueda ocultar sin rastro). La 031
--      permite APROBAR sobre RECHAZADA, y RECHAZADA -> PUBLICADA, solo si en
--      la MISMA transaccion se acepto la apelacion de la ULTIMA decision
--      RECHAZAR de ese contenido. Se reemplazan dos funciones de la 030 con
--      ese unico cambio.
--
-- Al aceptar, el backend revierte la decision en la misma transaccion:
-- APROBAR para un rechazo y RESTAURAR para un ocultamiento. Una eliminacion
-- no se deshace (030): aceptar su apelacion solo anula la falta.
-- La reincidencia deja de contar las decisiones con apelacion ACEPTADA.
--
-- Limites conocidos (los garantiza el backend):
--   - La base no comprueba que la decision siga vigente (un OCULTAR ya
--     restaurado, un RECHAZAR que ya no es el ultimo). Aceptar una de esas
--     solo anula la falta: no puede publicar nada (punto 4).
--   - La base no sabe quien firma el APROBAR de la reversion: el backend lo
--     firma con quien resuelve la apelacion.
--   - El orden por id_auditoria del ultimo RECHAZAR (punto 3) depende de que
--     el backend bloquee el contenido antes de insertar la auditoria; por SQL
--     directo (solo roles de confianza) se puede pedir un id antes del bloqueo.
--   - El plazo compara now() con fecha_evento (reloj de la JVM): ambas deben
--     usar la misma zona horaria (igual que en la 026).
--
-- NO reaplicar la 030 despues de la 031: devolveria las dos funciones a su
-- version anterior y quitaria en silencio la reversion de rechazos. El
-- script de verificacion comprueba que siguen siendo las de la 031.
--
-- Seguridad: RLS sin politicas; REVOKE a anon, authenticated y PUBLIC;
-- funciones con search_path = pg_catalog.
--
-- Antes de ejecutar en Supabase: lock_timeout de 5 s; si falla por
-- bloqueo, basta con reintentar. Aplicar ANTES de desplegar el backend que
-- usa ApelacionComunidad (ddl-auto=validate).
--
-- Requisitos previos: 030 aplicada.
-- Verificacion: docs/sql/tests/031_verificacion_apelaciones_comunidad.sql
-- ============================================================

BEGIN;

SET LOCAL lock_timeout = '5s';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.schema_version WHERE version = '030_moderacion_comunidad'
    ) THEN
        RAISE EXCEPTION 'Preflight fallido: la migracion 030 debe estar aplicada antes de 031.';
    END IF;
END $$;

-- ---------- 1. Tabla ----------
CREATE TABLE IF NOT EXISTS public.apelacion_comunidad (
  id_apelacion              BIGSERIAL PRIMARY KEY,
  id_auditoria              BIGINT NOT NULL,
  id_autor                  BIGINT NOT NULL,
  motivo                    TEXT NOT NULL,
  estado                    VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
  fecha_solicitud           TIMESTAMP NOT NULL DEFAULT now(),
  id_moderador              BIGINT NULL,
  respuesta                 TEXT NULL,
  fecha_resolucion          TIMESTAMP NULL,
  id_transaccion_resolucion BIGINT NULL,
  CONSTRAINT uk_apelacion_comunidad_auditoria UNIQUE (id_auditoria),
  CONSTRAINT fk_apelacion_comunidad_auditoria FOREIGN KEY (id_auditoria)
    REFERENCES public.moderacion_comunidad_auditoria (id_auditoria) ON DELETE RESTRICT,
  CONSTRAINT fk_apelacion_comunidad_autor FOREIGN KEY (id_autor)
    REFERENCES public.usuario (id_usuario) ON DELETE RESTRICT,
  CONSTRAINT fk_apelacion_comunidad_moderador FOREIGN KEY (id_moderador)
    REFERENCES public.usuario (id_usuario) ON DELETE RESTRICT,
  CONSTRAINT chk_apelacion_comunidad_estado
    CHECK (estado IN ('PENDIENTE', 'ACEPTADA', 'RECHAZADA')),
  CONSTRAINT chk_apelacion_comunidad_motivo
    CHECK (btrim(motivo, E' \t\r\n') <> '' AND char_length(motivo) <= 1000),
  CONSTRAINT chk_apelacion_comunidad_resolucion CHECK (
    (estado = 'PENDIENTE' AND id_moderador IS NULL AND respuesta IS NULL
       AND fecha_resolucion IS NULL AND id_transaccion_resolucion IS NULL)
    OR (estado <> 'PENDIENTE' AND id_moderador IS NOT NULL AND fecha_resolucion IS NOT NULL
       AND id_transaccion_resolucion IS NOT NULL
       AND respuesta IS NOT NULL AND btrim(respuesta, E' \t\r\n') <> '' AND char_length(respuesta) <= 1000))
);

COMMENT ON TABLE public.apelacion_comunidad IS
  'Apelaciones de decisiones de moderacion de la comunidad. Una por decision; inmutable una vez resuelta.';

CREATE INDEX IF NOT EXISTS idx_apelacion_comunidad_estado_fecha
  ON public.apelacion_comunidad (estado, fecha_solicitud);
CREATE INDEX IF NOT EXISTS idx_apelacion_comunidad_autor
  ON public.apelacion_comunidad (id_autor, fecha_solicitud);

-- ---------- 2. Validaciones ----------
CREATE OR REPLACE FUNCTION public.fn_validar_insert_apelacion_comunidad()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
DECLARE
    v_accion VARCHAR(20);
    v_fecha TIMESTAMP;
    v_autor BIGINT;
    v_eliminada BOOLEAN;
    v_eliminada_por BIGINT;
    v_id_publicacion BIGINT;
    v_id_respuesta BIGINT;
BEGIN
    IF NEW.estado <> 'PENDIENTE' OR NEW.id_moderador IS NOT NULL OR NEW.respuesta IS NOT NULL
       OR NEW.fecha_resolucion IS NOT NULL OR NEW.id_transaccion_resolucion IS NOT NULL THEN
        RAISE EXCEPTION 'Una apelacion nueva empieza en PENDIENTE y sin resolver.';
    END IF;

    SELECT a.accion, a.fecha_evento, a.id_publicacion, a.id_respuesta
      INTO v_accion, v_fecha, v_id_publicacion, v_id_respuesta
      FROM public.moderacion_comunidad_auditoria a
     WHERE a.id_auditoria = NEW.id_auditoria;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No existe la decision apelada.';
    END IF;
    -- Orden de bloqueo: usuario y despues contenido, como al crear contenido
    -- (029: el limite de cuota bloquea el usuario y el trigger el contenido).
    -- Sin esto, apelar y responder en el propio hilo a la vez se interbloquean.
    PERFORM 1 FROM public.usuario u WHERE u.id_usuario = NEW.id_autor FOR KEY SHARE;
    -- FOR SHARE: espera a una eliminacion en curso del autor y ve su
    -- resultado. Aqui basta FOR SHARE (la 029 evita FOR SHARE en reportes por
    -- la subida de bloqueo): esta transaccion no actualiza el contenido despues.
    IF v_id_publicacion IS NOT NULL THEN
        SELECT p.id_autor, p.eliminada, p.eliminada_por
          INTO v_autor, v_eliminada, v_eliminada_por
          FROM public.publicacion_comunidad p
         WHERE p.id_publicacion = v_id_publicacion
           FOR SHARE;
    ELSE
        SELECT r.id_autor, r.eliminada, r.eliminada_por
          INTO v_autor, v_eliminada, v_eliminada_por
          FROM public.respuesta_comunidad r
         WHERE r.id_respuesta = v_id_respuesta
           FOR SHARE;
    END IF;
    IF v_accion NOT IN ('RECHAZAR', 'OCULTAR', 'ELIMINAR_MODERADOR') THEN
        RAISE EXCEPTION 'Solo se apelan decisiones RECHAZAR, OCULTAR o ELIMINAR_MODERADOR.';
    END IF;
    IF v_autor IS DISTINCT FROM NEW.id_autor THEN
        RAISE EXCEPTION 'Solo el autor del contenido puede apelar.';
    END IF;
    IF v_eliminada AND v_eliminada_por = v_autor THEN
        RAISE EXCEPTION 'El autor elimino el contenido; la decision ya no se apela.';
    END IF;
    IF now() > v_fecha + interval '15 days' THEN
        RAISE EXCEPTION 'El plazo de 15 dias para apelar termino.';
    END IF;
    NEW.fecha_solicitud := now();
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validar_insert_apelacion_comunidad ON public.apelacion_comunidad;
CREATE TRIGGER trg_validar_insert_apelacion_comunidad
  BEFORE INSERT ON public.apelacion_comunidad
  FOR EACH ROW EXECUTE FUNCTION public.fn_validar_insert_apelacion_comunidad();

CREATE OR REPLACE FUNCTION public.fn_validar_update_apelacion_comunidad()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
DECLARE
    v_moderador_decision BIGINT;
BEGIN
    IF OLD.estado <> 'PENDIENTE' THEN
        RAISE EXCEPTION 'La apelacion % ya esta resuelta y no cambia.', OLD.id_apelacion;
    END IF;
    IF NEW.id_auditoria IS DISTINCT FROM OLD.id_auditoria
       OR NEW.id_autor IS DISTINCT FROM OLD.id_autor
       OR NEW.motivo IS DISTINCT FROM OLD.motivo
       OR NEW.fecha_solicitud IS DISTINCT FROM OLD.fecha_solicitud THEN
        RAISE EXCEPTION 'Los datos de la solicitud no cambian.';
    END IF;
    IF NEW.estado = 'PENDIENTE' THEN
        RETURN NEW;
    END IF;
    IF NOT public.fn_usuario_tiene_rol_activo(NEW.id_moderador, ARRAY['moderador', 'administrador']) THEN
        RAISE EXCEPTION 'Quien resuelve debe tener cuenta y rol activo de moderacion.';
    END IF;
    SELECT id_moderador INTO v_moderador_decision
      FROM public.moderacion_comunidad_auditoria WHERE id_auditoria = NEW.id_auditoria;
    IF NEW.id_moderador = NEW.id_autor OR NEW.id_moderador = v_moderador_decision THEN
        RAISE EXCEPTION 'Conflicto de interes: resuelve el autor o el moderador de la decision.';
    END IF;
    NEW.fecha_resolucion := now();
    NEW.id_transaccion_resolucion := txid_current();
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validar_update_apelacion_comunidad ON public.apelacion_comunidad;
CREATE TRIGGER trg_validar_update_apelacion_comunidad
  BEFORE UPDATE ON public.apelacion_comunidad
  FOR EACH ROW EXECUTE FUNCTION public.fn_validar_update_apelacion_comunidad();

CREATE OR REPLACE FUNCTION public.fn_proteger_apelacion_comunidad()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
    RAISE EXCEPTION 'Operacion denegada: las apelaciones de la comunidad no se borran.';
END $$;

DROP TRIGGER IF EXISTS trg_proteger_delete_apelacion_comunidad ON public.apelacion_comunidad;
CREATE TRIGGER trg_proteger_delete_apelacion_comunidad
  BEFORE DELETE ON public.apelacion_comunidad
  FOR EACH ROW EXECUTE FUNCTION public.fn_proteger_apelacion_comunidad();
DROP TRIGGER IF EXISTS trg_proteger_truncate_apelacion_comunidad ON public.apelacion_comunidad;
CREATE TRIGGER trg_proteger_truncate_apelacion_comunidad
  BEFORE TRUNCATE ON public.apelacion_comunidad
  FOR EACH STATEMENT EXECUTE FUNCTION public.fn_proteger_apelacion_comunidad();

-- ---------- 3. Revertir un rechazo con la apelacion aceptada ----------
-- ¿Se acepto, en esta transaccion, la apelacion de la ULTIMA RECHAZAR del contenido?
-- La ULTIMA se decide por id_auditoria, no por fecha_evento (la pone el reloj
-- de la JVM). Es correcto porque el backend bloquea el contenido (FOR UPDATE)
-- antes de insertar la auditoria (IDENTITY): un RECHAZAR posterior, que exige
-- el contenido de nuevo PENDIENTE, siempre obtiene un id mayor.
CREATE OR REPLACE FUNCTION public.fn_apelacion_comunidad_revierte_rechazo(p_id_publicacion BIGINT, p_id_respuesta BIGINT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = pg_catalog
AS $$
    SELECT EXISTS (
        SELECT 1
          FROM public.apelacion_comunidad ap
          JOIN public.moderacion_comunidad_auditoria a ON a.id_auditoria = ap.id_auditoria
         WHERE ap.estado = 'ACEPTADA'
           AND ap.id_transaccion_resolucion = txid_current()
           AND a.accion = 'RECHAZAR'
           AND a.id_publicacion IS NOT DISTINCT FROM p_id_publicacion
           AND a.id_respuesta IS NOT DISTINCT FROM p_id_respuesta
           AND NOT EXISTS (
               SELECT 1 FROM public.moderacion_comunidad_auditoria b
                WHERE b.accion = 'RECHAZAR'
                  AND b.id_publicacion IS NOT DISTINCT FROM p_id_publicacion
                  AND b.id_respuesta IS NOT DISTINCT FROM p_id_respuesta
                  AND b.id_auditoria > a.id_auditoria)
    );
$$;

-- Funciones de la 030 reemplazadas: identicas salvo lo marcado con «031».
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
        -- 031: tambien sobre RECHAZADA si en esta transaccion se acepto la
        -- apelacion de la ultima RECHAZAR de este contenido.
        WHEN 'APROBAR' THEN NOT v_eliminada AND (v_estado = 'PENDIENTE'
            OR (v_estado = 'RECHAZADA'
                AND public.fn_apelacion_comunidad_revierte_rechazo(NEW.id_publicacion, NEW.id_respuesta)))
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
        ELSIF OLD.estado_moderacion = 'RECHAZADA' AND NEW.estado_moderacion = 'PUBLICADA' THEN
            -- 031: solo con una apelacion aceptada en esta transaccion y su APROBAR.
            IF NOT (
                CASE WHEN v_es_publicacion THEN public.fn_apelacion_comunidad_revierte_rechazo(v_id, NULL)
                     ELSE public.fn_apelacion_comunidad_revierte_rechazo(NULL, v_id) END
                AND public.fn_auditoria_contenido_comunidad_existe(v_es_publicacion, v_id, 'APROBAR')
            ) THEN
                RAISE EXCEPTION 'Publicar algo rechazado exige aceptar su apelacion y auditar APROBAR en la misma transaccion.';
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

-- ---------- 4. Seguridad ----------
ALTER TABLE public.apelacion_comunidad ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.apelacion_comunidad FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.apelacion_comunidad_id_apelacion_seq FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_validar_insert_apelacion_comunidad() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_validar_update_apelacion_comunidad() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_proteger_apelacion_comunidad() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_apelacion_comunidad_revierte_rechazo(BIGINT, BIGINT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_validar_insert_moderacion_comunidad() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_exigir_auditoria_contenido_comunidad() FROM PUBLIC, anon, authenticated;

INSERT INTO public.schema_version (version, descripcion)
VALUES (
  '031_apelaciones_comunidad',
  'Comunidad: apelaciones de decisiones de moderacion y reversion de rechazos con apelacion aceptada'
)
ON CONFLICT (version) DO NOTHING;

COMMIT;
