BEGIN;

-- ============================================================================
-- MIGRACIÓN 006: TABLA DE REPORTES DE RESEÑAS Y OCULTAMIENTO POR MODERACIÓN
--
-- Reglas de negocio:
-- 1. Solo usuarios autenticados pueden reportar. La autenticación se valida
--    en el backend y la FK garantiza la existencia del usuario.
-- 2. Un usuario solo puede reportar una vez cada reseña.
-- 3. No se permite reportar una reseña propia.
-- 4. Motivos: spam, lenguaje-ofensivo, falso y otro.
-- 5. La descripción es obligatoria cuando el motivo sea otro.
-- 6. Estados: PENDIENTE, EN_REVISION, ACEPTADO y RECHAZADO.
-- 7. Una reseña se oculta al alcanzar tres reportes de usuarios diferentes
--    cuyo estado no sea RECHAZADO.
-- 8. Si el contador baja de tres, la reseña vuelve a mostrarse, siempre que
--    no haya sido eliminada lógicamente por su autor.
-- 9. El borrado lógico del autor se conserva en resena.estado.
-- 10. Los campos id_resena e id_usuario son inmutables en reportes existentes.
-- ============================================================================


-- 0. Garantizar la existencia de la tabla de control de versiones

CREATE TABLE IF NOT EXISTS public.schema_version (
    version VARCHAR(50) PRIMARY KEY,
    descripcion VARCHAR(255) NOT NULL,
    aplicado_en TIMESTAMP WITHOUT TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- 1. Verificar que la migración no haya sido aplicada

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.schema_version
        WHERE version = '006_reportes_resenas'
    ) THEN
        RAISE EXCEPTION
            'La migración 006_reportes_resenas ya está registrada. No se aplicarán cambios.';
    END IF;
END $$;


-- 2. Bloquear resena antes de modificar su estructura

LOCK TABLE public.resena
IN ACCESS EXCLUSIVE MODE;


-- 3. Agregar la columna de ocultamiento por moderación

ALTER TABLE public.resena
    ADD COLUMN IF NOT EXISTS oculta_por_reportes
    BOOLEAN NOT NULL DEFAULT FALSE;


-- 4. Crear tabla de reportes

CREATE TABLE IF NOT EXISTS public.reporte_resena (
    id_reporte BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_resena BIGINT NOT NULL,
    id_usuario BIGINT NOT NULL,

    motivo VARCHAR(30) NOT NULL,
    descripcion TEXT,

    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',

    fecha_creacion TIMESTAMP WITHOUT TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    fecha_actualizacion TIMESTAMP WITHOUT TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_reporte_resena_resena
        FOREIGN KEY (id_resena)
        REFERENCES public.resena (id_resena)
        ON DELETE CASCADE,

    CONSTRAINT fk_reporte_resena_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES public.usuario (id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_reporte_resena_motivo
        CHECK (
            motivo IN (
                'spam',
                'lenguaje-ofensivo',
                'falso',
                'otro'
            )
        ),

    CONSTRAINT chk_reporte_resena_descripcion
        CHECK (
            motivo <> 'otro'
            OR (
                descripcion IS NOT NULL
                AND TRIM(descripcion) <> ''
            )
        ),

    CONSTRAINT chk_reporte_resena_estado
        CHECK (
            estado IN (
                'PENDIENTE',
                'EN_REVISION',
                'ACEPTADO',
                'RECHAZADO'
            )
        ),

    CONSTRAINT uq_reporte_usuario_resena
        UNIQUE (id_usuario, id_resena)
);


-- 5. Índices

-- Búsqueda de reportes por reseña.
-- También facilita las operaciones relacionadas con la FK.
CREATE INDEX IF NOT EXISTS idx_reporte_resena_id_resena
    ON public.reporte_resena (id_resena);

-- Índice parcial para calcular los reportes que cuentan para el umbral.
-- La restricción UNIQUE garantiza un solo reporte por usuario y reseña.
CREATE INDEX IF NOT EXISTS idx_reporte_resena_activos
    ON public.reporte_resena (id_resena)
    WHERE estado <> 'RECHAZADO';

-- Bandeja de moderación ordenada por estado y fecha.
CREATE INDEX IF NOT EXISTS idx_reporte_resena_estado_fecha
    ON public.reporte_resena (estado, fecha_creacion DESC);

-- Consultas públicas: reseñas activas y no ocultas.
CREATE INDEX IF NOT EXISTS idx_resena_publica_activa
    ON public.resena (id_producto, fecha_creacion DESC)
    WHERE estado = TRUE
      AND oculta_por_reportes = FALSE;


-- 6. Actualizar fecha de modificación de los reportes

CREATE OR REPLACE FUNCTION public.fn_actualizar_fecha_reporte()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.fecha_actualizacion := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_actualizar_fecha_reporte
    ON public.reporte_resena;

CREATE TRIGGER trg_actualizar_fecha_reporte
BEFORE UPDATE ON public.reporte_resena
FOR EACH ROW
EXECUTE FUNCTION public.fn_actualizar_fecha_reporte();


-- 7. Proteger la inmutabilidad de la reseña y del usuario reportante

CREATE OR REPLACE FUNCTION public.fn_proteger_inmutabilidad_reporte()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.id_resena IS DISTINCT FROM OLD.id_resena THEN
        RAISE EXCEPTION
            'No se permite modificar la reseña asociada a un reporte existente (id_resena es inmutable)';
    END IF;

    IF NEW.id_usuario IS DISTINCT FROM OLD.id_usuario THEN
        RAISE EXCEPTION
            'No se permite modificar el usuario autor de un reporte existente (id_usuario es inmutable)';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_inmutabilidad_reporte
    ON public.reporte_resena;

CREATE TRIGGER trg_proteger_inmutabilidad_reporte
BEFORE UPDATE ON public.reporte_resena
FOR EACH ROW
EXECUTE FUNCTION public.fn_proteger_inmutabilidad_reporte();


-- 8. Impedir que un usuario reporte su propia reseña

CREATE OR REPLACE FUNCTION public.fn_validar_no_autoreporte()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.resena
        WHERE id_resena = NEW.id_resena
          AND id_usuario = NEW.id_usuario
    ) THEN
        RAISE EXCEPTION
            'No se permite reportar una reseña propia (id_resena: %, id_usuario: %)',
            NEW.id_resena,
            NEW.id_usuario;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_no_autoreporte
    ON public.reporte_resena;

