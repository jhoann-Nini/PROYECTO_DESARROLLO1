BEGIN;

-- ============================================================================
-- MIGRACIÓN 007: MODERACIÓN DE REPORTES, ROL MODERADOR Y AUDITORÍA DE REASIGNACIÓN
-- Proyecto: TecReview
-- Historia: S2-38 (Fase 2.2)
--
-- Reglas técnicas y funcionales:
-- 1. Inserción idempotente del rol 'Moderador' respetando uq_rol_nombre_normalizado.
-- 2. Prevención de degradación de usuarios con rol 'Administrador' a nivel de BD.
-- 3. Incorporación de id_responsable, fechas de revisión, notas_revision e
--    id_historial_reasignacion en public.reporte_resena.
-- 4. Creación de public.reporte_resena_historial como estructura append-only
--    para auditar cada reasignación manual realizada por un Administrador.
-- 5. Vinculación estricta y única de la reasignación con su evento de historial
--    mediante FK diferida y restricción UNIQUE (anti-reutilización de evento).
-- 6. Verificación al COMMIT (CONSTRAINT TRIGGER diferido) de la correspondencia
--    exacta entre el reporte reasignado y el historial generado.
-- 7. Protección de la máquina de estados:
--    PENDIENTE -> EN_REVISION -> ACEPTADO / RECHAZADO (estados finales inmutables).
-- 8. Inmutabilidad de los datos originales del reporte (id_resena, id_usuario,
--    motivo, descripcion, fecha_creacion).
-- 9. Conservación íntegra de la lógica reactiva de ocultamiento de la migración 006.
-- ============================================================================


-- ============================================================================
-- 0. Garantizar la existencia de la tabla de control de versiones
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.schema_version (
    version VARCHAR(50) PRIMARY KEY,
    descripcion VARCHAR(255) NOT NULL,
    aplicado_en TIMESTAMP WITHOUT TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================================
-- 1. Preflight Checks (Validaciones Previas Defensivas)
-- ============================================================================

DO $$
BEGIN
    -- 1.1 Verificar que la migración 007 no haya sido aplicada previamente
    IF EXISTS (
        SELECT 1
        FROM public.schema_version
        WHERE version = '007_moderacion_reportes'
    ) THEN
        RAISE EXCEPTION
            'La migración 007_moderacion_reportes ya está registrada. No se aplicarán cambios.';
    END IF;

    -- 1.2 Verificar que la migración 006 esté registrada
    IF NOT EXISTS (
        SELECT 1
        FROM public.schema_version
        WHERE version = '006_reportes_resenas'
    ) THEN
        RAISE EXCEPTION
            'Preflight fallido: la migración 006_reportes_resenas debe estar aplicada antes de 007.';
    END IF;

    -- 1.3 Verificar compatibilidad estructural de public.rol
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'rol'
    ) THEN
        RAISE EXCEPTION 'Preflight fallido: la tabla public.rol no existe.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'rol'
          AND indexname = 'uq_rol_nombre_normalizado'
    ) THEN
        RAISE EXCEPTION 'Preflight fallido: el índice uq_rol_nombre_normalizado no existe en public.rol.';
    END IF;

    -- 1.4 Verificar compatibilidad estructural de public.usuario
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'usuario'
    ) THEN
        RAISE EXCEPTION 'Preflight fallido: la tabla public.usuario no existe.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'usuario' AND column_name = 'id_rol'
    ) THEN
        RAISE EXCEPTION 'Preflight fallido: la columna id_rol no existe en public.usuario.';
    END IF;

    -- 1.5 Verificar compatibilidad estructural de public.reporte_resena
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'reporte_resena'
    ) THEN
        RAISE EXCEPTION 'Preflight fallido: la tabla public.reporte_resena no existe.';
    END IF;

    -- 1.6 Verificar que los registros actuales de reporte_resena sean compatibles con el nuevo CHECK
    IF EXISTS (
        SELECT 1
        FROM public.reporte_resena
        WHERE estado NOT IN ('PENDIENTE', 'EN_REVISION', 'ACEPTADO', 'RECHAZADO')
    ) THEN
        RAISE EXCEPTION 'Preflight fallido: existen registros con estados inválidos en public.reporte_resena.';
    END IF;
