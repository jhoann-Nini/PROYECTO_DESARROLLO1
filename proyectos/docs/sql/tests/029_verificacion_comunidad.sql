-- Verificacion de comportamiento PostgreSQL para la migracion 029 (comunidad).
-- Ejecutar en una base de PRUEBAS con el esquema de produccion y la 029
-- aplicada. No usar en produccion: inserta datos de prueba dentro de una
-- transaccion y los deshace al final (ROLLBACK).
--
--   psql -v ON_ERROR_STOP=1 -f 029_verificacion_comunidad.sql
--
-- Falla con 'FALLO: ...' si una regla no se cumple. Criterios CA-02, CA-03 y
-- CA-17 de la especificacion de la comunidad. En una base local hay que crear
-- antes los roles anon y authenticated.

BEGIN;

CREATE TEMP TABLE ctx (k TEXT PRIMARY KEY, v BIGINT) ON COMMIT DROP;

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

-- ---------- Estructura y seguridad (CA-17) ----------
DO $$
DECLARE
    v_tabla TEXT;
    v_oid OID;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.schema_version WHERE version = '029_comunidad') THEN
        RAISE EXCEPTION 'FALLO: la migracion 029 no esta registrada en schema_version';
    END IF;
    FOREACH v_tabla IN ARRAY ARRAY['publicacion_comunidad', 'respuesta_comunidad',
                                   'reaccion_publicacion', 'reaccion_respuesta'] LOOP
        v_oid := to_regclass('public.' || v_tabla);
        IF v_oid IS NULL THEN
            RAISE EXCEPTION 'FALLO: no existe la tabla %', v_tabla;
        END IF;
        IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = v_oid) THEN
            RAISE EXCEPTION 'FALLO: % sin RLS habilitado', v_tabla;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = v_oid) THEN
            RAISE EXCEPTION 'FALLO: % tiene politicas', v_tabla;
        END IF;
        IF has_table_privilege('anon', v_oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
           OR has_table_privilege('authenticated', v_oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') THEN
            RAISE EXCEPTION 'FALLO: % concede privilegios a anon o authenticated', v_tabla;
        END IF;
    END LOOP;
    IF EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public' AND c.relkind = 'S'
           AND c.relname IN ('publicacion_comunidad_id_publicacion_seq', 'respuesta_comunidad_id_respuesta_seq')
           AND (has_sequence_privilege('anon', c.oid, 'USAGE,SELECT,UPDATE')
                OR has_sequence_privilege('authenticated', c.oid, 'USAGE,SELECT,UPDATE'))
    ) THEN
        RAISE EXCEPTION 'FALLO: una secuencia de la comunidad concede privilegios a la API publica';
    END IF;
    IF EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname LIKE 'fn\_%comunidad%'
           AND (has_function_privilege('anon', p.oid, 'EXECUTE')
                OR has_function_privilege('authenticated', p.oid, 'EXECUTE')
                OR NOT coalesce(p.proconfig @> ARRAY['search_path=pg_catalog'], FALSE))
    ) THEN
        RAISE EXCEPTION 'FALLO: una funcion de la comunidad es ejecutable por la API publica o no fija search_path';
    END IF;
END $$;

-- ---------- Restricciones que los casos no ejercitan por si solos ----------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conname = 'fk_respuesta_comunidad_padre' AND contype = 'f'
           AND conrelid = 'public.respuesta_comunidad'::regclass
           AND confrelid = 'public.respuesta_comunidad'::regclass
           AND array_length(conkey, 1) = 2
    ) THEN
        RAISE EXCEPTION 'FALLO: falta la FK compuesta (id_respuesta_padre, id_publicacion)';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conname = 'fk_respuesta_comunidad_citada' AND contype = 'f' AND array_length(conkey, 1) = 2
    ) THEN
        RAISE EXCEPTION 'FALLO: falta la FK compuesta (id_respuesta_citada, id_publicacion)';
    END IF;
    IF (SELECT count(*) FROM pg_constraint
         WHERE conname IN ('fk_reaccion_publicacion_publicacion', 'fk_reaccion_respuesta_respuesta')
           AND confdeltype = 'c') <> 2 THEN
        RAISE EXCEPTION 'FALLO: las reacciones no se borran en cascada con su contenido';
    END IF;
END $$;

