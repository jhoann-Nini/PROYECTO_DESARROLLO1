BEGIN;

-- ============================================================================
-- Migración 005: Unificación de Valoraciones y Reseñas
-- Proyecto: TecReview
-- Tarea: TEC-66
--
-- Datos verificados en Supabase:
--   - Reseña 1: usuario=1, producto=1, comentario='hola',
--              estado=true, sin valoración activa.
--   - Reseña 2: usuario=1, producto=2, comentario='prueba',
--              estado=true, valoración activa con puntuación 2.
--   - Reseña 3: usuario=1, producto=25, comentario='hola',
--              estado=true, sin valoración activa.
--   - Reseña 4: usuario=1, producto=23, comentario='hola',
--              estado=true, sin valoración activa.
--
-- Objetivos:
--   1. Incorporar puntuacion INTEGER a public.resena.
--   2. Recuperar las puntuaciones desde public.valoracion activa.
--   3. Validar la integridad de las puntuaciones migradas.
--   4. Conservar la reseña 2 con puntuación 2.
--   5. Eliminar exclusivamente las reseñas de prueba 1, 3 y 4.
--   6. Verificar que no queden reseñas sin puntuación.
--   7. Establecer NOT NULL y CHECK (1-5).
--   8. Retirar titulo, ventajas y desventajas.
--   9. Registrar la migración en schema_version.
--
-- IMPORTANTE:
--   - No modificar ni eliminar registros de public.valoracion.
--   - No eliminar otras reseñas.
--   - No utilizar DROP TABLE ni CASCADE.
--   - Toda la migración se ejecuta dentro de una transacción.
-- ============================================================================


-- 0. Garantizar la existencia de la tabla de control de versiones

CREATE TABLE IF NOT EXISTS public.schema_version (
    version VARCHAR(50) PRIMARY KEY,
    descripcion VARCHAR(255) NOT NULL,
    aplicado_en TIMESTAMP WITHOUT TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- 1. Verificar que la migración no haya sido aplicada anteriormente

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.schema_version
        WHERE version = '005_unificar_valoraciones_resenas'
    ) THEN
        RAISE EXCEPTION
            'La migración 005_unificar_valoraciones_resenas ya está registrada. No se aplicarán cambios.';
    END IF;
END $$;


-- 2. Bloquear las tablas durante la migración

LOCK TABLE public.resena, public.valoracion
IN ACCESS EXCLUSIVE MODE;


-- 3. Incorporar la columna puntuacion

ALTER TABLE public.resena
    ADD COLUMN IF NOT EXISTS puntuacion INTEGER;


-- 4. Crear la restricción CHECK si todavía no existe

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_resena_puntuacion'
          AND conrelid = 'public.resena'::regclass
    ) THEN
        ALTER TABLE public.resena
            ADD CONSTRAINT chk_resena_puntuacion
            CHECK (puntuacion BETWEEN 1 AND 5);
    END IF;
END $$;


-- 5. Recuperar las puntuaciones desde las valoraciones activas

UPDATE public.resena r
SET puntuacion = v.puntuacion
FROM public.valoracion v
WHERE r.id_usuario = v.id_usuario
  AND r.id_producto = v.id_producto
  AND v.estado = TRUE
  AND r.puntuacion IS NULL;


-- 5b. Validar la integridad de las puntuaciones migradas
--
-- Comprueba que las valoraciones activas vinculadas a reseñas:
--   - Tengan puntuaciones no nulas.
--   - Tengan puntuaciones entre 1 y 5.
--   - Coincidan con la puntuación de su reseña correspondiente.
--
-- No modifica registros. Si encuentra inconsistencias, cancela la migración.

DO $$
DECLARE
    discrepancias INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO discrepancias
    FROM public.valoracion v
    JOIN public.resena r
      ON v.id_usuario = r.id_usuario
     AND v.id_producto = r.id_producto
    WHERE v.estado = TRUE
      AND (
          v.puntuacion IS NULL
          OR v.puntuacion NOT BETWEEN 1 AND 5
          OR r.puntuacion IS NULL
          OR r.puntuacion NOT BETWEEN 1 AND 5
          OR r.puntuacion IS DISTINCT FROM v.puntuacion
      );

    IF discrepancias > 0 THEN
        RAISE EXCEPTION
            'Migración cancelada: Se encontraron % inconsistencias entre valoraciones activas y reseñas vinculadas.',
            discrepancias;
    END IF;
END $$;


-- 6. Verificar que la reseña 2 conserve la puntuación 2

DO $$
DECLARE
    puntuacion_r2 INTEGER;
    estado_r2 BOOLEAN;
    usuario_r2 BIGINT;
    producto_r2 BIGINT;
