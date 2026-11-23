-- ============================================================
-- MIGRACION 027: TERMINOS DE MODERACION ADMINISTRABLES
-- Caso 6 (moderacion inteligente), prioridad media
-- ============================================================
-- Problema:
--   La lista de palabras del filtro automatico esta fija en el codigo. Un
--   insulto nuevo o un termino discriminatorio solo se podia agregar con un
--   despliegue.
--
-- Cambios:
--   1. Tabla termino_moderacion: una fila por termino, con el texto que
--      escribio el administrador, su forma normalizada (la calcula el
--      backend con la misma normalizacion del filtro), la categoria, quien
--      lo creo y cuando y, al desactivarlo, quien y cuando.
--   2. Indice unico parcial: no puede haber dos terminos activos con la
--      misma forma normalizada. Reactivar es volver a agregar (fila nueva).
--   3. Validacion al insertar: se crea activo, por un administrador activo.
--   4. Validacion al actualizar: solo se permite desactivar, una vez, por un
--      administrador activo; el resto de columnas no cambia.
--   5. Se prohiben DELETE y TRUNCATE.
--
-- Los terminos agregados solo los evalua el backend: no se exponen al
-- navegador. La lista base sigue en el codigo.
--
-- Todas las funciones fijan search_path = pg_catalog (criterio de la 019).
-- La tabla no se otorga a anon ni authenticated (criterio de la 023).
--
-- Requisitos previos: 026 aplicada.
-- Despliegue: el backend que usa la entidad TerminoModeracion necesita esta
-- tabla (ddl-auto=validate). Aplicar ANTES de desplegar ese backend.
-- ============================================================

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.schema_version WHERE version = '026_apelaciones'
    ) THEN
        RAISE EXCEPTION 'Preflight fallido: la migracion 026 debe estar aplicada antes de 027.';
    END IF;
END $$;

-- 1. Tabla.
CREATE TABLE IF NOT EXISTS public.termino_moderacion (
  id_termino           BIGSERIAL PRIMARY KEY,
  termino              VARCHAR(60) NOT NULL,
  termino_normalizado  VARCHAR(60) NOT NULL,
  categoria            VARCHAR(20) NOT NULL,
  activo               BOOLEAN NOT NULL DEFAULT TRUE,
  id_creado_por        BIGINT NOT NULL,
  fecha_creacion       TIMESTAMP NOT NULL DEFAULT now(),
  id_desactivado_por   BIGINT NULL,
  fecha_desactivacion  TIMESTAMP NULL,
  CONSTRAINT fk_termino_moderacion_creado_por FOREIGN KEY (id_creado_por)
    REFERENCES public.usuario (id_usuario),
  CONSTRAINT fk_termino_moderacion_desactivado_por FOREIGN KEY (id_desactivado_por)
    REFERENCES public.usuario (id_usuario),
  CONSTRAINT chk_termino_moderacion_categoria
    CHECK (categoria IN ('AMENAZA', 'ACOSO', 'DISCRIMINACION', 'INSULTO', 'SPAM')),
  CONSTRAINT chk_termino_moderacion_longitud
    CHECK (char_length(btrim(termino)) BETWEEN 2 AND 60
           AND char_length(btrim(termino_normalizado)) BETWEEN 2 AND 60),
  CONSTRAINT chk_termino_moderacion_desactivacion CHECK (
    (activo AND id_desactivado_por IS NULL AND fecha_desactivacion IS NULL)
    OR (NOT activo AND id_desactivado_por IS NOT NULL AND fecha_desactivacion IS NOT NULL))
);

COMMENT ON TABLE public.termino_moderacion IS
  'Terminos agregados por administradores al filtro automatico. Solo los evalua el backend; no se borran, se desactivan.';

-- 2. Un solo termino activo por forma normalizada.
CREATE UNIQUE INDEX IF NOT EXISTS uk_termino_moderacion_activo
  ON public.termino_moderacion (termino_normalizado) WHERE activo;

