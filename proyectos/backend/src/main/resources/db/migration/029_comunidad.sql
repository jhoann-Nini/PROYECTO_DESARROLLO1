-- ============================================================
-- MIGRACION 029: COMUNIDAD (PUBLICACIONES, RESPUESTAS Y ME GUSTA)
-- Comunidad, fase 1 (especificacion: docs/superpowers/specs/2026-11-24-comunidad-design.md)
-- ============================================================
-- Tablas nuevas, separadas de resena y valoracion (RN-17):
--   1. publicacion_comunidad: foro GENERAL o de un PRODUCTO (RN-01).
--   2. respuesta_comunidad: arbol de 3 niveles, profundidad 0 a 2 (P1).
--      - La madre siempre es de la misma publicacion: FK compuesta (RN-04).
--      - Responder a una respuesta de nivel 2 crea una hermana en el nivel 2
--        que la cita (id_respuesta_citada, tambien de la misma publicacion).
--      - Un trigger calcula la profundidad, rechaza mas de 2, exige que la
--        citada sea de nivel 2 con la misma madre y rechaza responder en
--        publicaciones cerradas o eliminadas (RN-05, RN-07), bloqueando la
--        fila de la publicacion para no cruzarse con un cierre en curso.
--      - Otro trigger impide cambiar id, madre, citada, publicacion, autor,
--        profundidad y fecha de creacion (RN-06; la fecha es la base de las
--        cuotas). Como la madre existe antes que la hija y no se
--        reasigna, no puede haber ciclos.
--   3. reaccion_publicacion y reaccion_respuesta: un «Me gusta» por usuario
--      y contenido, por PK (RN-08). Retirarlo es un DELETE fisico.
--
-- Los conteos (respuestas, Me gusta) se calculan con consultas: no hay
-- columnas acumuladas. fecha_ultima_actividad la actualiza el backend en la
-- misma transaccion cuando una respuesta queda visible.
--
-- Seguridad (criterio de la 023 y la 028): RLS habilitado sin politicas y
-- REVOKE ALL a anon, authenticated y PUBLIC en tablas, secuencias y
-- funciones. Las funciones fijan search_path = pg_catalog (criterio de la 019).
--
-- Antes de ejecutar en Supabase: las FK a usuario y producto toman un bloqueo
-- breve (SHARE ROW EXCLUSIVE) en esas tablas; con lock_timeout de 5 s, si
-- estan ocupadas la migracion falla limpia y basta con reintentarla.
--
-- Es reaplicable: IF NOT EXISTS, CREATE OR REPLACE y DROP TRIGGER IF EXISTS.
-- Requisitos previos: 028 aplicada.
-- Verificacion: docs/sql/tests/029_verificacion_comunidad.sql
-- ============================================================

BEGIN;

SET LOCAL lock_timeout = '5s';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.schema_version WHERE version = '028_rls_tablas_publicas'
    ) THEN
        RAISE EXCEPTION 'Preflight fallido: la migracion 028 debe estar aplicada antes de 029.';
    END IF;
END $$;

