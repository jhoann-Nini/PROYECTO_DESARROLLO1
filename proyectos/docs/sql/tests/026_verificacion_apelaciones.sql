-- Verificacion de comportamiento PostgreSQL para la migracion 026 (apelaciones).
-- Ejecutar en una base de PRUEBAS con el esquema de produccion y la 026
-- aplicada. No usar en produccion: inserta datos de prueba dentro de una
-- transaccion y los deshace al final (ROLLBACK).
--
--   psql -v ON_ERROR_STOP=1 -f 026_verificacion_apelaciones.sql
--
-- Falla con 'FALLO: ...' si una regla no se cumple.

BEGIN;
-- Los triggers diferidos de la 020 se comprueban en puntos concretos con
-- SET CONSTRAINTS ALL IMMEDIATE, que ejecuta las comprobaciones pendientes
-- sin necesidad de COMMIT.

CREATE TEMP TABLE ctx (k TEXT PRIMARY KEY, v BIGINT) ON COMMIT DROP;

-- ---------- Datos de prueba ----------
DO $$
DECLARE
    v_rol_usuario BIGINT; v_rol_moderador BIGINT;
    v_autor BIGINT; v_mod1 BIGINT; v_mod2 BIGINT;
    v_cat BIGINT; v_marca BIGINT;
    v_prod1 BIGINT; v_prod2 BIGINT; v_prod3 BIGINT; v_prod4 BIGINT;
    v_r_rechazada BIGINT; v_r_oculta BIGINT; v_r_vieja BIGINT; v_r_eliminada BIGINT;
    v_d_rechazo BIGINT; v_d_ocultar BIGINT; v_d_vieja BIGINT; v_d_eliminada BIGINT;