CREATE TRIGGER trg_validar_no_autoreporte
BEFORE INSERT ON public.reporte_resena
FOR EACH ROW
EXECUTE FUNCTION public.fn_validar_no_autoreporte();


-- 9. Recalcular el ocultamiento de la reseña
--
-- FOR NO KEY UPDATE permite serializar las transacciones que afectan
-- una misma reseña sin entrar en conflicto con los bloqueos FOR KEY SHARE
-- utilizados por PostgreSQL para validar las claves foráneas.
--
-- COUNT(*) es equivalente a COUNT(DISTINCT id_usuario), debido a la
-- restricción UNIQUE (id_usuario, id_resena).

CREATE OR REPLACE FUNCTION public.fn_recalcular_ocultamiento_resena()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_id_resena BIGINT;
    v_reportes_activos BIGINT;
BEGIN

    -- Determinar la reseña afectada.
    IF TG_OP = 'DELETE' THEN
        v_id_resena := OLD.id_resena;
    ELSE
        v_id_resena := NEW.id_resena;
    END IF;

    -- Serializar el recálculo para esta reseña.
    PERFORM 1
    FROM public.resena
    WHERE id_resena = v_id_resena
    FOR NO KEY UPDATE;

    -- Contar reportes que no han sido rechazados.
    SELECT COUNT(*)
    INTO v_reportes_activos
    FROM public.reporte_resena
    WHERE id_resena = v_id_resena
      AND estado <> 'RECHAZADO';

    -- Aplicar el umbral de tres reportes.
    IF v_reportes_activos >= 3 THEN

        UPDATE public.resena
        SET oculta_por_reportes = TRUE
        WHERE id_resena = v_id_resena
          AND oculta_por_reportes = FALSE;

    ELSE

        UPDATE public.resena
        SET oculta_por_reportes = FALSE
        WHERE id_resena = v_id_resena
          AND oculta_por_reportes = TRUE;

    END IF;

    RETURN NULL;
END;
$$;


DROP TRIGGER IF EXISTS trg_recalcular_ocultamiento_reporte
    ON public.reporte_resena;

CREATE TRIGGER trg_recalcular_ocultamiento_reporte
AFTER INSERT OR UPDATE OF estado OR DELETE
ON public.reporte_resena
FOR EACH ROW
EXECUTE FUNCTION public.fn_recalcular_ocultamiento_resena();


-- 10. Registrar la migración

INSERT INTO public.schema_version (
    version,
    descripcion
)
VALUES (
    '006_reportes_resenas',
    'S2-38: Tabla de reportes de reseñas, restricciones de integridad, prevención de autoreporte, inmutabilidad y ocultamiento automático por tres reportes no rechazados.'
);


COMMIT;