END $$;


-- ============================================================================
-- 2. Bloqueo de concurrencia DDL
-- ============================================================================

LOCK TABLE public.rol IN ACCESS EXCLUSIVE MODE;
LOCK TABLE public.usuario IN ACCESS EXCLUSIVE MODE;
LOCK TABLE public.reporte_resena IN ACCESS EXCLUSIVE MODE;


-- ============================================================================
-- 3. Inserción idempotente del rol Moderador
-- ============================================================================

INSERT INTO public.rol (nombre, descripcion)
SELECT
    'Moderador',
    'Rol para la gestión y moderación de reportes de reseñas'
WHERE NOT EXISTS (
    SELECT 1
    FROM public.rol
    WHERE LOWER(TRIM(nombre)) = LOWER('Moderador')
);


-- ============================================================================
-- 4. Protección contra degradación de Administradores
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_proteger_rol_administrador()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_id_rol_admin BIGINT;
BEGIN
    SELECT id_rol INTO v_id_rol_admin
    FROM public.rol
    WHERE LOWER(TRIM(nombre)) = 'administrador';

    IF v_id_rol_admin IS NOT NULL AND OLD.id_rol = v_id_rol_admin AND NEW.id_rol IS DISTINCT FROM v_id_rol_admin THEN
        RAISE EXCEPTION
            'Operación denegada: un usuario con rol Administrador no puede ser degradado a otro rol (id_usuario: %)',
            OLD.id_usuario;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_rol_administrador
    ON public.usuario;

CREATE TRIGGER trg_proteger_rol_administrador
BEFORE UPDATE OF id_rol ON public.usuario
FOR EACH ROW
EXECUTE FUNCTION public.fn_proteger_rol_administrador();


-- ============================================================================
-- 5. Incorporación de columnas nuevas en public.reporte_resena
-- ============================================================================

ALTER TABLE public.reporte_resena
    ADD COLUMN IF NOT EXISTS id_responsable BIGINT NULL,
    ADD COLUMN IF NOT EXISTS fecha_inicio_revision TIMESTAMP WITHOUT TIME ZONE NULL,
    ADD COLUMN IF NOT EXISTS fecha_revision TIMESTAMP WITHOUT TIME ZONE NULL,
    ADD COLUMN IF NOT EXISTS notas_revision TEXT NULL,
    ADD COLUMN IF NOT EXISTS id_historial_reasignacion BIGINT NULL;


-- Clave foránea id_responsable hacia public.usuario con ON DELETE RESTRICT
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_reporte_resena_responsable'
          AND conrelid = 'public.reporte_resena'::regclass
    ) THEN
        ALTER TABLE public.reporte_resena
            ADD CONSTRAINT fk_reporte_resena_responsable
            FOREIGN KEY (id_responsable)
            REFERENCES public.usuario (id_usuario)
            ON DELETE RESTRICT;
    END IF;
END $$;


