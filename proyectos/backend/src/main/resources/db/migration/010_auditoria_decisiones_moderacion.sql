BEGIN;

-- Fase 2: auditoría de decisiones de moderación y ocultamiento manual de reseñas.
-- No reutiliza reporte_resena_historial: esa tabla audita reasignaciones de reportes.

CREATE TABLE IF NOT EXISTS public.schema_version (
    version VARCHAR(50) PRIMARY KEY,
    descripcion VARCHAR(255) NOT NULL,
    aplicado_en TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.schema_version
        WHERE version = '010_auditoria_decisiones_moderacion'
    ) THEN
        RAISE EXCEPTION 'La migración 010_auditoria_decisiones_moderacion ya está registrada.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.schema_version
        WHERE version = '007_moderacion_reportes'
    ) THEN
        RAISE EXCEPTION 'Preflight fallido: debe estar aplicada la migración 007_moderacion_reportes.';
    END IF;

    IF to_regclass('public.resena') IS NULL OR to_regclass('public.usuario') IS NULL
       OR to_regclass('public.reporte_resena') IS NULL
       OR to_regclass('public.usuario_rol') IS NULL THEN
        RAISE EXCEPTION 'Preflight fallido: faltan public.resena, public.usuario, public.reporte_resena o public.usuario_rol.';
    END IF;
END $$;

LOCK TABLE public.resena IN ACCESS EXCLUSIVE MODE;
LOCK TABLE public.reporte_resena IN SHARE ROW EXCLUSIVE MODE;

-- Actualizar la validación del responsable para usar las asignaciones multirrol activas
-- introducidas en la Fase 1, no el campo heredado usuario.id_rol.
CREATE OR REPLACE FUNCTION public.fn_validar_transicion_moderacion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_responsable_autorizado BOOLEAN;
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.estado <> 'PENDIENTE' THEN
            RAISE EXCEPTION
                'Operación denegada: un nuevo reporte debe crearse en estado PENDIENTE (estado intentado: %)',
                NEW.estado;
        END IF;

        IF NEW.id_responsable IS NOT NULL
           OR NEW.fecha_inicio_revision IS NOT NULL
           OR NEW.fecha_revision IS NOT NULL
           OR NEW.notas_revision IS NOT NULL
           OR NEW.id_historial_reasignacion IS NOT NULL THEN
            RAISE EXCEPTION
                'Operación denegada: un nuevo reporte no puede incluir datos de moderación en su creación';
        END IF;

        RETURN NEW;
    END IF;

    IF NEW.id_responsable IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1
            FROM public.usuario u
            JOIN public.usuario_rol ur
              ON ur.id_usuario = u.id_usuario
             AND ur.estado = TRUE
            JOIN public.rol r
              ON r.id_rol = ur.id_rol
            WHERE u.id_usuario = NEW.id_responsable
              AND u.estado = TRUE
              AND LOWER(TRIM(r.nombre)) IN ('administrador', 'moderador')
        )
        INTO v_responsable_autorizado;

        IF NOT COALESCE(v_responsable_autorizado, FALSE) THEN
            RAISE EXCEPTION
                'Operación denegada: el responsable debe ser una cuenta activa con asignación activa de Administrador o Moderador (id_usuario: %)',
                NEW.id_responsable;
        END IF;
    END IF;

    IF OLD.estado = 'PENDIENTE' THEN
        IF NEW.estado <> 'EN_REVISION' THEN
            RAISE EXCEPTION
                'Transición inválida: un reporte PENDIENTE solo puede pasar a EN_REVISION (se intentó pasar a %)',
                NEW.estado;
        END IF;

        IF NEW.id_responsable IS NULL OR NEW.fecha_inicio_revision IS NULL THEN
            RAISE EXCEPTION
                'Iniciar revisión exige id_responsable y fecha_inicio_revision no nulos';
        END IF;

        IF NEW.fecha_revision IS NOT NULL OR NEW.notas_revision IS NOT NULL THEN
            RAISE EXCEPTION
                'Iniciar revisión no permite fecha_revision ni notas_revision';
        END IF;

        IF NEW.id_historial_reasignacion IS NOT NULL THEN
            RAISE EXCEPTION
                'Iniciar revisión no debe tener id_historial_reasignacion';
        END IF;

    ELSIF OLD.estado = 'EN_REVISION' THEN
        IF NEW.estado = 'EN_REVISION' THEN
            IF NEW.id_responsable IS NOT DISTINCT FROM OLD.id_responsable THEN
                RAISE EXCEPTION
                    'Actualización denegada: en estado EN_REVISION solo se permite la reasignación a un responsable diferente';
            END IF;

            IF NEW.fecha_inicio_revision IS NULL OR NEW.fecha_inicio_revision <= OLD.fecha_inicio_revision THEN
                RAISE EXCEPTION
                    'La reasignación exige una fecha_inicio_revision posterior a la anterior';
            END IF;

            IF NEW.fecha_revision IS NOT NULL OR NEW.notas_revision IS NOT NULL THEN
                RAISE EXCEPTION
                    'Un reporte en EN_REVISION no puede tener fecha_revision ni notas_revision';
            END IF;

            IF NEW.id_historial_reasignacion IS NULL OR NEW.id_historial_reasignacion IS NOT DISTINCT FROM OLD.id_historial_reasignacion THEN
                RAISE EXCEPTION
                    'La reasignación exige un nuevo id_historial_reasignacion vinculado';
            END IF;

        ELSIF NEW.estado IN ('ACEPTADO', 'RECHAZADO') THEN
            IF NEW.id_responsable IS DISTINCT FROM OLD.id_responsable THEN
                RAISE EXCEPTION
                    'No se permite cambiar el responsable al emitir la decisión final';
            END IF;

            IF NEW.fecha_inicio_revision IS DISTINCT FROM OLD.fecha_inicio_revision THEN
                RAISE EXCEPTION
                    'No se permite alterar la fecha de inicio de revisión al emitir la decisión final';
            END IF;

            IF NEW.fecha_revision IS NULL OR NEW.fecha_revision < NEW.fecha_inicio_revision THEN
                RAISE EXCEPTION
                    'La decisión final exige una fecha_revision válida y cronológicamente coherente';
            END IF;

            IF NEW.notas_revision IS NULL OR TRIM(NEW.notas_revision) = '' THEN
                RAISE EXCEPTION
                    'La decisión final exige notas_revision no vacías';
            END IF;

            IF NEW.id_historial_reasignacion IS DISTINCT FROM OLD.id_historial_reasignacion THEN
                RAISE EXCEPTION
                    'No se permite alterar id_historial_reasignacion durante la decisión final';
            END IF;

        ELSE
            RAISE EXCEPTION
                'Transición inválida desde EN_REVISION a %',
                NEW.estado;
        END IF;

    ELSIF OLD.estado IN ('ACEPTADO', 'RECHAZADO') THEN
        RAISE EXCEPTION
            'Operación denegada: un reporte en estado final (%) es inmutable y no puede reabrirse',
            OLD.estado;
    END IF;

    RETURN NEW;