-- ---------- 1. Publicaciones ----------
CREATE TABLE IF NOT EXISTS public.publicacion_comunidad (
  id_publicacion         BIGSERIAL PRIMARY KEY,
  tipo                   VARCHAR(10) NOT NULL,
  id_producto            BIGINT NULL,
  id_autor               BIGINT NOT NULL,
  titulo                 VARCHAR(150) NOT NULL,
  contenido              TEXT NOT NULL,
  estado_moderacion      VARCHAR(20) NOT NULL DEFAULT 'PUBLICADA',
  oculta_por_moderacion  BOOLEAN NOT NULL DEFAULT FALSE,
  oculta_por_reportes    BOOLEAN NOT NULL DEFAULT FALSE,
  eliminada              BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_eliminacion      TIMESTAMP NULL,
  eliminada_por          BIGINT NULL,
  cerrada                BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_creacion         TIMESTAMP NOT NULL DEFAULT now(),
  fecha_edicion          TIMESTAMP NULL,
  fecha_ultima_actividad TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT fk_publicacion_comunidad_producto FOREIGN KEY (id_producto)
    REFERENCES public.producto (id_producto),
  CONSTRAINT fk_publicacion_comunidad_autor FOREIGN KEY (id_autor)
    REFERENCES public.usuario (id_usuario),
  CONSTRAINT fk_publicacion_comunidad_eliminada_por FOREIGN KEY (eliminada_por)
    REFERENCES public.usuario (id_usuario),
  CONSTRAINT chk_publicacion_comunidad_tipo
    CHECK (tipo IN ('GENERAL', 'PRODUCTO')),
  CONSTRAINT chk_publicacion_comunidad_tipo_producto CHECK (
    (tipo = 'GENERAL' AND id_producto IS NULL)
    OR (tipo = 'PRODUCTO' AND id_producto IS NOT NULL)),
  CONSTRAINT chk_publicacion_comunidad_titulo
    CHECK (char_length(btrim(titulo, E' \t\r\n')) BETWEEN 5 AND 150),
  CONSTRAINT chk_publicacion_comunidad_contenido
    CHECK (btrim(contenido, E' \t\r\n') <> '' AND char_length(contenido) <= 5000),
  CONSTRAINT chk_publicacion_comunidad_estado_moderacion
    CHECK (estado_moderacion IN ('PUBLICADA', 'PENDIENTE', 'RECHAZADA')),
  CONSTRAINT chk_publicacion_comunidad_eliminacion CHECK (
    (eliminada AND fecha_eliminacion IS NOT NULL AND eliminada_por IS NOT NULL)
    OR (NOT eliminada AND fecha_eliminacion IS NULL AND eliminada_por IS NULL))
);

COMMENT ON TABLE public.publicacion_comunidad IS
  'Publicaciones del foro (GENERAL o de un PRODUCTO). Eliminacion logica; no afecta resenas ni calificaciones.';

CREATE INDEX IF NOT EXISTS idx_publicacion_comunidad_general_actividad
  ON public.publicacion_comunidad (tipo, fecha_ultima_actividad DESC, id_publicacion DESC)
  WHERE NOT eliminada AND estado_moderacion = 'PUBLICADA'
    AND NOT oculta_por_moderacion AND NOT oculta_por_reportes;
CREATE INDEX IF NOT EXISTS idx_publicacion_comunidad_producto_actividad
  ON public.publicacion_comunidad (id_producto, fecha_ultima_actividad DESC, id_publicacion DESC)
  WHERE NOT eliminada AND estado_moderacion = 'PUBLICADA'
    AND NOT oculta_por_moderacion AND NOT oculta_por_reportes;
CREATE INDEX IF NOT EXISTS idx_publicacion_comunidad_general_recientes
  ON public.publicacion_comunidad (tipo, fecha_creacion DESC, id_publicacion DESC)
  WHERE NOT eliminada AND estado_moderacion = 'PUBLICADA'
    AND NOT oculta_por_moderacion AND NOT oculta_por_reportes;
CREATE INDEX IF NOT EXISTS idx_publicacion_comunidad_producto_recientes
  ON public.publicacion_comunidad (id_producto, fecha_creacion DESC, id_publicacion DESC)
  WHERE NOT eliminada AND estado_moderacion = 'PUBLICADA'
    AND NOT oculta_por_moderacion AND NOT oculta_por_reportes;
CREATE INDEX IF NOT EXISTS idx_publicacion_comunidad_producto
  ON public.publicacion_comunidad (id_producto);
CREATE INDEX IF NOT EXISTS idx_publicacion_comunidad_autor
  ON public.publicacion_comunidad (id_autor, fecha_creacion);