-- ---------- Datos de prueba ----------
DO $$
DECLARE
    v_rol BIGINT; v_autor BIGINT; v_otro BIGINT;
    v_cat BIGINT; v_marca BIGINT; v_prod BIGINT;
    v_pub BIGINT; v_pub2 BIGINT; v_cerrada BIGINT; v_eliminada BIGINT;
    v_r0 BIGINT; v_r1 BIGINT; v_r2 BIGINT; v_otra BIGINT;
BEGIN
    INSERT INTO public.rol (nombre) VALUES ('Usuario registrado 029') RETURNING id_rol INTO v_rol;
    INSERT INTO public.usuario (correo, estado, fecha_registro, nombre, id_rol)
    VALUES ('autor029@test.local', TRUE, now(), 'Autor 029', v_rol) RETURNING id_usuario INTO v_autor;
    INSERT INTO public.usuario (correo, estado, fecha_registro, nombre, id_rol)
    VALUES ('otro029@test.local', TRUE, now(), 'Otro 029', v_rol) RETURNING id_usuario INTO v_otro;
    INSERT INTO public.categoria (nombre, estado) VALUES ('Cat 029', TRUE) RETURNING id_categoria INTO v_cat;
    INSERT INTO public.marca (nombre, estado) VALUES ('Marca 029', TRUE) RETURNING id_marca INTO v_marca;
    INSERT INTO public.producto (nombre, estado, id_categoria, id_marca)
    VALUES ('P 029', TRUE, v_cat, v_marca) RETURNING id_producto INTO v_prod;

    INSERT INTO public.publicacion_comunidad (tipo, id_autor, titulo, contenido)
    VALUES ('GENERAL', v_autor, 'Pregunta general', 'Contenido') RETURNING id_publicacion INTO v_pub;
    INSERT INTO public.publicacion_comunidad (tipo, id_producto, id_autor, titulo, contenido)
    VALUES ('PRODUCTO', v_prod, v_autor, 'Sobre el producto', 'Contenido') RETURNING id_publicacion INTO v_pub2;
    INSERT INTO public.publicacion_comunidad (tipo, id_autor, titulo, contenido, cerrada)
    VALUES ('GENERAL', v_autor, 'Hilo cerrado', 'Contenido', TRUE) RETURNING id_publicacion INTO v_cerrada;
    INSERT INTO public.publicacion_comunidad (tipo, id_autor, titulo, contenido, eliminada, fecha_eliminacion, eliminada_por)
    VALUES ('GENERAL', v_autor, 'Hilo eliminado', 'Contenido', TRUE, now(), v_autor) RETURNING id_publicacion INTO v_eliminada;

    INSERT INTO public.respuesta_comunidad (id_publicacion, id_autor, contenido)
    VALUES (v_pub, v_otro, 'nivel 0') RETURNING id_respuesta INTO v_r0;
    INSERT INTO public.respuesta_comunidad (id_publicacion, id_respuesta_padre, id_autor, contenido)
    VALUES (v_pub, v_r0, v_autor, 'nivel 1') RETURNING id_respuesta INTO v_r1;
    INSERT INTO public.respuesta_comunidad (id_publicacion, id_respuesta_padre, id_autor, contenido)
    VALUES (v_pub, v_r1, v_otro, 'nivel 2') RETURNING id_respuesta INTO v_r2;
    INSERT INTO public.respuesta_comunidad (id_publicacion, id_autor, contenido)
    VALUES (v_pub2, v_otro, 'de otra publicacion') RETURNING id_respuesta INTO v_otra;

    IF (SELECT profundidad FROM public.respuesta_comunidad WHERE id_respuesta = v_r0) <> 0
       OR (SELECT profundidad FROM public.respuesta_comunidad WHERE id_respuesta = v_r1) <> 1
       OR (SELECT profundidad FROM public.respuesta_comunidad WHERE id_respuesta = v_r2) <> 2 THEN
        RAISE EXCEPTION 'FALLO: el trigger no calcula la profundidad (0, 1, 2)';
    END IF;

    INSERT INTO ctx VALUES ('autor', v_autor), ('otro', v_otro), ('prod', v_prod),
        ('pub', v_pub), ('pub2', v_pub2), ('cerrada', v_cerrada), ('eliminada', v_eliminada),
        ('r0', v_r0), ('r1', v_r1), ('r2', v_r2), ('otra', v_otra);
END $$;

-- ---------- Reglas (CA-02, CA-03, RN-03, RN-07, RN-08) ----------
DO $$
DECLARE
    v_hermana BIGINT;
