-- Verificacion de comportamiento PostgreSQL para la migracion 027
-- (terminos de moderacion administrables).
-- Ejecutar en una base de PRUEBAS con el esquema de produccion y la 027
-- aplicada. No usar en produccion: inserta datos de prueba dentro de una
-- transaccion y los deshace al final (ROLLBACK).
--
--   psql -v ON_ERROR_STOP=1 -f 027_verificacion_terminos.sql
--
-- Falla con 'FALLO: ...' si una regla no se cumple.

BEGIN;

CREATE TEMP TABLE ctx (k TEXT PRIMARY KEY, v BIGINT) ON COMMIT DROP;

DO $$
DECLARE
    v_rol_admin BIGINT; v_rol_moderador BIGINT;
    v_admin BIGINT; v_admin2 BIGINT; v_mod BIGINT;
BEGIN
    SELECT id_rol INTO v_rol_admin FROM public.rol WHERE lower(nombre) = 'administrador';
    IF v_rol_admin IS NULL THEN
        INSERT INTO public.rol (nombre) VALUES ('Administrador') RETURNING id_rol INTO v_rol_admin;
    END IF;
    SELECT id_rol INTO v_rol_moderador FROM public.rol WHERE lower(nombre) = 'moderador';
    IF v_rol_moderador IS NULL THEN
        INSERT INTO public.rol (nombre) VALUES ('Moderador') RETURNING id_rol INTO v_rol_moderador;
    END IF;

    INSERT INTO public.usuario (correo, estado, fecha_registro, nombre, id_rol)
    VALUES ('admin027@test.local', TRUE, now(), 'Admin 027', v_rol_admin) RETURNING id_usuario INTO v_admin;
    INSERT INTO public.usuario (correo, estado, fecha_registro, nombre, id_rol)
    VALUES ('admin2_027@test.local', TRUE, now(), 'Admin 2 027', v_rol_admin) RETURNING id_usuario INTO v_admin2;
    INSERT INTO public.usuario (correo, estado, fecha_registro, nombre, id_rol)
    VALUES ('mod027@test.local', TRUE, now(), 'Moderador 027', v_rol_moderador) RETURNING id_usuario INTO v_mod;
    INSERT INTO public.usuario_rol (id_usuario, id_rol)
    VALUES (v_admin, v_rol_admin), (v_admin2, v_rol_admin), (v_mod, v_rol_moderador);

    INSERT INTO ctx VALUES ('admin', v_admin), ('admin2', v_admin2), ('mod', v_mod);
END $$;

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

DO $$
DECLARE v_t BIGINT; v_t2 BIGINT;
BEGIN
    -- Alta por un administrador.
    INSERT INTO public.termino_moderacion (termino, termino_normalizado, categoria, id_creado_por)
    VALUES ('Imbécil', 'imbecil', 'INSULTO', pg_temp.id('admin')) RETURNING id_termino INTO v_t;
    INSERT INTO ctx VALUES ('t', v_t);

    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.termino_moderacion (termino, termino_normalizado, categoria, id_creado_por) VALUES (%L, %L, %L, %s)',
      'tonto2', 'tonto dos', 'INSULTO', pg_temp.id('mod')), 'que un moderador agregue terminos');

    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.termino_moderacion (termino, termino_normalizado, categoria, id_creado_por) VALUES (%L, %L, %L, %s)',
      'IMBECIL', 'imbecil', 'ACOSO', pg_temp.id('admin2')), 'dos terminos activos iguales');

    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.termino_moderacion (termino, termino_normalizado, categoria, id_creado_por) VALUES (%L, %L, %L, %s)',
      'raro', 'raro', 'OTRA', pg_temp.id('admin')), 'una categoria desconocida');

    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.termino_moderacion (termino, termino_normalizado, categoria, id_creado_por) VALUES (%L, %L, %L, %s)',
      'x', 'x', 'SPAM', pg_temp.id('admin')), 'un termino de un caracter');

    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.termino_moderacion (termino, termino_normalizado, categoria, id_creado_por, activo, id_desactivado_por, fecha_desactivacion) VALUES (%L, %L, %L, %s, false, %s, now())',
      'inactivo', 'inactivo', 'SPAM', pg_temp.id('admin'), pg_temp.id('admin')), 'crear un termino inactivo');

    -- Cambios no permitidos.
    PERFORM pg_temp.debe_fallar(format(
      'UPDATE public.termino_moderacion SET termino = %L WHERE id_termino = %s', 'otro', v_t), 'cambiar el termino');
    PERFORM pg_temp.debe_fallar(format(
      'UPDATE public.termino_moderacion SET categoria = %L WHERE id_termino = %s', 'ACOSO', v_t), 'cambiar la categoria');
    PERFORM pg_temp.debe_fallar(format(
      'UPDATE public.termino_moderacion SET activo = false, id_desactivado_por = %s, fecha_desactivacion = now() WHERE id_termino = %s',
      pg_temp.id('mod'), v_t), 'que un moderador desactive');

    -- Desactivar con otro administrador.
    UPDATE public.termino_moderacion
       SET activo = false, id_desactivado_por = pg_temp.id('admin2'), fecha_desactivacion = now()
     WHERE id_termino = v_t;

    PERFORM pg_temp.debe_fallar(format(
      'UPDATE public.termino_moderacion SET id_desactivado_por = %s WHERE id_termino = %s',
      pg_temp.id('admin'), v_t), 'modificar un termino inactivo');
    PERFORM pg_temp.debe_fallar(format(
      'UPDATE public.termino_moderacion SET activo = true, id_desactivado_por = NULL, fecha_desactivacion = NULL WHERE id_termino = %s',
      v_t), 'reactivar con UPDATE');

    -- Volver a agregarlo crea una fila nueva.
    INSERT INTO public.termino_moderacion (termino, termino_normalizado, categoria, id_creado_por)
    VALUES ('imbécil', 'imbecil', 'INSULTO', pg_temp.id('admin')) RETURNING id_termino INTO v_t2;
    IF v_t2 = v_t THEN
        RAISE EXCEPTION 'FALLO: volver a agregar no creo una fila nueva';
    END IF;

    PERFORM pg_temp.debe_fallar(format(
      'DELETE FROM public.termino_moderacion WHERE id_termino = %s', v_t2), 'borrar un termino');
    PERFORM pg_temp.debe_fallar('TRUNCATE public.termino_moderacion', 'vaciar la tabla');

    IF has_table_privilege('anon', 'public.termino_moderacion', 'SELECT')
       OR has_table_privilege('authenticated', 'public.termino_moderacion', 'SELECT') THEN
        RAISE EXCEPTION 'FALLO: anon o authenticated tienen acceso a termino_moderacion';
    END IF;
END $$;

\echo 'OK: todas las verificaciones de la 027 pasaron'
ROLLBACK;