-- ---------- 2. Respuestas ----------
CREATE TABLE IF NOT EXISTS public.respuesta_comunidad (
  id_respuesta          BIGSERIAL PRIMARY KEY,
  id_publicacion        BIGINT NOT NULL,
  id_respuesta_padre    BIGINT NULL,
  id_respuesta_citada   BIGINT NULL,
  id_autor              BIGINT NOT NULL,
  contenido             TEXT NOT NULL,
  profundidad           SMALLINT NOT NULL,
  estado_moderacion     VARCHAR(20) NOT NULL DEFAULT 'PUBLICADA',
  oculta_por_moderacion BOOLEAN NOT NULL DEFAULT FALSE,
  oculta_por_reportes   BOOLEAN NOT NULL DEFAULT FALSE,
  eliminada             BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_eliminacion     TIMESTAMP NULL,
  eliminada_por         BIGINT NULL,
  fecha_creacion        TIMESTAMP NOT NULL DEFAULT now(),
  fecha_edicion         TIMESTAMP NULL,
  CONSTRAINT uk_respuesta_comunidad_publicacion UNIQUE (id_respuesta, id_publicacion),
  CONSTRAINT fk_respuesta_comunidad_publicacion FOREIGN KEY (id_publicacion)
    REFERENCES public.publicacion_comunidad (id_publicacion),
  CONSTRAINT fk_respuesta_comunidad_padre FOREIGN KEY (id_respuesta_padre, id_publicacion)
    REFERENCES public.respuesta_comunidad (id_respuesta, id_publicacion),
  CONSTRAINT fk_respuesta_comunidad_citada FOREIGN KEY (id_respuesta_citada, id_publicacion)
    REFERENCES public.respuesta_comunidad (id_respuesta, id_publicacion),
  CONSTRAINT fk_respuesta_comunidad_autor FOREIGN KEY (id_autor)
    REFERENCES public.usuario (id_usuario),
  CONSTRAINT fk_respuesta_comunidad_eliminada_por FOREIGN KEY (eliminada_por)
    REFERENCES public.usuario (id_usuario),
  CONSTRAINT chk_respuesta_comunidad_contenido
    CHECK (btrim(contenido, E' \t\r\n') <> '' AND char_length(contenido) <= 3000),
  CONSTRAINT chk_respuesta_comunidad_profundidad
    CHECK (profundidad BETWEEN 0 AND 2),
  CONSTRAINT chk_respuesta_comunidad_estado_moderacion
    CHECK (estado_moderacion IN ('PUBLICADA', 'PENDIENTE', 'RECHAZADA')),
  CONSTRAINT chk_respuesta_comunidad_eliminacion CHECK (
    (eliminada AND fecha_eliminacion IS NOT NULL AND eliminada_por IS NOT NULL)
    OR (NOT eliminada AND fecha_eliminacion IS NULL AND eliminada_por IS NULL))
);

COMMENT ON TABLE public.respuesta_comunidad IS
  'Respuestas del foro en 3 niveles (profundidad 0 a 2). La madre y la citada son de la misma publicacion.';

CREATE INDEX IF NOT EXISTS idx_respuesta_comunidad_nivel
  ON public.respuesta_comunidad (id_publicacion, id_respuesta_padre, fecha_creacion, id_respuesta);
CREATE INDEX IF NOT EXISTS idx_respuesta_comunidad_citada
  ON public.respuesta_comunidad (id_respuesta_citada);
CREATE INDEX IF NOT EXISTS idx_respuesta_comunidad_autor
  ON public.respuesta_comunidad (id_autor, fecha_creacion);

CREATE OR REPLACE FUNCTION public.fn_validar_insert_respuesta_comunidad()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
DECLARE
    v_citada_padre BIGINT;
    v_citada_profundidad SMALLINT;
    v_cerrada BOOLEAN;
    v_eliminada BOOLEAN;
    v_profundidad_madre SMALLINT;
    v_esperada SMALLINT;