BEGIN
    -- CA-02: tipo y producto.
    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.publicacion_comunidad (tipo, id_producto, id_autor, titulo, contenido) VALUES (%L, %s, %s, %L, %L)',
      'GENERAL', pg_temp.id('prod'), pg_temp.id('autor'), 'General con producto', 'x'), 'GENERAL con producto');
    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.publicacion_comunidad (tipo, id_autor, titulo, contenido) VALUES (%L, %s, %L, %L)',
      'PRODUCTO', pg_temp.id('autor'), 'Producto sin producto', 'x'), 'PRODUCTO sin producto');

    -- RN-03: largos.
    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.publicacion_comunidad (tipo, id_autor, titulo, contenido) VALUES (%L, %s, %L, %L)',
      'GENERAL', pg_temp.id('autor'), 'abcd', 'x'), 'un titulo de 4 caracteres');
    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.publicacion_comunidad (tipo, id_autor, titulo, contenido) VALUES (%L, %s, %L, %L)',
      'GENERAL', pg_temp.id('autor'), 'Titulo valido', repeat('a', 5001)), 'una publicacion de 5001 caracteres');
    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.publicacion_comunidad (tipo, id_autor, titulo, contenido) VALUES (%L, %s, %L, %L)',
      'GENERAL', pg_temp.id('autor'), 'Titulo valido', '   '), 'una publicacion en blanco');
    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.respuesta_comunidad (id_publicacion, id_autor, contenido) VALUES (%s, %s, %L)',
      pg_temp.id('pub'), pg_temp.id('autor'), repeat('a', 3001)), 'una respuesta de 3001 caracteres');

    -- RN-03: texto hecho solo de tabuladores o saltos de linea (revision, M-1).
    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.publicacion_comunidad (tipo, id_autor, titulo, contenido) VALUES (%L, %s, %L, %L)',
      'GENERAL', pg_temp.id('autor'), E'\t\t\t\t\t', 'x'), 'un titulo de solo tabuladores');
    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.publicacion_comunidad (tipo, id_autor, titulo, contenido) VALUES (%L, %s, %L, %L)',
      'GENERAL', pg_temp.id('autor'), 'Titulo valido', E'\n'), 'una publicacion de solo un salto de linea');
    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.respuesta_comunidad (id_publicacion, id_autor, contenido) VALUES (%s, %s, %L)',
      pg_temp.id('pub'), pg_temp.id('autor'), E'\n\n\t'), 'una respuesta de solo espacios en blanco');
    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.respuesta_comunidad (id_publicacion, id_autor, contenido) VALUES (%s, %s, %L)',
      pg_temp.id('pub'), pg_temp.id('autor'), '   '), 'una respuesta en blanco');
    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.publicacion_comunidad (tipo, id_autor, titulo, contenido) VALUES (%L, %s, %L, %L)',
      'GENERAL', pg_temp.id('autor'), '   abcd   ', 'x'), 'un titulo de 4 caracteres con espacios alrededor');

    -- Limites validos: deben permitirse.
    INSERT INTO public.publicacion_comunidad (tipo, id_autor, titulo, contenido)
    VALUES ('GENERAL', pg_temp.id('autor'), repeat('t', 150), repeat('c', 5000));
    INSERT INTO public.publicacion_comunidad (tipo, id_autor, titulo, contenido)
    VALUES ('GENERAL', pg_temp.id('autor'), 'abcde', 'c');
    INSERT INTO public.respuesta_comunidad (id_publicacion, id_autor, contenido)
    VALUES (pg_temp.id('pub'), pg_temp.id('autor'), repeat('r', 3000));

    -- CA-03: la madre es de la misma publicacion; profundidad maxima 2.
    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.respuesta_comunidad (id_publicacion, id_respuesta_padre, id_autor, contenido) VALUES (%s, %s, %s, %L)',
      pg_temp.id('pub'), pg_temp.id('otra'), pg_temp.id('autor'), 'madre ajena'), 'una madre de otra publicacion');
    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.respuesta_comunidad (id_publicacion, id_respuesta_padre, id_autor, contenido) VALUES (%s, %s, %s, %L)',
      pg_temp.id('pub'), pg_temp.id('r2'), pg_temp.id('autor'), 'nivel 3'), 'una respuesta de profundidad 3');
    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.respuesta_comunidad (id_publicacion, id_respuesta_padre, id_autor, contenido, profundidad) VALUES (%s, %s, %s, %L, 0)',
      pg_temp.id('pub'), pg_temp.id('r1'), pg_temp.id('autor'), 'profundidad falsa'), 'una profundidad enviada que no coincide con la madre');
    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.respuesta_comunidad (id_publicacion, id_respuesta_padre, id_respuesta_citada, id_autor, contenido) VALUES (%s, %s, %s, %s, %L)',
      pg_temp.id('pub'), pg_temp.id('r1'), pg_temp.id('otra'), pg_temp.id('autor'), 'cita ajena'), 'citar una respuesta de otra publicacion');

    -- La cita solo sirve para la hermana de nivel 2: misma madre que la citada,
    -- y la citada en el nivel 2 (revision independiente, I-2).
    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.respuesta_comunidad (id_publicacion, id_respuesta_citada, id_autor, contenido) VALUES (%s, %s, %s, %L)',
      pg_temp.id('pub'), pg_temp.id('r2'), pg_temp.id('autor'), 'directa que cita'), 'una respuesta directa que cita a una de nivel 2');
    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.respuesta_comunidad (id_publicacion, id_respuesta_padre, id_respuesta_citada, id_autor, contenido) VALUES (%s, %s, %s, %s, %L)',
      pg_temp.id('pub'), pg_temp.id('r0'), pg_temp.id('r2'), pg_temp.id('autor'), 'cita a una prima'), 'citar a una respuesta con otra madre');
    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.respuesta_comunidad (id_publicacion, id_respuesta_padre, id_respuesta_citada, id_autor, contenido) VALUES (%s, %s, %s, %s, %L)',
      pg_temp.id('pub'), pg_temp.id('r0'), pg_temp.id('r1'), pg_temp.id('autor'), 'cita en nivel 1'), 'citar a una respuesta que no es de nivel 2');

    -- Profundidad explicita correcta, como la envia Hibernate: debe permitirse.
    INSERT INTO public.respuesta_comunidad (id_publicacion, id_respuesta_padre, id_autor, contenido, profundidad)
    VALUES (pg_temp.id('pub'), pg_temp.id('r0'), pg_temp.id('autor'), 'profundidad explicita', 1);

    -- Hermana de nivel 2 que cita a la de nivel 2 (P1): debe permitirse.
    INSERT INTO public.respuesta_comunidad (id_publicacion, id_respuesta_padre, id_respuesta_citada, id_autor, contenido)
    VALUES (pg_temp.id('pub'), pg_temp.id('r1'), pg_temp.id('r2'), pg_temp.id('autor'), 'hermana')
    RETURNING id_respuesta INTO v_hermana;
    IF (SELECT profundidad FROM public.respuesta_comunidad WHERE id_respuesta = v_hermana) <> 2 THEN
        RAISE EXCEPTION 'FALLO: la hermana citada no quedo en el nivel 2';
    END IF;

    -- RN-07: publicaciones cerradas o eliminadas.
    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.respuesta_comunidad (id_publicacion, id_autor, contenido) VALUES (%s, %s, %L)',
      pg_temp.id('cerrada'), pg_temp.id('otro'), 'en cerrada'), 'responder en una publicacion cerrada');
    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.respuesta_comunidad (id_publicacion, id_autor, contenido) VALUES (%s, %s, %L)',
      pg_temp.id('eliminada'), pg_temp.id('otro'), 'en eliminada'), 'responder en una publicacion eliminada');

    -- RN-06: campos que no cambian.
    PERFORM pg_temp.debe_fallar(format('UPDATE public.respuesta_comunidad SET id_respuesta_padre = NULL WHERE id_respuesta = %s',
      pg_temp.id('r1')), 'cambiar la madre');
    PERFORM pg_temp.debe_fallar(format('UPDATE public.respuesta_comunidad SET id_publicacion = %s WHERE id_respuesta = %s',
      pg_temp.id('pub2'), pg_temp.id('r0')), 'cambiar la publicacion');
    PERFORM pg_temp.debe_fallar(format('UPDATE public.respuesta_comunidad SET id_autor = %s WHERE id_respuesta = %s',
      pg_temp.id('autor'), pg_temp.id('r0')), 'cambiar el autor de una respuesta');
    PERFORM pg_temp.debe_fallar(format('UPDATE public.respuesta_comunidad SET id_respuesta_citada = %s WHERE id_respuesta = %s',
      pg_temp.id('r0'), pg_temp.id('r2')), 'cambiar la citada');
    PERFORM pg_temp.debe_fallar(format('UPDATE public.respuesta_comunidad SET profundidad = 0 WHERE id_respuesta = %s',
      pg_temp.id('r2')), 'cambiar la profundidad');
    PERFORM pg_temp.debe_fallar(format('UPDATE public.publicacion_comunidad SET id_autor = %s WHERE id_publicacion = %s',
      pg_temp.id('otro'), pg_temp.id('pub')), 'cambiar el autor de una publicacion');
    PERFORM pg_temp.debe_fallar(format('UPDATE public.publicacion_comunidad SET tipo = %L, id_producto = %s WHERE id_publicacion = %s',
      'PRODUCTO', pg_temp.id('prod'), pg_temp.id('pub')), 'cambiar el tipo y el producto de una publicacion');

    PERFORM pg_temp.debe_fallar(format('UPDATE public.respuesta_comunidad SET fecha_creacion = now() - interval %L WHERE id_respuesta = %s',
      '2 hours', pg_temp.id('r0')), 'cambiar la fecha de creacion de una respuesta (base de las cuotas)');
    PERFORM pg_temp.debe_fallar(format('UPDATE public.publicacion_comunidad SET fecha_creacion = now() - interval %L WHERE id_publicacion = %s',
      '2 hours', pg_temp.id('pub')), 'cambiar la fecha de creacion de una publicacion (base de las cuotas)');
    PERFORM pg_temp.debe_fallar(format('UPDATE public.respuesta_comunidad SET id_respuesta = id_respuesta + 1000000 WHERE id_respuesta = %s',
      pg_temp.id('otra')), 'cambiar el id de una respuesta');
    PERFORM pg_temp.debe_fallar(format('UPDATE public.publicacion_comunidad SET id_publicacion = id_publicacion + 1000000 WHERE id_publicacion = %s',
      pg_temp.id('cerrada')), 'cambiar el id de una publicacion');

    -- Lo editable si cambia: contenido, estado y fechas.
    UPDATE public.respuesta_comunidad SET contenido = 'editada', fecha_edicion = now() WHERE id_respuesta = pg_temp.id('r1');
    UPDATE public.publicacion_comunidad SET contenido = 'editada', fecha_edicion = now(),
           fecha_ultima_actividad = now() WHERE id_publicacion = pg_temp.id('pub');

    -- RN-08: un «Me gusta» por usuario y contenido.
    INSERT INTO public.reaccion_publicacion (id_publicacion, id_usuario) VALUES (pg_temp.id('pub'), pg_temp.id('otro'));
    PERFORM pg_temp.debe_fallar(format('INSERT INTO public.reaccion_publicacion (id_publicacion, id_usuario) VALUES (%s, %s)',
      pg_temp.id('pub'), pg_temp.id('otro')), 'dos Me gusta del mismo usuario a una publicacion');
    INSERT INTO public.reaccion_respuesta (id_respuesta, id_usuario) VALUES (pg_temp.id('r0'), pg_temp.id('autor'));
    PERFORM pg_temp.debe_fallar(format('INSERT INTO public.reaccion_respuesta (id_respuesta, id_usuario) VALUES (%s, %s)',
      pg_temp.id('r0'), pg_temp.id('autor')), 'dos Me gusta del mismo usuario a una respuesta');
    PERFORM pg_temp.debe_fallar(format('INSERT INTO public.reaccion_respuesta (id_respuesta, id_usuario, tipo) VALUES (%s, %s, %L)',
      pg_temp.id('r1'), pg_temp.id('autor'), 'NO_ME_GUSTA'), 'un tipo de reaccion no permitido');
    INSERT INTO public.reaccion_publicacion (id_publicacion, id_usuario) VALUES (pg_temp.id('pub'), pg_temp.id('autor'))
    ON CONFLICT DO NOTHING;
    INSERT INTO public.reaccion_publicacion (id_publicacion, id_usuario) VALUES (pg_temp.id('pub'), pg_temp.id('autor'))
    ON CONFLICT DO NOTHING;
    IF (SELECT count(*) FROM public.reaccion_publicacion WHERE id_publicacion = pg_temp.id('pub')) <> 2 THEN
        RAISE EXCEPTION 'FALLO: ON CONFLICT DO NOTHING no dejo un solo Me gusta por usuario';
    END IF;
END $$;

\echo 'OK: todas las verificaciones de la 029 pasaron'
ROLLBACK;