-- ============================================================================
-- 6. Creación de la tabla de auditoría: public.reporte_resena_historial
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.reporte_resena_historial (
    id_historial BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_reporte BIGINT NOT NULL,
    id_admin BIGINT NOT NULL,
    id_responsable_anterior BIGINT NOT NULL,
    id_responsable_nuevo BIGINT NOT NULL,

    fecha_inicio_anterior TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    fecha_inicio_nueva TIMESTAMP WITHOUT TIME ZONE NOT NULL,

    motivo_reasignacion TEXT NOT NULL,

    fecha_reasignacion TIMESTAMP WITHOUT TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_historial_reporte
        FOREIGN KEY (id_reporte)
        REFERENCES public.reporte_resena (id_reporte)
        ON DELETE RESTRICT,

    CONSTRAINT fk_historial_admin
        FOREIGN KEY (id_admin)
        REFERENCES public.usuario (id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT fk_historial_responsable_anterior
        FOREIGN KEY (id_responsable_anterior)
        REFERENCES public.usuario (id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT fk_historial_responsable_nuevo
        FOREIGN KEY (id_responsable_nuevo)
        REFERENCES public.usuario (id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_historial_responsables_distintos
        CHECK (id_responsable_anterior <> id_responsable_nuevo),

    CONSTRAINT chk_historial_fechas_progresivas
        CHECK (fecha_inicio_nueva > fecha_inicio_anterior),

    CONSTRAINT chk_historial_motivo_no_vacio
        CHECK (TRIM(motivo_reasignacion) <> '')
);


-- ============================================================================
-- 7. Vinculación diferida y única entre reporte_resena e historial
-- ============================================================================

-- Clave foránea diferida desde reporte_resena hacia el historial
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_reporte_resena_historial_reasignacion'
          AND conrelid = 'public.reporte_resena'::regclass
    ) THEN
        ALTER TABLE public.reporte_resena
            ADD CONSTRAINT fk_reporte_resena_historial_reasignacion
            FOREIGN KEY (id_historial_reasignacion)
            REFERENCES public.reporte_resena_historial (id_historial)
            ON DELETE RESTRICT
            DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;

-- Restricción UNIQUE que impide que dos reportes reutilicen el mismo evento de historial
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uq_reporte_resena_historial_reasignacion'
          AND conrelid = 'public.reporte_resena'::regclass
    ) THEN
        ALTER TABLE public.reporte_resena
            ADD CONSTRAINT uq_reporte_resena_historial_reasignacion
            UNIQUE (id_historial_reasignacion);
    END IF;
END $$;


-- ============================================================================
-- 8. Restricción CHECK de coherencia de moderación
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_reporte_moderacion_coherencia'
          AND conrelid = 'public.reporte_resena'::regclass
    ) THEN
        ALTER TABLE public.reporte_resena
            ADD CONSTRAINT chk_reporte_moderacion_coherencia
            CHECK (
                -- 1. PENDIENTE: Ningún campo de moderación ni evento de historial
                (
                    estado = 'PENDIENTE'
                    AND id_responsable IS NULL
                    AND fecha_inicio_revision IS NULL
                    AND fecha_revision IS NULL
                    AND notas_revision IS NULL
                    AND id_historial_reasignacion IS NULL
                )
                OR
                -- 2. EN_REVISION: Responsable y fecha de inicio obligatorios; fecha final y notas nulas
                (
                    estado = 'EN_REVISION'
                    AND id_responsable IS NOT NULL
                    AND fecha_inicio_revision IS NOT NULL
                    AND fecha_revision IS NULL
                    AND notas_revision IS NULL
                )
                OR
                -- 3. ACEPTADO / RECHAZADO: Responsable, fecha inicio, fecha decisión y notas obligatorias
                (
                    estado IN ('ACEPTADO', 'RECHAZADO')
                    AND id_responsable IS NOT NULL
                    AND fecha_inicio_revision IS NOT NULL
                    AND fecha_revision IS NOT NULL
                    AND fecha_revision >= fecha_inicio_revision
                    AND notas_revision IS NOT NULL
                    AND TRIM(notas_revision) <> ''
                )
            );
    END IF;
END $$;


-- ============================================================================
-- 9. Inmutabilidad del historial (Append-Only) y protección contra TRUNCATE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_proteger_inmutabilidad_historial()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION
        'Operación denegada: la tabla reporte_resena_historial es append-only; no se permiten operaciones de UPDATE ni DELETE.';
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_inmutabilidad_historial_dml
    ON public.reporte_resena_historial;