BEGIN
    -- FOR NO KEY UPDATE: si otra transaccion esta cerrando o eliminando la
    -- publicacion, esta respuesta espera y ve el valor final (RN-07). No se
    -- usa FOR SHARE: el backend actualiza fecha_ultima_actividad en la misma
    -- transaccion y dos respuestas simultaneas se interbloquearian.
    SELECT cerrada, eliminada INTO v_cerrada, v_eliminada
      FROM public.publicacion_comunidad
     WHERE id_publicacion = NEW.id_publicacion
       FOR NO KEY UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'La publicacion % no existe.', NEW.id_publicacion;
    END IF;
    IF v_cerrada OR v_eliminada THEN
        RAISE EXCEPTION 'No se puede responder en una publicacion cerrada o eliminada.';
    END IF;

    IF NEW.id_respuesta_padre IS NULL THEN
        v_esperada := 0;
    ELSE
        SELECT profundidad INTO v_profundidad_madre
          FROM public.respuesta_comunidad
         WHERE id_respuesta = NEW.id_respuesta_padre
           AND id_publicacion = NEW.id_publicacion;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'La respuesta madre no pertenece a la publicacion %.', NEW.id_publicacion;
        END IF;
        v_esperada := v_profundidad_madre + 1;
    END IF;

    IF v_esperada > 2 THEN
        RAISE EXCEPTION 'La profundidad maxima de las respuestas es 2.';
    END IF;
    IF NEW.profundidad IS NOT NULL AND NEW.profundidad <> v_esperada THEN
        RAISE EXCEPTION 'La profundidad % no coincide con la esperada segun la madre (%).', NEW.profundidad, v_esperada;
    END IF;

    -- La cita solo existe para la hermana de nivel 2 (P1): la citada esta en
    -- el nivel 2 y tiene la misma madre que la respuesta nueva.
    IF NEW.id_respuesta_citada IS NOT NULL THEN
        SELECT id_respuesta_padre, profundidad INTO v_citada_padre, v_citada_profundidad
          FROM public.respuesta_comunidad
         WHERE id_respuesta = NEW.id_respuesta_citada
           AND id_publicacion = NEW.id_publicacion;
        IF NOT FOUND OR v_citada_profundidad <> 2
           OR v_citada_padre IS DISTINCT FROM NEW.id_respuesta_padre THEN
            RAISE EXCEPTION 'Solo se cita a una respuesta de nivel 2 con la misma madre.';
        END IF;
    END IF;
    NEW.profundidad := v_esperada;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validar_insert_respuesta_comunidad ON public.respuesta_comunidad;
CREATE TRIGGER trg_validar_insert_respuesta_comunidad
  BEFORE INSERT ON public.respuesta_comunidad
  FOR EACH ROW EXECUTE FUNCTION public.fn_validar_insert_respuesta_comunidad();

CREATE OR REPLACE FUNCTION public.fn_validar_update_respuesta_comunidad()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
    IF NEW.id_respuesta IS DISTINCT FROM OLD.id_respuesta
       OR NEW.id_publicacion IS DISTINCT FROM OLD.id_publicacion
       OR NEW.fecha_creacion IS DISTINCT FROM OLD.fecha_creacion
       OR NEW.id_respuesta_padre IS DISTINCT FROM OLD.id_respuesta_padre
       OR NEW.id_respuesta_citada IS DISTINCT FROM OLD.id_respuesta_citada
       OR NEW.id_autor IS DISTINCT FROM OLD.id_autor
       OR NEW.profundidad IS DISTINCT FROM OLD.profundidad THEN
        RAISE EXCEPTION 'El id, la publicacion, la madre, la citada, el autor, la profundidad y la fecha de creacion de una respuesta no cambian.';
    END IF;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validar_update_respuesta_comunidad ON public.respuesta_comunidad;
CREATE TRIGGER trg_validar_update_respuesta_comunidad
  BEFORE UPDATE ON public.respuesta_comunidad
  FOR EACH ROW EXECUTE FUNCTION public.fn_validar_update_respuesta_comunidad();

