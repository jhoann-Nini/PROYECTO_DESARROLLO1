BEGIN;

-- ============================================================
-- Migración 003: Alineación de roles de TecnoReview
--
-- Objetivos:
-- 1. Conservar los roles existentes.
-- 2. Crear los roles faltantes.
-- 3. Evitar duplicados por mayúsculas y espacios.
-- 4. No modificar los roles de ningún usuario.
-- 5. No asignar privilegios administrativos.
-- 6. No modificar la secuencia de identidad.
-- ============================================================

-- 1. Garantizar la existencia de la tabla de versiones.
-- Se conserva el mecanismo de trazabilidad del proyecto.

CREATE TABLE IF NOT EXISTS public.schema_version (
    version VARCHAR(50) PRIMARY KEY,
    descripcion VARCHAR(255) NOT NULL,
    aplicado_en TIMESTAMP WITHOUT TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Comprobar si la migración ya fue registrada.
-- Si ya existe el registro, no repetir las operaciones.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.schema_version
        WHERE version = '003_alineacion_roles'
    ) THEN
        RAISE EXCEPTION
            'La migración 003_alineacion_roles ya está registrada. No se aplicarán cambios.';
    END IF;
END $$;

-- 3. Verificar que no existan nombres duplicados.
-- Se consideran equivalentes los nombres que solo difieren
-- en mayúsculas, minúsculas o espacios al principio/final.

DO $$
DECLARE
    duplicados_lista TEXT;
BEGIN
    SELECT string_agg(
        nombre_normalizado || ' (' || total || ' registros)',
        ', '
    )
    INTO duplicados_lista
    FROM (
        SELECT
            LOWER(TRIM(nombre)) AS nombre_normalizado,
            COUNT(*) AS total
        FROM public.rol
        GROUP BY LOWER(TRIM(nombre))
        HAVING COUNT(*) > 1
    ) AS duplicados;

    IF duplicados_lista IS NOT NULL THEN
        RAISE EXCEPTION
            'Migración cancelada: existen roles duplicados en public.rol: %',
            duplicados_lista;
    END IF;
END $$;

-- 4. Comprobar si los roles requeridos ya existen.
-- Si un rol existe con otra capitalización o espacios,
-- se detiene la migración para evitar inconsistencias
-- con las comprobaciones de roles del backend.

DO $$
DECLARE
    rol_inconsistente TEXT;
BEGIN
    SELECT nombre
    INTO rol_inconsistente
    FROM public.rol
    WHERE LOWER(TRIM(nombre)) IN (
        LOWER('Usuario registrado'),
        LOWER('Administrador'),
        LOWER('Representante de establecimiento')
    )
    AND nombre <> TRIM(nombre)
    LIMIT 1;

    IF rol_inconsistente IS NOT NULL THEN
        RAISE EXCEPTION
            'Migración cancelada: el rol "%" contiene espacios al inicio o al final. Revise el registro manualmente.',
            rol_inconsistente;
    END IF;
END $$;

-- 5. Crear una restricción de unicidad por nombre normalizado.
-- El índice impide duplicados que solo difieran en
-- mayúsculas, minúsculas o espacios externos.

CREATE UNIQUE INDEX IF NOT EXISTS uq_rol_nombre_normalizado
ON public.rol (LOWER(TRIM(nombre)));

-- 6. Crear el rol Administrador si no existe.
-- No se asigna este rol a ningún usuario.

INSERT INTO public.rol (nombre, descripcion)
SELECT
    'Administrador',
    'Rol para la gestión global del catálogo y la moderación de la plataforma'
WHERE NOT EXISTS (
    SELECT 1
    FROM public.rol
    WHERE LOWER(TRIM(nombre)) = LOWER('Administrador')
);

-- 7. Crear el rol Representante de establecimiento
-- si no existe.
-- No se asigna este rol a ningún usuario.

INSERT INTO public.rol (nombre, descripcion)
SELECT
    'Representante de establecimiento',
    'Rol para usuarios autorizados a gestionar información de su establecimiento'
WHERE NOT EXISTS (
    SELECT 1
    FROM public.rol
    WHERE LOWER(TRIM(nombre)) =
          LOWER('Representante de establecimiento')
);

-- 8. Registrar la migración.

INSERT INTO public.schema_version (
    version,
    descripcion
)
VALUES (
    '003_alineacion_roles',
    'Creación de roles faltantes y prevención de nombres duplicados'
);

COMMIT;