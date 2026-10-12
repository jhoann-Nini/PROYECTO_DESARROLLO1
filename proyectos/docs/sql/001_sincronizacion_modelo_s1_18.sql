
BEGIN;

-- 0. Registro de migraciones
CREATE TABLE IF NOT EXISTS public.schema_version (
    version VARCHAR(50) PRIMARY KEY,
    descripcion VARCHAR(255) NOT NULL,
    aplicado_en TIMESTAMP WITHOUT TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 1. Relación Usuario 1:N Establecimiento
ALTER TABLE public.establecimiento
    ADD COLUMN IF NOT EXISTS id_usuario BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_establecimiento_usuario'
          AND conrelid = 'public.establecimiento'::regclass
    ) THEN
        ALTER TABLE public.establecimiento
            ADD CONSTRAINT fk_establecimiento_usuario
            FOREIGN KEY (id_usuario)
            REFERENCES public.usuario(id_usuario)
            ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_establecimiento_id_usuario
    ON public.establecimiento(id_usuario);

-- 2. Borrado lógico de valoraciones
ALTER TABLE public.valoracion
    ADD COLUMN IF NOT EXISTS estado BOOLEAN NOT NULL DEFAULT TRUE;

-- 3. Validar puntuación entre 1 y 5
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_valoracion_puntuacion'
          AND conrelid = 'public.valoracion'::regclass
    ) THEN
        ALTER TABLE public.valoracion
            ADD CONSTRAINT chk_valoracion_puntuacion
            CHECK (puntuacion BETWEEN 1 AND 5);
    END IF;
END $$;

-- 4. Una valoración activa por usuario y producto
CREATE UNIQUE INDEX IF NOT EXISTS
    uq_valoracion_usuario_producto_activa
    ON public.valoracion (id_usuario, id_producto)
    WHERE estado = TRUE;

-- 5. Una reseña activa por usuario y producto
CREATE UNIQUE INDEX IF NOT EXISTS
    uq_resena_usuario_producto_activa
    ON public.resena (id_usuario, id_producto)
    WHERE estado = TRUE;

-- 6. Características técnicas flexibles
ALTER TABLE public.producto
    ADD COLUMN IF NOT EXISTS caracteristicas JSONB;

CREATE INDEX IF NOT EXISTS idx_producto_caracteristicas
    ON public.producto USING GIN (caracteristicas);

-- 7. Registrar la migración
INSERT INTO public.schema_version (version, descripcion)
VALUES (
    '001_sincronizacion_modelo_s1_18',
    'Acuerdos S1-18: representante, borrado logico, JSONB, validacion e indices unicos parciales'
)
ON CONFLICT (version) DO NOTHING;

COMMIT;
