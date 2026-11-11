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

    IF to_regclass('public.resena') IS NULL OR to_regclass('public.usuario') IS NULL THEN
        RAISE EXCEPTION 'Preflight fallido: no existen public.resena o public.usuario.';
    END IF;
END $$;

LOCK TABLE public.resena IN ACCESS EXCLUSIVE MODE;

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
    'Auditoria append-only de decisiones de moderacion y ocultamiento manual independiente del borrado logico y del ocultamiento automatico por reportes.'
);

COMMIT;