BEGIN
    SELECT
        puntuacion,
        estado,
        id_usuario,
        id_producto
    INTO
        puntuacion_r2,
        estado_r2,
        usuario_r2,
        producto_r2
    FROM public.resena
    WHERE id_resena = 2;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Migración cancelada: La reseña 2 no fue encontrada en public.resena.';
    END IF;

    IF usuario_r2 IS DISTINCT FROM 1
       OR producto_r2 IS DISTINCT FROM 2
       OR estado_r2 IS DISTINCT FROM TRUE
       OR puntuacion_r2 IS DISTINCT FROM 2 THEN

        RAISE EXCEPTION
            'Migración cancelada: La reseña 2 no coincide con los atributos esperados. Usuario=%, producto=%, estado=%, puntuacion=%.',
            usuario_r2,
            producto_r2,
            estado_r2,
            puntuacion_r2;
    END IF;
END $$;


-- 7. Verificar los tres registros autorizados para eliminación
--
-- Únicamente se permiten las reseñas:
--   ID 1: usuario 1, producto 1, comentario hola.
--   ID 3: usuario 1, producto 25, comentario hola.
--   ID 4: usuario 1, producto 23, comentario hola.
--
-- Todas deben estar activas, sin puntuación y sin valoración activa.

DO $$
DECLARE
    total_verificados INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO total_verificados
    FROM public.resena r
    WHERE r.id_resena IN (1, 3, 4)
      AND r.id_usuario = 1
      AND r.estado = TRUE
      AND r.comentario = 'hola'
      AND r.puntuacion IS NULL
      AND (
          (r.id_resena = 1 AND r.id_producto = 1)
          OR
          (r.id_resena = 3 AND r.id_producto = 25)
          OR
          (r.id_resena = 4 AND r.id_producto = 23)
      )
      AND NOT EXISTS (
          SELECT 1
          FROM public.valoracion v
          WHERE v.id_usuario = r.id_usuario
            AND v.id_producto = r.id_producto
            AND v.estado = TRUE
      );

    IF total_verificados <> 3 THEN
        RAISE EXCEPTION
            'Migración cancelada: Las reseñas 1, 3 y 4 no coinciden exactamente con los atributos verificados. Total coincidente: % de 3.',
            total_verificados;
    END IF;
END $$;


-- 8. Previsualizar los registros antes de eliminarlos

SELECT
    r.id_resena,
    r.id_usuario,
    r.id_producto,
    r.comentario,
    r.fecha_creacion,
    r.estado
FROM public.resena r
WHERE r.id_resena IN (1, 3, 4)
ORDER BY r.id_resena ASC;


-- 9. Eliminar exclusivamente las reseñas autorizadas
--
-- La eliminación repite las condiciones de seguridad.
-- Se exige que ROW_COUNT sea exactamente 3.

DO $$
DECLARE
    filas_eliminadas INTEGER;
BEGIN
    DELETE FROM public.resena r
    WHERE r.id_resena IN (1, 3, 4)
      AND r.id_usuario = 1
      AND r.estado = TRUE
      AND r.comentario = 'hola'
      AND r.puntuacion IS NULL
      AND (
          (r.id_resena = 1 AND r.id_producto = 1)
          OR
          (r.id_resena = 3 AND r.id_producto = 25)
          OR
          (r.id_resena = 4 AND r.id_producto = 23)
      )
      AND NOT EXISTS (
          SELECT 1
          FROM public.valoracion v
          WHERE v.id_usuario = r.id_usuario
            AND v.id_producto = r.id_producto
            AND v.estado = TRUE
      );

    GET DIAGNOSTICS filas_eliminadas = ROW_COUNT;

    IF filas_eliminadas <> 3 THEN
        RAISE EXCEPTION
            'Migración cancelada: Se esperaba eliminar exactamente 3 registros autorizados, pero se eliminaron % filas. Se revierte la transacción completa.',
            filas_eliminadas;
    END IF;
END $$;


-- 10. Verificar que no quede ninguna reseña sin puntuación
--
-- Se incluyen reseñas activas e inactivas.
-- No se eliminarán registros adicionales para superar esta validación.

DO $$
DECLARE
    total_sin_puntuacion INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO total_sin_puntuacion
    FROM public.resena
    WHERE puntuacion IS NULL;

    IF total_sin_puntuacion > 0 THEN
        RAISE EXCEPTION
            'Migración cancelada: Aún existen % reseñas sin puntuación. No se permite imponer NOT NULL ni eliminar registros adicionales.',
            total_sin_puntuacion;
    END IF;
END $$;


-- 11. Establecer la columna puntuacion como NOT NULL

ALTER TABLE public.resena
    ALTER COLUMN puntuacion SET NOT NULL;


-- 12. Retirar las columnas auxiliares
--
-- Solo después de superar todas las validaciones anteriores.

ALTER TABLE public.resena
    DROP COLUMN IF EXISTS titulo,
    DROP COLUMN IF EXISTS ventajas,
    DROP COLUMN IF EXISTS desventajas;


-- 13. Registrar la migración

INSERT INTO public.schema_version (
    version,
    descripcion
)
VALUES (
    '005_unificar_valoraciones_resenas',
    'TEC-66: Incorporar puntuacion (1-5) a resena, migrar valoraciones activas, depurar exclusivamente las reseñas de prueba autorizadas 1, 3 y 4, establecer NOT NULL y retirar titulo, ventajas y desventajas.'
);


COMMIT;