END;
$$;


ALTER TABLE public.resena
    ADD COLUMN IF NOT EXISTS oculta_por_moderacion BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS moderada_por BIGINT NULL,
    ADD COLUMN IF NOT EXISTS fecha_moderacion TIMESTAMP WITHOUT TIME ZONE NULL,
    ADD COLUMN IF NOT EXISTS motivo_moderacion TEXT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_resena_moderada_por'
          AND conrelid = 'public.resena'::regclass
    ) THEN
        ALTER TABLE public.resena
            ADD CONSTRAINT fk_resena_moderada_por
            FOREIGN KEY (moderada_por)
            REFERENCES public.usuario(id_usuario)
            ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_resena_ocultamiento_manual_coherente'
          AND conrelid = 'public.resena'::regclass
    ) THEN
        ALTER TABLE public.resena
            ADD CONSTRAINT chk_resena_ocultamiento_manual_coherente
            CHECK (
                (
                    oculta_por_moderacion = FALSE
                    AND moderada_por IS NULL
                    AND fecha_moderacion IS NULL
                    AND motivo_moderacion IS NULL
                )
                OR
                (
                    oculta_por_moderacion = TRUE
                    AND moderada_por IS NOT NULL
                    AND fecha_moderacion IS NOT NULL
                    AND motivo_moderacion IS NOT NULL
                    AND TRIM(motivo_moderacion) <> ''
                )
            );
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.reporte_resena_decision_auditoria (
    id_auditoria BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_reporte BIGINT NOT NULL,
    id_moderador BIGINT NOT NULL,
    estado_anterior VARCHAR(20) NOT NULL,
    estado_nuevo VARCHAR(20) NOT NULL,
    observacion TEXT NULL,
    fecha_evento TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reporte_decision_auditoria_reporte
        FOREIGN KEY (id_reporte) REFERENCES public.reporte_resena(id_reporte) ON DELETE RESTRICT,
    CONSTRAINT fk_reporte_decision_auditoria_moderador
        FOREIGN KEY (id_moderador) REFERENCES public.usuario(id_usuario) ON DELETE RESTRICT,
    CONSTRAINT chk_reporte_decision_auditoria_estado_anterior
        CHECK (estado_anterior IN ('PENDIENTE', 'EN_REVISION', 'ACEPTADO', 'RECHAZADO')),
    CONSTRAINT chk_reporte_decision_auditoria_estado_nuevo
        CHECK (estado_nuevo IN ('PENDIENTE', 'EN_REVISION', 'ACEPTADO', 'RECHAZADO')),
    CONSTRAINT chk_reporte_decision_auditoria_transicion
        CHECK (
            (estado_anterior = 'PENDIENTE' AND estado_nuevo = 'EN_REVISION')
            OR
            (estado_anterior = 'EN_REVISION' AND estado_nuevo IN ('ACEPTADO', 'RECHAZADO'))
        )
);