BEGIN
    INSERT INTO public.rol (nombre) VALUES ('Usuario registrado 026') RETURNING id_rol INTO v_rol_usuario;
    SELECT id_rol INTO v_rol_moderador FROM public.rol WHERE lower(nombre) = 'moderador';
    IF v_rol_moderador IS NULL THEN
        INSERT INTO public.rol (nombre) VALUES ('Moderador') RETURNING id_rol INTO v_rol_moderador;
    END IF;

    INSERT INTO public.usuario (correo, estado, fecha_registro, nombre, id_rol)
    VALUES ('autor026@test.local', TRUE, now(), 'Autor 026', v_rol_usuario) RETURNING id_usuario INTO v_autor;
    INSERT INTO public.usuario (correo, estado, fecha_registro, nombre, id_rol)
    VALUES ('mod1_026@test.local', TRUE, now(), 'Moderador 1', v_rol_moderador) RETURNING id_usuario INTO v_mod1;
    INSERT INTO public.usuario (correo, estado, fecha_registro, nombre, id_rol)
    VALUES ('mod2_026@test.local', TRUE, now(), 'Moderador 2', v_rol_moderador) RETURNING id_usuario INTO v_mod2;
    INSERT INTO public.usuario_rol (id_usuario, id_rol) VALUES (v_autor, v_rol_usuario), (v_mod1, v_rol_moderador), (v_mod2, v_rol_moderador);

    INSERT INTO public.categoria (nombre, estado) VALUES ('Cat 026', TRUE) RETURNING id_categoria INTO v_cat;
    INSERT INTO public.marca (nombre, estado) VALUES ('Marca 026', TRUE) RETURNING id_marca INTO v_marca;
    INSERT INTO public.producto (nombre, estado, id_categoria, id_marca) VALUES ('P1 026', TRUE, v_cat, v_marca) RETURNING id_producto INTO v_prod1;
    INSERT INTO public.producto (nombre, estado, id_categoria, id_marca) VALUES ('P2 026', TRUE, v_cat, v_marca) RETURNING id_producto INTO v_prod2;
    INSERT INTO public.producto (nombre, estado, id_categoria, id_marca) VALUES ('P3 026', TRUE, v_cat, v_marca) RETURNING id_producto INTO v_prod3;
    INSERT INTO public.producto (nombre, estado, id_categoria, id_marca) VALUES ('P4 026', TRUE, v_cat, v_marca) RETURNING id_producto INTO v_prod4;

    -- Resena rechazada por el moderador 1.
    INSERT INTO public.resena (comentario, estado, fecha_creacion, id_producto, id_usuario, puntuacion, estado_moderacion)
    VALUES ('texto retenido', TRUE, now(), v_prod1, v_autor, 3, 'PENDIENTE') RETURNING id_resena INTO v_r_rechazada;
    INSERT INTO public.resena_moderacion_auditoria (id_resena, id_moderador, accion, motivo)
    VALUES (v_r_rechazada, v_mod1, 'RECHAZAR', 'Lenguaje ofensivo') RETURNING id_auditoria INTO v_d_rechazo;
    UPDATE public.resena SET estado_moderacion = 'RECHAZADA' WHERE id_resena = v_r_rechazada;

    -- Resena ocultada por el moderador 1.
    INSERT INTO public.resena (comentario, estado, fecha_creacion, id_producto, id_usuario, puntuacion)
    VALUES ('texto publicado', TRUE, now(), v_prod2, v_autor, 3) RETURNING id_resena INTO v_r_oculta;
    INSERT INTO public.resena_moderacion_auditoria (id_resena, id_moderador, accion, motivo)
    VALUES (v_r_oculta, v_mod1, 'OCULTAR', 'Incumple las normas') RETURNING id_auditoria INTO v_d_ocultar;
    UPDATE public.resena SET oculta_por_moderacion = TRUE, moderada_por = v_mod1, fecha_moderacion = now(),
           motivo_moderacion = 'Incumple las normas' WHERE id_resena = v_r_oculta;

    -- Decision de hace 16 dias.
    INSERT INTO public.resena (comentario, estado, fecha_creacion, id_producto, id_usuario, puntuacion, estado_moderacion)
    VALUES ('texto viejo', TRUE, now(), v_prod3, v_autor, 3, 'PENDIENTE') RETURNING id_resena INTO v_r_vieja;
    INSERT INTO public.resena_moderacion_auditoria (id_resena, id_moderador, accion, motivo, fecha_evento)
    VALUES (v_r_vieja, v_mod1, 'RECHAZAR', 'Spam', now() - interval '16 days') RETURNING id_auditoria INTO v_d_vieja;
    UPDATE public.resena SET estado_moderacion = 'RECHAZADA' WHERE id_resena = v_r_vieja;

    -- Resena rechazada y luego eliminada por su autor.
    INSERT INTO public.resena (comentario, estado, fecha_creacion, id_producto, id_usuario, puntuacion, estado_moderacion)
    VALUES ('texto eliminado', TRUE, now(), v_prod4, v_autor, 3, 'PENDIENTE') RETURNING id_resena INTO v_r_eliminada;
    INSERT INTO public.resena_moderacion_auditoria (id_resena, id_moderador, accion, motivo)
    VALUES (v_r_eliminada, v_mod1, 'RECHAZAR', 'Spam') RETURNING id_auditoria INTO v_d_eliminada;
    UPDATE public.resena SET estado_moderacion = 'RECHAZADA' WHERE id_resena = v_r_eliminada;
    UPDATE public.resena SET estado = FALSE WHERE id_resena = v_r_eliminada;

    INSERT INTO ctx VALUES
      ('autor', v_autor), ('mod1', v_mod1), ('mod2', v_mod2),
      ('r_rechazada', v_r_rechazada), ('r_oculta', v_r_oculta),
      ('d_rechazo', v_d_rechazo), ('d_ocultar', v_d_ocultar),
      ('d_vieja', v_d_vieja), ('d_eliminada', v_d_eliminada);
END $$;
SET CONSTRAINTS ALL IMMEDIATE;
SET CONSTRAINTS ALL DEFERRED;

-- Ejecuta una sentencia y falla si NO lanza error.
CREATE FUNCTION pg_temp.debe_fallar(p_sql TEXT, p_regla TEXT) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE v_fallo BOOLEAN := FALSE;
BEGIN
    BEGIN
        EXECUTE p_sql;
    EXCEPTION WHEN OTHERS THEN
        v_fallo := TRUE;
    END;
    IF NOT v_fallo THEN
        RAISE EXCEPTION 'FALLO: se permitio %', p_regla;
    END IF;
END $$;

CREATE FUNCTION pg_temp.id(p_k TEXT) RETURNS BIGINT LANGUAGE sql AS $$ SELECT v FROM ctx WHERE k = p_k $$;