CREATE OR REPLACE FUNCTION public.fn_validar_update_publicacion_comunidad()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
    IF NEW.id_publicacion IS DISTINCT FROM OLD.id_publicacion
       OR NEW.fecha_creacion IS DISTINCT FROM OLD.fecha_creacion
       OR NEW.id_autor IS DISTINCT FROM OLD.id_autor
       OR NEW.tipo IS DISTINCT FROM OLD.tipo
       OR NEW.id_producto IS DISTINCT FROM OLD.id_producto THEN
        RAISE EXCEPTION 'El id, el autor, el tipo, el producto y la fecha de creacion de una publicacion no cambian.';
    END IF;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validar_update_publicacion_comunidad ON public.publicacion_comunidad;
CREATE TRIGGER trg_validar_update_publicacion_comunidad
  BEFORE UPDATE ON public.publicacion_comunidad
  FOR EACH ROW EXECUTE FUNCTION public.fn_validar_update_publicacion_comunidad();

-- ---------- 3. Me gusta ----------
CREATE TABLE IF NOT EXISTS public.reaccion_publicacion (
  id_publicacion BIGINT NOT NULL,
  id_usuario     BIGINT NOT NULL,
  tipo           VARCHAR(20) NOT NULL DEFAULT 'ME_GUSTA',
  fecha_creacion TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT pk_reaccion_publicacion PRIMARY KEY (id_publicacion, id_usuario),
  CONSTRAINT fk_reaccion_publicacion_publicacion FOREIGN KEY (id_publicacion)
    REFERENCES public.publicacion_comunidad (id_publicacion) ON DELETE CASCADE,
  CONSTRAINT fk_reaccion_publicacion_usuario FOREIGN KEY (id_usuario)
    REFERENCES public.usuario (id_usuario),
  CONSTRAINT chk_reaccion_publicacion_tipo CHECK (tipo IN ('ME_GUSTA'))
);

CREATE TABLE IF NOT EXISTS public.reaccion_respuesta (
  id_respuesta   BIGINT NOT NULL,
  id_usuario     BIGINT NOT NULL,
  tipo           VARCHAR(20) NOT NULL DEFAULT 'ME_GUSTA',
  fecha_creacion TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT pk_reaccion_respuesta PRIMARY KEY (id_respuesta, id_usuario),
  CONSTRAINT fk_reaccion_respuesta_respuesta FOREIGN KEY (id_respuesta)
    REFERENCES public.respuesta_comunidad (id_respuesta) ON DELETE CASCADE,
  CONSTRAINT fk_reaccion_respuesta_usuario FOREIGN KEY (id_usuario)
    REFERENCES public.usuario (id_usuario),
  CONSTRAINT chk_reaccion_respuesta_tipo CHECK (tipo IN ('ME_GUSTA'))
);

CREATE INDEX IF NOT EXISTS idx_reaccion_publicacion_usuario
  ON public.reaccion_publicacion (id_usuario);
CREATE INDEX IF NOT EXISTS idx_reaccion_respuesta_usuario
  ON public.reaccion_respuesta (id_usuario);

-- ---------- 4. Seguridad ----------
ALTER TABLE public.publicacion_comunidad ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.respuesta_comunidad ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reaccion_publicacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reaccion_respuesta ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.publicacion_comunidad FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.respuesta_comunidad FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.reaccion_publicacion FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.reaccion_respuesta FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.publicacion_comunidad_id_publicacion_seq FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.respuesta_comunidad_id_respuesta_seq FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_validar_insert_respuesta_comunidad() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_validar_update_respuesta_comunidad() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_validar_update_publicacion_comunidad() FROM PUBLIC, anon, authenticated;

INSERT INTO public.schema_version (version, descripcion)
VALUES (
  '029_comunidad',
  'Comunidad: publicaciones, respuestas en 3 niveles y Me gusta, con RLS sin politicas'
)
ON CONFLICT (version) DO NOTHING;

COMMIT;