CREATE INDEX IF NOT EXISTS idx_reporte_decision_auditoria_reporte_fecha
    ON public.reporte_resena_decision_auditoria (id_reporte, fecha_evento DESC);

CREATE INDEX IF NOT EXISTS idx_reporte_decision_auditoria_moderador_fecha
    ON public.reporte_resena_decision_auditoria (id_moderador, fecha_evento DESC);

CREATE OR REPLACE FUNCTION public.fn_proteger_inmutabilidad_reporte_decision_auditoria()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION
        'Operación denegada: reporte_resena_decision_auditoria es append-only; no se permiten UPDATE ni DELETE.';
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_inmutabilidad_reporte_decision_auditoria
    ON public.reporte_resena_decision_auditoria;

CREATE TRIGGER trg_proteger_inmutabilidad_reporte_decision_auditoria
BEFORE UPDATE OR DELETE ON public.reporte_resena_decision_auditoria
FOR EACH ROW
EXECUTE FUNCTION public.fn_proteger_inmutabilidad_reporte_decision_auditoria();

CREATE OR REPLACE FUNCTION public.fn_proteger_truncate_reporte_decision_auditoria()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION
        'Operación denegada: reporte_resena_decision_auditoria no puede ser truncada.';
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_truncate_reporte_decision_auditoria
    ON public.reporte_resena_decision_auditoria;

CREATE TRIGGER trg_proteger_truncate_reporte_decision_auditoria
BEFORE TRUNCATE ON public.reporte_resena_decision_auditoria
FOR EACH STATEMENT
EXECUTE FUNCTION public.fn_proteger_truncate_reporte_decision_auditoria();

CREATE TABLE IF NOT EXISTS public.resena_moderacion_auditoria (
    id_auditoria BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_resena BIGINT NOT NULL,
    id_moderador BIGINT NOT NULL,
    accion VARCHAR(20) NOT NULL,
    motivo TEXT NOT NULL,
    fecha_evento TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_resena_moderacion_auditoria_resena
        FOREIGN KEY (id_resena) REFERENCES public.resena(id_resena) ON DELETE RESTRICT,
    CONSTRAINT fk_resena_moderacion_auditoria_moderador
        FOREIGN KEY (id_moderador) REFERENCES public.usuario(id_usuario) ON DELETE RESTRICT,
    CONSTRAINT chk_resena_moderacion_auditoria_accion
        CHECK (accion IN ('OCULTAR', 'RESTAURAR')),
    CONSTRAINT chk_resena_moderacion_auditoria_motivo
        CHECK (TRIM(motivo) <> '')
);

CREATE INDEX IF NOT EXISTS idx_resena_moderacion_auditoria_resena_fecha
    ON public.resena_moderacion_auditoria (id_resena, fecha_evento DESC);

CREATE INDEX IF NOT EXISTS idx_resena_moderacion_auditoria_moderador_fecha
    ON public.resena_moderacion_auditoria (id_moderador, fecha_evento DESC);

CREATE INDEX IF NOT EXISTS idx_resena_publica_sin_ocultamientos
    ON public.resena (id_producto, fecha_creacion DESC)
    WHERE estado = TRUE
      AND oculta_por_reportes = FALSE
      AND oculta_por_moderacion = FALSE;

CREATE OR REPLACE FUNCTION public.fn_proteger_inmutabilidad_resena_moderacion_auditoria()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION
        'Operación denegada: resena_moderacion_auditoria es append-only; no se permiten UPDATE ni DELETE.';
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_inmutabilidad_resena_moderacion_auditoria
    ON public.resena_moderacion_auditoria;

CREATE TRIGGER trg_proteger_inmutabilidad_resena_moderacion_auditoria
BEFORE UPDATE OR DELETE ON public.resena_moderacion_auditoria
FOR EACH ROW
EXECUTE FUNCTION public.fn_proteger_inmutabilidad_resena_moderacion_auditoria();

CREATE OR REPLACE FUNCTION public.fn_proteger_truncate_resena_moderacion_auditoria()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION
        'Operación denegada: resena_moderacion_auditoria no puede ser truncada.';
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_truncate_resena_moderacion_auditoria
    ON public.resena_moderacion_auditoria;

CREATE TRIGGER trg_proteger_truncate_resena_moderacion_auditoria
BEFORE TRUNCATE ON public.resena_moderacion_auditoria
FOR EACH STATEMENT
EXECUTE FUNCTION public.fn_proteger_truncate_resena_moderacion_auditoria();

INSERT INTO public.schema_version (version, descripcion)
VALUES (
    '010_auditoria_decisiones_moderacion',
    'Auditoria append-only de decisiones sobre reportes y ocultamiento manual independiente del borrado logico y del ocultamiento automatico por reportes.'
);

COMMIT;