CREATE TRIGGER trg_proteger_inmutabilidad_historial_dml
BEFORE UPDATE OR DELETE ON public.reporte_resena_historial
FOR EACH ROW
EXECUTE FUNCTION public.fn_proteger_inmutabilidad_historial();


CREATE OR REPLACE FUNCTION public.fn_proteger_truncate_historial()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION
        'Operación denegada: la tabla reporte_resena_historial es inmutable y no puede ser truncada.';
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_truncate_historial
    ON public.reporte_resena_historial;

CREATE TRIGGER trg_proteger_truncate_historial
BEFORE TRUNCATE ON public.reporte_resena_historial
FOR EACH STATEMENT
EXECUTE FUNCTION public.fn_proteger_truncate_historial();


CREATE OR REPLACE FUNCTION public.fn_validar_historial_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_rol_admin VARCHAR(100);
    v_rol_nuevo VARCHAR(100);
BEGIN
    SELECT r.nombre INTO v_rol_admin
    FROM public.usuario u
    JOIN public.rol r ON u.id_rol = r.id_rol
    WHERE u.id_usuario = NEW.id_admin;

    IF v_rol_admin IS NULL OR LOWER(TRIM(v_rol_admin)) <> 'administrador' THEN
        RAISE EXCEPTION
            'Operación denegada: solo un usuario con rol Administrador puede registrar reasignaciones (id_admin: %)',
            NEW.id_admin;
    END IF;

    SELECT r.nombre INTO v_rol_nuevo
    FROM public.usuario u
    JOIN public.rol r ON u.id_rol = r.id_rol
    WHERE u.id_usuario = NEW.id_responsable_nuevo;

    IF v_rol_nuevo IS NULL OR LOWER(TRIM(v_rol_nuevo)) NOT IN ('administrador', 'moderador') THEN
        RAISE EXCEPTION
            'Operación denegada: el nuevo responsable debe tener rol Administrador o Moderador (id_responsable_nuevo: %)',
            NEW.id_responsable_nuevo;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_historial_roles
    ON public.reporte_resena_historial;

CREATE TRIGGER trg_validar_historial_roles
BEFORE INSERT ON public.reporte_resena_historial
FOR EACH ROW
EXECUTE FUNCTION public.fn_validar_historial_roles();


-- ============================================================================
-- 10. Actualización del trigger de inmutabilidad de datos originales del reporte
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_proteger_inmutabilidad_reporte()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Preservar validaciones originales de 006:
    IF NEW.id_resena IS DISTINCT FROM OLD.id_resena THEN
        RAISE EXCEPTION
            'No se permite modificar la reseña asociada a un reporte existente (id_resena es inmutable)';
    END IF;

    IF NEW.id_usuario IS DISTINCT FROM OLD.id_usuario THEN
        RAISE EXCEPTION
            'No se permite modificar el usuario autor de un reporte existente (id_usuario es inmutable)';
    END IF;

    -- Ampliar con la inmutabilidad de todos los campos originales del reporte:
    IF NEW.motivo IS DISTINCT FROM OLD.motivo THEN
        RAISE EXCEPTION
            'No se permite modificar el motivo de un reporte existente (motivo es inmutable)';
    END IF;

    IF NEW.descripcion IS DISTINCT FROM OLD.descripcion THEN
        RAISE EXCEPTION
            'No se permite modificar la descripción de un reporte existente (descripcion es inmutable)';
    END IF;

    IF NEW.fecha_creacion IS DISTINCT FROM OLD.fecha_creacion THEN
        RAISE EXCEPTION
            'No se permite modificar la fecha de creación de un reporte existente (fecha_creacion es inmutable)';
    END IF;

    -- Inmutabilidad absoluta de reportes finalizados:
    IF OLD.estado IN ('ACEPTADO', 'RECHAZADO') THEN
        RAISE EXCEPTION
            'Operación denegada: un reporte en estado final (%) es estrictamente inmutable; no se permite modificar ningún campo.',
            OLD.estado;
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