-- 3. Validacion al insertar.
CREATE OR REPLACE FUNCTION public.fn_validar_insert_termino_moderacion()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
    IF NEW.activo IS DISTINCT FROM TRUE THEN
        RAISE EXCEPTION 'Un termino de moderacion se crea activo.';
    END IF;
    IF NOT public.fn_usuario_tiene_rol_activo(NEW.id_creado_por, ARRAY['administrador']) THEN
        RAISE EXCEPTION 'Solo un administrador con cuenta y rol activo puede agregar terminos de moderacion.';
    END IF;
    NEW.fecha_creacion := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_insert_termino_moderacion ON public.termino_moderacion;
CREATE TRIGGER trg_validar_insert_termino_moderacion
BEFORE INSERT ON public.termino_moderacion
FOR EACH ROW EXECUTE FUNCTION public.fn_validar_insert_termino_moderacion();

-- 4. Validacion al actualizar: solo desactivar, una vez.
CREATE OR REPLACE FUNCTION public.fn_validar_update_termino_moderacion()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
    IF OLD.activo IS DISTINCT FROM TRUE THEN
        RAISE EXCEPTION 'El termino de moderacion % ya esta desactivado.', OLD.id_termino;
    END IF;
    IF NEW.activo IS DISTINCT FROM FALSE THEN
        RAISE EXCEPTION 'Un termino de moderacion activo solo se puede desactivar.';
    END IF;
    IF NEW.termino IS DISTINCT FROM OLD.termino
       OR NEW.termino_normalizado IS DISTINCT FROM OLD.termino_normalizado
       OR NEW.categoria IS DISTINCT FROM OLD.categoria
       OR NEW.id_creado_por IS DISTINCT FROM OLD.id_creado_por
       OR NEW.fecha_creacion IS DISTINCT FROM OLD.fecha_creacion THEN
        RAISE EXCEPTION 'Los datos de un termino de moderacion no se pueden modificar.';
    END IF;
    IF NOT public.fn_usuario_tiene_rol_activo(NEW.id_desactivado_por, ARRAY['administrador']) THEN
        RAISE EXCEPTION 'Solo un administrador con cuenta y rol activo puede desactivar terminos de moderacion.';
    END IF;
    NEW.fecha_desactivacion := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_update_termino_moderacion ON public.termino_moderacion;
CREATE TRIGGER trg_validar_update_termino_moderacion
BEFORE UPDATE ON public.termino_moderacion
FOR EACH ROW EXECUTE FUNCTION public.fn_validar_update_termino_moderacion();

-- 5. Sin borrados.
CREATE OR REPLACE FUNCTION public.fn_proteger_termino_moderacion()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
    RAISE EXCEPTION 'Los terminos de moderacion no se borran: se desactivan.';
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_delete_termino_moderacion ON public.termino_moderacion;
CREATE TRIGGER trg_proteger_delete_termino_moderacion
BEFORE DELETE ON public.termino_moderacion
FOR EACH ROW EXECUTE FUNCTION public.fn_proteger_termino_moderacion();

DROP TRIGGER IF EXISTS trg_proteger_truncate_termino_moderacion ON public.termino_moderacion;
CREATE TRIGGER trg_proteger_truncate_termino_moderacion
BEFORE TRUNCATE ON public.termino_moderacion
FOR EACH STATEMENT EXECUTE FUNCTION public.fn_proteger_termino_moderacion();

-- 6. Sin acceso desde la API publica de Supabase.
REVOKE ALL ON TABLE public.termino_moderacion FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.termino_moderacion_id_termino_seq FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_validar_insert_termino_moderacion() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_validar_update_termino_moderacion() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_proteger_termino_moderacion() FROM PUBLIC, anon, authenticated;

INSERT INTO public.schema_version (version, descripcion)
VALUES (
  '027_terminos_moderacion',
  'Terminos de moderacion administrables por categoria'
)
ON CONFLICT (version) DO NOTHING;

COMMIT;