-- ---------- Creacion ----------
DO $$
DECLARE v_ap BIGINT;
BEGIN
    INSERT INTO public.apelacion (id_auditoria, id_autor, motivo)
    VALUES (pg_temp.id('d_rechazo'), pg_temp.id('autor'), 'No era ofensivo')
    RETURNING id_apelacion INTO v_ap;
    INSERT INTO ctx VALUES ('ap_rechazo', v_ap);

    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.apelacion (id_auditoria, id_autor, motivo) VALUES (%s, %s, %L)',
      pg_temp.id('d_rechazo'), pg_temp.id('autor'), 'otra vez'), 'una segunda apelacion sobre la misma decision');

    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.apelacion (id_auditoria, id_autor, motivo) VALUES (%s, %s, %L)',
      pg_temp.id('d_ocultar'), pg_temp.id('mod2'), 'no soy el autor'), 'apelar una resena ajena');

    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.apelacion (id_auditoria, id_autor, motivo) VALUES (%s, %s, %L)',
      pg_temp.id('d_vieja'), pg_temp.id('autor'), 'tarde'), 'apelar fuera de plazo');

    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.apelacion (id_auditoria, id_autor, motivo) VALUES (%s, %s, %L)',
      pg_temp.id('d_eliminada'), pg_temp.id('autor'), 'eliminada'), 'apelar una resena eliminada');

    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.apelacion (id_auditoria, id_autor, motivo) VALUES (%s, %s, %L)',
      pg_temp.id('d_ocultar'), pg_temp.id('autor'), '   '), 'un motivo vacio');

    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.apelacion (id_auditoria, id_autor, motivo, estado, id_moderador, respuesta, fecha_resolucion) VALUES (%s, %s, %L, %L, %s, %L, now())',
      pg_temp.id('d_ocultar'), pg_temp.id('autor'), 'ya resuelta', 'ACEPTADA', pg_temp.id('mod2'), 'ok'), 'crear una apelacion ya resuelta');
END $$;

-- Una decision APROBAR no se puede apelar.
DO $$
DECLARE v_r BIGINT; v_d BIGINT;
BEGIN
    INSERT INTO public.resena (comentario, estado, fecha_creacion, id_producto, id_usuario, puntuacion, estado_moderacion)
    SELECT 'aprobada', TRUE, now(), p.id_producto, pg_temp.id('autor'), 4, 'PENDIENTE'
    FROM public.producto p WHERE p.nombre = 'P1 026' AND NOT EXISTS (
      SELECT 1 FROM public.resena r WHERE r.id_producto = p.id_producto AND r.id_usuario = pg_temp.id('autor') AND r.estado)
    RETURNING id_resena INTO v_r;
    IF v_r IS NULL THEN
        -- P1 ya tiene la resena rechazada activa del autor: usar otro producto.
        INSERT INTO public.producto (nombre, estado, id_categoria, id_marca)
        SELECT 'P5 026', TRUE, id_categoria, id_marca FROM public.producto WHERE nombre = 'P1 026';
        INSERT INTO public.resena (comentario, estado, fecha_creacion, id_producto, id_usuario, puntuacion, estado_moderacion)
        SELECT 'aprobada', TRUE, now(), id_producto, pg_temp.id('autor'), 4, 'PENDIENTE' FROM public.producto WHERE nombre = 'P5 026'
        RETURNING id_resena INTO v_r;
    END IF;
    INSERT INTO public.resena_moderacion_auditoria (id_resena, id_moderador, accion, motivo)
    VALUES (v_r, pg_temp.id('mod1'), 'APROBAR', 'Correcta') RETURNING id_auditoria INTO v_d;
    UPDATE public.resena SET estado_moderacion = 'PUBLICADA' WHERE id_resena = v_r;
    SET CONSTRAINTS ALL IMMEDIATE;
    SET CONSTRAINTS ALL DEFERRED;

    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.apelacion (id_auditoria, id_autor, motivo) VALUES (%s, %s, %L)',
      v_d, pg_temp.id('autor'), 'aprobada'), 'apelar una decision APROBAR');
END $$;