-- ============================================================================
-- 11. Trigger de máquina de estados estricta y transiciones de moderación
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_validar_transicion_moderacion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_rol_responsable VARCHAR(100);
BEGIN
    -- 0. Validación en inserción de nuevos reportes
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

    -- Validar que si se asigna un responsable, este tenga rol Administrador o Moderador
    IF NEW.id_responsable IS NOT NULL THEN
        SELECT r.nombre INTO v_rol_responsable
        FROM public.usuario u
        JOIN public.rol r ON u.id_rol = r.id_rol
        WHERE u.id_usuario = NEW.id_responsable;

        IF v_rol_responsable IS NULL THEN
            RAISE EXCEPTION
                'Operación denegada: el usuario responsable especificado no existe (id_usuario: %)',
                NEW.id_responsable;
        END IF;

        IF LOWER(TRIM(v_rol_responsable)) NOT IN ('administrador', 'moderador') THEN
            RAISE EXCEPTION
                'Operación denegada: el usuario responsable debe tener rol Administrador o Moderador (id_usuario: %, rol actual: %)',
                NEW.id_responsable,
                v_rol_responsable;
        END IF;
    END IF;

    -- 1. Transición desde PENDIENTE
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

    -- 2. Transición o permanencia en EN_REVISION
    ELSIF OLD.estado = 'EN_REVISION' THEN
        IF NEW.estado = 'EN_REVISION' THEN
            -- Solo permitido si es una reasignación válida
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
            -- Decisión final
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

            -- id_historial_reasignacion no debe cambiar al decidir
            IF NEW.id_historial_reasignacion IS DISTINCT FROM OLD.id_historial_reasignacion THEN
                RAISE EXCEPTION
                    'No se permite alterar id_historial_reasignacion durante la decisión final';
            END IF;

        ELSE
            RAISE EXCEPTION
                'Transición inválida desde EN_REVISION a %',
                NEW.estado;
        END IF;

    -- 3. Transición desde estados finales
    ELSIF OLD.estado IN ('ACEPTADO', 'RECHAZADO') THEN
        RAISE EXCEPTION
            'Operación denegada: un reporte en estado final (%) es inmutable y no puede reabrirse',
            OLD.estado;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_transicion_moderacion
    ON public.reporte_resena;

CREATE TRIGGER trg_validar_transicion_moderacion
BEFORE INSERT OR UPDATE ON public.reporte_resena
FOR EACH ROW
EXECUTE FUNCTION public.fn_validar_transicion_moderacion();


-- ============================================================================
-- 12. Constraint Trigger diferido para verificación relacional de reasignación
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_verificar_correspondencia_reasignacion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_hist RECORD;
    v_rol_admin VARCHAR(100);