-- ---------- Resolucion ----------
DO $$
BEGIN
    PERFORM pg_temp.debe_fallar(format(
      'UPDATE public.apelacion SET estado = %L, id_moderador = %s, respuesta = %L, fecha_resolucion = now() WHERE id_apelacion = %s',
      'ACEPTADA', pg_temp.id('mod1'), 'yo mismo', pg_temp.id('ap_rechazo')), 'que el moderador original resuelva');

    PERFORM pg_temp.debe_fallar(format(
      'UPDATE public.apelacion SET estado = %L, id_moderador = %s, respuesta = %L, fecha_resolucion = now() WHERE id_apelacion = %s',
      'ACEPTADA', pg_temp.id('autor'), 'me apruebo', pg_temp.id('ap_rechazo')), 'que el autor resuelva');

    PERFORM pg_temp.debe_fallar(format(
      'UPDATE public.apelacion SET motivo = %L WHERE id_apelacion = %s',
      'motivo cambiado', pg_temp.id('ap_rechazo')), 'cambiar el motivo');

    PERFORM pg_temp.debe_fallar(format(
      'UPDATE public.apelacion SET estado = %L, id_moderador = %s, fecha_resolucion = now() WHERE id_apelacion = %s',
      'RECHAZADA', pg_temp.id('mod2'), pg_temp.id('ap_rechazo')), 'resolver sin respuesta');

    PERFORM pg_temp.debe_fallar(format(
      'DELETE FROM public.apelacion WHERE id_apelacion = %s', pg_temp.id('ap_rechazo')), 'borrar una apelacion');
END $$;

-- Aceptar la apelacion de un RECHAZAR con el camino de la 020:
-- RECHAZADA -> PENDIENTE, evento APROBAR, PENDIENTE -> PUBLICADA.
UPDATE public.apelacion
   SET estado = 'ACEPTADA', id_moderador = pg_temp.id('mod2'),
       respuesta = 'Tienes razon', fecha_resolucion = now()
 WHERE id_apelacion = pg_temp.id('ap_rechazo');
UPDATE public.resena SET estado_moderacion = 'PENDIENTE' WHERE id_resena = pg_temp.id('r_rechazada');
INSERT INTO public.resena_moderacion_auditoria (id_resena, id_moderador, accion, motivo)
VALUES (pg_temp.id('r_rechazada'), pg_temp.id('mod2'), 'APROBAR', 'Apelación aceptada');
UPDATE public.resena SET estado_moderacion = 'PUBLICADA' WHERE id_resena = pg_temp.id('r_rechazada');
-- Si el orden no cumple los triggers de la 020, falla aqui.
SET CONSTRAINTS ALL IMMEDIATE;
SET CONSTRAINTS ALL DEFERRED;

DO $$
BEGIN
    IF (SELECT estado_moderacion FROM public.resena WHERE id_resena = pg_temp.id('r_rechazada')) <> 'PUBLICADA' THEN
        RAISE EXCEPTION 'FALLO: la resena de la apelacion aceptada no quedo PUBLICADA';
    END IF;

    PERFORM pg_temp.debe_fallar(format(
      'UPDATE public.apelacion SET estado = %L, respuesta = %L WHERE id_apelacion = %s',
      'RECHAZADA', 'cambio de opinion', pg_temp.id('ap_rechazo')), 'volver a resolver una apelacion resuelta');

    PERFORM pg_temp.debe_fallar('TRUNCATE public.apelacion', 'vaciar la tabla de apelaciones');

    -- Sin permisos para la API publica de Supabase (criterio de la 023).
    IF has_table_privilege('anon', 'public.apelacion', 'SELECT')
       OR has_table_privilege('authenticated', 'public.apelacion', 'SELECT') THEN
        RAISE EXCEPTION 'FALLO: anon o authenticated tienen acceso a apelacion';
    END IF;
END $$;

-- Rechazar la apelacion de un OCULTAR con otro moderador funciona.
DO $$
DECLARE v_ap BIGINT;
BEGIN
    INSERT INTO public.apelacion (id_auditoria, id_autor, motivo)
    VALUES (pg_temp.id('d_ocultar'), pg_temp.id('autor'), 'No incumplia nada')
    RETURNING id_apelacion INTO v_ap;
    UPDATE public.apelacion
       SET estado = 'RECHAZADA', id_moderador = pg_temp.id('mod2'),
           respuesta = 'La decision se mantiene', fecha_resolucion = now()
     WHERE id_apelacion = v_ap;
END $$;

\echo 'OK: todas las verificaciones de la 026 pasaron'
ROLLBACK;