BEGIN
    -- Solo verificar al ocurrir una reasignación (cambio de responsable)
    IF OLD.id_responsable IS NOT NULL AND NEW.id_responsable IS DISTINCT FROM OLD.id_responsable THEN
        IF NEW.id_historial_reasignacion IS NULL THEN
            RAISE EXCEPTION
                'Error de integridad diferida: el reporte % fue reasignado pero no tiene id_historial_reasignacion asignado',
                NEW.id_reporte;
        END IF;

        SELECT * INTO v_hist
        FROM public.reporte_resena_historial
        WHERE id_historial = NEW.id_historial_reasignacion;

        IF NOT FOUND THEN
            RAISE EXCEPTION
                'Error de integridad diferida: el historial % referenciado por el reporte % no existe',
                NEW.id_historial_reasignacion, NEW.id_reporte;
        END IF;

        -- Validar que el autor de la reasignación en el historial sea un Administrador
        SELECT r.nombre INTO v_rol_admin
        FROM public.usuario u
        JOIN public.rol r ON u.id_rol = r.id_rol
        WHERE u.id_usuario = v_hist.id_admin;

        IF LOWER(TRIM(v_rol_admin)) <> 'administrador' THEN
            RAISE EXCEPTION
                'Error de integridad diferida: solo un usuario con rol Administrador puede realizar reasignaciones (id_admin: %, rol: %)',
                v_hist.id_admin,
                v_rol_admin;
        END IF;

        IF v_hist.id_reporte <> NEW.id_reporte THEN
            RAISE EXCEPTION
                'Error de integridad diferida: el historial % pertenece al reporte %, no al reporte %',
                v_hist.id_historial, v_hist.id_reporte, NEW.id_reporte;
        END IF;

        IF v_hist.id_responsable_anterior <> OLD.id_responsable THEN
            RAISE EXCEPTION
                'Error de integridad diferida: el responsable anterior en el historial (%) no coincide con el reporte anterior (%)',
                v_hist.id_responsable_anterior, OLD.id_responsable;
        END IF;

        IF v_hist.id_responsable_nuevo <> NEW.id_responsable THEN
            RAISE EXCEPTION
                'Error de integridad diferida: el nuevo responsable en el historial (%) no coincide con el nuevo responsable en el reporte (%)',
                v_hist.id_responsable_nuevo, NEW.id_responsable;
        END IF;

        IF v_hist.fecha_inicio_nueva IS DISTINCT FROM NEW.fecha_inicio_revision THEN
            RAISE EXCEPTION
                'Error de integridad diferida: la fecha de inicio nueva en el historial (%) no coincide con la del reporte (%)',
                v_hist.fecha_inicio_nueva, NEW.fecha_inicio_revision;
        END IF;

        IF v_hist.fecha_inicio_anterior IS DISTINCT FROM OLD.fecha_inicio_revision THEN
            RAISE EXCEPTION
                'Error de integridad diferida: la fecha de inicio anterior en el historial (%) no coincide con la anterior del reporte (%)',
                v_hist.fecha_inicio_anterior, OLD.fecha_inicio_revision;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_verificar_correspondencia_reasignacion
    ON public.reporte_resena;

CREATE CONSTRAINT TRIGGER trg_verificar_correspondencia_reasignacion
AFTER UPDATE ON public.reporte_resena
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.fn_verificar_correspondencia_reasignacion();


-- ============================================================================
-- 13. Índices de rendimiento
-- ============================================================================

-- Bandeja de moderación activa
CREATE INDEX IF NOT EXISTS idx_reporte_resena_bandeja_activa
    ON public.reporte_resena (estado, fecha_creacion ASC)
    WHERE estado IN ('PENDIENTE', 'EN_REVISION');

-- Búsqueda de reportes por responsable en revisión
CREATE INDEX IF NOT EXISTS idx_reporte_resena_responsable_revision
    ON public.reporte_resena (id_responsable, estado)
    WHERE id_responsable IS NOT NULL;

-- Consultas de historial por reporte
CREATE INDEX IF NOT EXISTS idx_historial_reporte
    ON public.reporte_resena_historial (id_reporte, fecha_reasignacion DESC);

-- Consultas de historial por administrador
CREATE INDEX IF NOT EXISTS idx_historial_admin
    ON public.reporte_resena_historial (id_admin);

-- Consultas de historial por nuevo responsable
CREATE INDEX IF NOT EXISTS idx_historial_responsable_nuevo
    ON public.reporte_resena_historial (id_responsable_nuevo);


-- ============================================================================
-- 14. Registro de la migración en schema_version
-- ============================================================================

INSERT INTO public.schema_version (
    version,
    descripcion
)
VALUES (
    '007_moderacion_reportes',
    'S2-38 Fase 2.2: Moderación de reportes, rol Moderador, restricciones de coherencia, tabla append-only reporte_resena_historial y constraint trigger diferido.'
);


COMMIT;
