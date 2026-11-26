-- Verificacion de comportamiento PostgreSQL para la migracion 030
-- (moderacion y reportes de la comunidad). Ejecutar en una base de PRUEBAS
-- con el esquema de produccion y la 030 aplicada. No usar en produccion:
-- inserta datos dentro de una transaccion y los deshace (ROLLBACK).
--
--   psql -v ON_ERROR_STOP=1 -f 030_verificacion_moderacion_comunidad.sql
--
-- Falla con 'FALLO: ...' si una regla no se cumple. Criterios CA-12, CA-13
-- y CA-17. En una base local hay que crear antes los roles anon y
-- authenticated.

BEGIN;

CREATE TEMP TABLE ctx (k TEXT PRIMARY KEY, v BIGINT) ON COMMIT DROP;

-- Ejecuta la sentencia y fuerza los triggers diferidos; debe fallar.
CREATE FUNCTION pg_temp.debe_fallar(p_sql TEXT, p_regla TEXT) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE v_fallo BOOLEAN := FALSE;
BEGIN
    BEGIN
        EXECUTE p_sql;
        SET CONSTRAINTS ALL IMMEDIATE;
        SET CONSTRAINTS ALL DEFERRED;
    EXCEPTION WHEN OTHERS THEN
        v_fallo := TRUE;
    END;
    IF NOT v_fallo THEN
        RAISE EXCEPTION 'FALLO: se permitio %', p_regla;
    END IF;
END $$;

CREATE FUNCTION pg_temp.id(p_k TEXT) RETURNS BIGINT LANGUAGE sql AS $$ SELECT v FROM ctx WHERE k = p_k $$;

CREATE FUNCTION pg_temp.oculta_por_reportes(p_id BIGINT) RETURNS BOOLEAN LANGUAGE sql AS $$
    SELECT oculta_por_reportes FROM public.publicacion_comunidad WHERE id_publicacion = p_id $$;

-- Mueve un reporte con su historial, como lo hace el backend.
CREATE FUNCTION pg_temp.mover_reporte(p_reporte BIGINT, p_moderador BIGINT, p_nuevo TEXT) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE v_actual TEXT;
BEGIN
    SELECT estado INTO v_actual FROM public.reporte_comunidad WHERE id_reporte = p_reporte;
    INSERT INTO public.reporte_comunidad_historial (id_reporte, id_moderador, estado_anterior, estado_nuevo, justificacion)
    VALUES (p_reporte, p_moderador, v_actual, p_nuevo, 'Revisado en la verificacion');
    UPDATE public.reporte_comunidad SET estado = p_nuevo WHERE id_reporte = p_reporte;
END $$;

-- ---------- Estructura y seguridad (CA-17) ----------
DO $$
DECLARE
    v_tabla TEXT;
    v_oid OID;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.schema_version WHERE version = '030_moderacion_comunidad') THEN
        RAISE EXCEPTION 'FALLO: la migracion 030 no esta registrada en schema_version';
    END IF;
    FOREACH v_tabla IN ARRAY ARRAY['moderacion_comunidad_auditoria', 'reporte_comunidad', 'reporte_comunidad_historial'] LOOP
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
           AND (c.relname LIKE 'moderacion_comunidad%' OR c.relname LIKE 'reporte_comunidad%')
           AND (has_sequence_privilege('anon', c.oid, 'USAGE,SELECT,UPDATE')
                OR has_sequence_privilege('authenticated', c.oid, 'USAGE,SELECT,UPDATE'))
    ) THEN
        RAISE EXCEPTION 'FALLO: una secuencia nueva concede privilegios a la API publica';
    END IF;
    IF EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public'
           AND (p.proname LIKE 'fn\_%moderacion\_comunidad%' OR p.proname LIKE 'fn\_%reporte\_comunidad%'
                OR p.proname LIKE 'fn\_%contenido\_comunidad%')
           AND (has_function_privilege('anon', p.oid, 'EXECUTE')
                OR has_function_privilege('authenticated', p.oid, 'EXECUTE')
                OR NOT coalesce(p.proconfig @> ARRAY['search_path=pg_catalog'], FALSE))
    ) THEN
        RAISE EXCEPTION 'FALLO: una funcion nueva es ejecutable por la API publica o no fija search_path';
    END IF;
END $$;

-- ---------- Datos de prueba ----------
DO $$
DECLARE
    v_rol_usuario BIGINT; v_rol_moderador BIGINT;
    v_autor BIGINT; v_o1 BIGINT; v_o2 BIGINT; v_o3 BIGINT; v_sin_rol BIGINT; v_mod1 BIGINT; v_mod2 BIGINT;
    v_pub BIGINT; v_pub_mod2 BIGINT; v_pend1 BIGINT; v_pend2 BIGINT; v_elim BIGINT; v_resp BIGINT;
    v_hilo BIGINT; v_resp_hilo BIGINT; v_resp2 BIGINT; v_resp3 BIGINT;
BEGIN
    INSERT INTO public.rol (nombre) VALUES ('Usuario registrado 030') RETURNING id_rol INTO v_rol_usuario;
    SELECT id_rol INTO v_rol_moderador FROM public.rol WHERE lower(nombre) = 'moderador';
    IF v_rol_moderador IS NULL THEN
        INSERT INTO public.rol (nombre) VALUES ('Moderador') RETURNING id_rol INTO v_rol_moderador;
    END IF;

    INSERT INTO public.usuario (correo, estado, fecha_registro, nombre, id_rol) VALUES
      ('autor030@test.local', TRUE, now(), 'Autor 030', v_rol_usuario) RETURNING id_usuario INTO v_autor;
    INSERT INTO public.usuario (correo, estado, fecha_registro, nombre, id_rol) VALUES
      ('o1_030@test.local', TRUE, now(), 'Otro 1', v_rol_usuario) RETURNING id_usuario INTO v_o1;
    INSERT INTO public.usuario (correo, estado, fecha_registro, nombre, id_rol) VALUES
      ('o2_030@test.local', TRUE, now(), 'Otro 2', v_rol_usuario) RETURNING id_usuario INTO v_o2;
    INSERT INTO public.usuario (correo, estado, fecha_registro, nombre, id_rol) VALUES
      ('o3_030@test.local', TRUE, now(), 'Otro 3', v_rol_usuario) RETURNING id_usuario INTO v_o3;
    INSERT INTO public.usuario (correo, estado, fecha_registro, nombre, id_rol) VALUES
      ('sinrol030@test.local', TRUE, now(), 'Sin rol', v_rol_usuario) RETURNING id_usuario INTO v_sin_rol;
    INSERT INTO public.usuario (correo, estado, fecha_registro, nombre, id_rol) VALUES
      ('mod1_030@test.local', TRUE, now(), 'Moderador 1', v_rol_moderador) RETURNING id_usuario INTO v_mod1;
    INSERT INTO public.usuario (correo, estado, fecha_registro, nombre, id_rol) VALUES
      ('mod2_030@test.local', TRUE, now(), 'Moderador 2', v_rol_moderador) RETURNING id_usuario INTO v_mod2;
    INSERT INTO public.usuario_rol (id_usuario, id_rol) VALUES
      (v_autor, v_rol_usuario), (v_o1, v_rol_usuario), (v_o2, v_rol_usuario), (v_o3, v_rol_usuario),
      (v_sin_rol, v_rol_usuario), (v_mod1, v_rol_moderador), (v_mod2, v_rol_moderador);

    INSERT INTO public.publicacion_comunidad (tipo, id_autor, titulo, contenido)
    VALUES ('GENERAL', v_autor, 'Publicacion reportable', 'Texto original') RETURNING id_publicacion INTO v_pub;
    INSERT INTO public.publicacion_comunidad (tipo, id_autor, titulo, contenido)
    VALUES ('GENERAL', v_mod2, 'Publicacion del moderador 2', 'Texto') RETURNING id_publicacion INTO v_pub_mod2;
    INSERT INTO public.publicacion_comunidad (tipo, id_autor, titulo, contenido, estado_moderacion)
    VALUES ('GENERAL', v_autor, 'Pendiente para aprobar', 'Texto', 'PENDIENTE') RETURNING id_publicacion INTO v_pend1;
    INSERT INTO public.publicacion_comunidad (tipo, id_autor, titulo, contenido, estado_moderacion)
    VALUES ('GENERAL', v_autor, 'Pendiente para rechazar', 'Texto', 'PENDIENTE') RETURNING id_publicacion INTO v_pend2;
    INSERT INTO public.publicacion_comunidad (tipo, id_autor, titulo, contenido, eliminada, fecha_eliminacion, eliminada_por)
    VALUES ('GENERAL', v_autor, 'Ya eliminada', 'Texto', TRUE, now(), v_autor) RETURNING id_publicacion INTO v_elim;
    INSERT INTO public.respuesta_comunidad (id_publicacion, id_autor, contenido)
    VALUES (v_pub, v_o1, 'Una respuesta') RETURNING id_respuesta INTO v_resp;
    INSERT INTO public.publicacion_comunidad (tipo, id_autor, titulo, contenido)
    VALUES ('GENERAL', v_autor, 'Hilo que se eliminara', 'Texto') RETURNING id_publicacion INTO v_hilo;
    INSERT INTO public.respuesta_comunidad (id_publicacion, id_autor, contenido)
    VALUES (v_hilo, v_o1, 'Respuesta en hilo eliminado') RETURNING id_respuesta INTO v_resp_hilo;
    INSERT INTO public.respuesta_comunidad (id_publicacion, id_autor, contenido)
    VALUES (v_pub, v_o2, 'Respuesta para ocultar') RETURNING id_respuesta INTO v_resp2;
    INSERT INTO public.respuesta_comunidad (id_publicacion, id_autor, contenido)
    VALUES (v_pub, v_o3, 'Respuesta oculta y eliminada') RETURNING id_respuesta INTO v_resp3;
    UPDATE public.publicacion_comunidad SET eliminada = TRUE, fecha_eliminacion = now(), eliminada_por = v_autor
     WHERE id_publicacion = v_hilo;

    INSERT INTO ctx VALUES ('autor', v_autor), ('o1', v_o1), ('o2', v_o2), ('o3', v_o3), ('sin_rol', v_sin_rol),
        ('mod1', v_mod1), ('mod2', v_mod2), ('pub', v_pub), ('pub_mod2', v_pub_mod2), ('pend1', v_pend1),
        ('pend2', v_pend2), ('elim', v_elim), ('resp', v_resp), ('resp_hilo', v_resp_hilo), ('resp2', v_resp2), ('resp3', v_resp3);
END $$;

-- ---------- Reportes (CA-12, RN-16) ----------
DO $$
DECLARE
    v_r1 BIGINT; v_r2 BIGINT; v_r3 BIGINT;
BEGIN
    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.reporte_comunidad (id_publicacion, id_usuario, motivo) VALUES (%s, %s, %L)',
      pg_temp.id('pub'), pg_temp.id('autor'), 'spam'), 'que el autor reporte su propia publicacion');
    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.reporte_comunidad (id_respuesta, id_usuario, motivo) VALUES (%s, %s, %L)',
      pg_temp.id('resp'), pg_temp.id('o1'), 'spam'), 'que el autor reporte su propia respuesta');
    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.reporte_comunidad (id_publicacion, id_respuesta, id_usuario, motivo) VALUES (%s, %s, %s, %L)',
      pg_temp.id('pub'), pg_temp.id('resp'), pg_temp.id('o2'), 'spam'), 'un reporte con dos destinos');
    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.reporte_comunidad (id_usuario, motivo) VALUES (%s, %L)',
      pg_temp.id('o2'), 'spam'), 'un reporte sin destino');
    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.reporte_comunidad (id_publicacion, id_usuario, motivo) VALUES (%s, %s, %L)',
      pg_temp.id('pub'), pg_temp.id('o1'), 'desconocido'), 'un motivo desconocido');
    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.reporte_comunidad (id_publicacion, id_usuario, motivo) VALUES (%s, %s, %L)',
      pg_temp.id('pub'), pg_temp.id('o1'), 'otro'), 'el motivo otro sin descripcion');
    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.reporte_comunidad (id_publicacion, id_usuario, motivo, descripcion) VALUES (%s, %s, %L, %L)',
      pg_temp.id('pub'), pg_temp.id('o1'), 'otro', repeat('x', 501)), 'una descripcion de 501 caracteres');
    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.reporte_comunidad (id_publicacion, id_usuario, motivo) VALUES (%s, %s, %L)',
      pg_temp.id('elim'), pg_temp.id('o1'), 'spam'), 'reportar contenido eliminado');
    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.reporte_comunidad (id_respuesta, id_usuario, motivo) VALUES (%s, %s, %L)',
      pg_temp.id('resp_hilo'), pg_temp.id('o2'), 'spam'), 'reportar una respuesta de una publicacion eliminada (revision, M-2)');
    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.reporte_comunidad (id_publicacion, id_usuario, motivo, estado) VALUES (%s, %s, %L, %L)',
      pg_temp.id('pub'), pg_temp.id('o1'), 'spam', 'ACEPTADO'), 'crear un reporte ya resuelto');

    INSERT INTO public.reporte_comunidad (id_publicacion, id_usuario, motivo)
    VALUES (pg_temp.id('pub'), pg_temp.id('o1'), 'spam') RETURNING id_reporte INTO v_r1;
    IF (SELECT tipo_contenido FROM public.reporte_comunidad WHERE id_reporte = v_r1) <> 'PUBLICACION' THEN
        RAISE EXCEPTION 'FALLO: tipo_contenido no se genero como PUBLICACION';
    END IF;
    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.reporte_comunidad (id_publicacion, id_usuario, motivo) VALUES (%s, %s, %L)',
      pg_temp.id('pub'), pg_temp.id('o1'), 'acoso'), 'un segundo reporte abierto del mismo usuario');

    -- Ocultamiento por reportes (RN-13): el tercero oculta.
    INSERT INTO public.reporte_comunidad (id_publicacion, id_usuario, motivo)
    VALUES (pg_temp.id('pub'), pg_temp.id('o2'), 'acoso') RETURNING id_reporte INTO v_r2;
    IF pg_temp.oculta_por_reportes(pg_temp.id('pub')) THEN
        RAISE EXCEPTION 'FALLO: se oculto con 2 reportes';
    END IF;
    INSERT INTO public.reporte_comunidad (id_publicacion, id_usuario, motivo, descripcion)
    VALUES (pg_temp.id('pub'), pg_temp.id('o3'), 'otro', 'Contenido engañoso') RETURNING id_reporte INTO v_r3;
    IF NOT pg_temp.oculta_por_reportes(pg_temp.id('pub')) THEN
        RAISE EXCEPTION 'FALLO: el tercer reporte no oculto la publicacion';
    END IF;

    -- La marca de ocultamiento por reportes sale del conteo real (revision, I-3).
    UPDATE public.publicacion_comunidad SET oculta_por_reportes = FALSE WHERE id_publicacion = pg_temp.id('pub');
    IF NOT pg_temp.oculta_por_reportes(pg_temp.id('pub')) THEN
        RAISE EXCEPTION 'FALLO: se desoculto con 3 reportes activos escribiendo la columna';
    END IF;
    UPDATE public.publicacion_comunidad SET oculta_por_reportes = TRUE WHERE id_publicacion = pg_temp.id('pub_mod2');
    IF pg_temp.oculta_por_reportes(pg_temp.id('pub_mod2')) THEN
        RAISE EXCEPTION 'FALLO: se oculto sin reportes escribiendo la columna';
    END IF;

    -- Transiciones y su historial.
    PERFORM pg_temp.debe_fallar(format('UPDATE public.reporte_comunidad SET estado = %L WHERE id_reporte = %s',
      'ACEPTADO', v_r1), 'saltar de PENDIENTE a ACEPTADO');
    PERFORM pg_temp.debe_fallar(format('UPDATE public.reporte_comunidad SET estado = %L WHERE id_reporte = %s',
      'EN_REVISION', v_r1), 'cambiar de estado sin historial');
    PERFORM pg_temp.debe_fallar(format('UPDATE public.reporte_comunidad SET motivo = %L WHERE id_reporte = %s',
      'acoso', v_r1), 'cambiar el motivo de un reporte');
    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.reporte_comunidad_historial (id_reporte, id_moderador, estado_anterior, estado_nuevo, justificacion) VALUES (%s, %s, %L, %L, %L)',
      v_r1, pg_temp.id('sin_rol'), 'PENDIENTE', 'EN_REVISION', 'x'), 'un historial de alguien sin rol');
    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.reporte_comunidad_historial (id_reporte, id_moderador, estado_anterior, estado_nuevo, justificacion) VALUES (%s, %s, %L, %L, %L)',
      v_r1, pg_temp.id('mod1'), 'EN_REVISION', 'ACEPTADO', 'x'), 'un estado anterior que no coincide');
    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.reporte_comunidad_historial (id_reporte, id_moderador, estado_anterior, estado_nuevo, justificacion) VALUES (%s, %s, %L, %L, %L)',
      v_r1, pg_temp.id('mod1'), 'PENDIENTE', 'EN_REVISION', '   '), 'una justificacion vacia');

    PERFORM pg_temp.mover_reporte(v_r1, pg_temp.id('mod1'), 'EN_REVISION');
    PERFORM pg_temp.mover_reporte(v_r1, pg_temp.id('mod1'), 'RECHAZADO');
    SET CONSTRAINTS ALL IMMEDIATE;
    SET CONSTRAINTS ALL DEFERRED;
    IF pg_temp.oculta_por_reportes(pg_temp.id('pub')) THEN
        RAISE EXCEPTION 'FALLO: rechazar un reporte no restauro la publicacion';
    END IF;
    PERFORM pg_temp.debe_fallar(format('UPDATE public.reporte_comunidad SET estado = %L WHERE id_reporte = %s',
      'EN_REVISION', v_r1), 'reabrir un reporte resuelto');

    -- Tras un rechazo, el mismo usuario puede volver a reportar.
    INSERT INTO public.reporte_comunidad (id_publicacion, id_usuario, motivo)
    VALUES (pg_temp.id('pub'), pg_temp.id('o1'), 'lenguaje-ofensivo');
    IF NOT pg_temp.oculta_por_reportes(pg_temp.id('pub')) THEN
        RAISE EXCEPTION 'FALLO: el nuevo reporte no volvio a ocultar';
    END IF;

    -- Aceptar no restaura.
    PERFORM pg_temp.mover_reporte(v_r2, pg_temp.id('mod1'), 'EN_REVISION');
    PERFORM pg_temp.mover_reporte(v_r2, pg_temp.id('mod1'), 'ACEPTADO');
    SET CONSTRAINTS ALL IMMEDIATE;
    SET CONSTRAINTS ALL DEFERRED;
    IF NOT pg_temp.oculta_por_reportes(pg_temp.id('pub')) THEN
        RAISE EXCEPTION 'FALLO: aceptar un reporte restauro la publicacion';
    END IF;

    -- Conflicto de interes en el historial: ni quien reporto ni el autor.
    INSERT INTO public.reporte_comunidad (id_publicacion, id_usuario, motivo)
    VALUES (pg_temp.id('pub_mod2'), pg_temp.id('mod1'), 'spam') RETURNING id_reporte INTO v_r1;
    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.reporte_comunidad_historial (id_reporte, id_moderador, estado_anterior, estado_nuevo, justificacion) VALUES (%s, %s, %L, %L, %L)',
      v_r1, pg_temp.id('mod1'), 'PENDIENTE', 'EN_REVISION', 'x'), 'que quien reporto resuelva su reporte');
    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.reporte_comunidad_historial (id_reporte, id_moderador, estado_anterior, estado_nuevo, justificacion) VALUES (%s, %s, %L, %L, %L)',
      v_r1, pg_temp.id('mod2'), 'PENDIENTE', 'EN_REVISION', 'x'), 'que el autor del contenido resuelva el reporte');

    PERFORM pg_temp.debe_fallar(format('UPDATE public.reporte_comunidad_historial SET justificacion = %L WHERE id_reporte = %s',
      'otra', v_r2), 'modificar el historial de reportes');
    PERFORM pg_temp.debe_fallar(format('DELETE FROM public.reporte_comunidad_historial WHERE id_reporte = %s', v_r2),
      'borrar el historial de reportes');
    PERFORM pg_temp.debe_fallar(format('DELETE FROM public.reporte_comunidad WHERE id_reporte = %s', v_r3),
      'borrar un reporte');
END $$;

-- ---------- Auditoria de moderacion (CA-13, RN-11, RN-16) ----------
DO $$
BEGIN
    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.moderacion_comunidad_auditoria (id_publicacion, id_moderador, accion, motivo, contenido_revisado) VALUES (%s, %s, %L, %L, %L)',
      pg_temp.id('pub_mod2'), pg_temp.id('mod2'), 'OCULTAR', 'Incumple', 'Texto'), 'que un moderador modere su propio contenido');
    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.moderacion_comunidad_auditoria (id_publicacion, id_moderador, accion, motivo, contenido_revisado) VALUES (%s, %s, %L, %L, %L)',
      pg_temp.id('pub'), pg_temp.id('sin_rol'), 'OCULTAR', 'Incumple', 'Texto'), 'que alguien sin rol modere');
    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.moderacion_comunidad_auditoria (id_publicacion, id_moderador, accion, motivo, contenido_revisado) VALUES (%s, %s, %L, %L, %L)',
      pg_temp.id('pub'), pg_temp.id('mod1'), 'APROBAR', 'Correcto', 'Texto'), 'aprobar una publicacion que no esta pendiente');
    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.moderacion_comunidad_auditoria (id_publicacion, id_moderador, accion, motivo, contenido_revisado) VALUES (%s, %s, %L, %L, %L)',
      pg_temp.id('pub'), pg_temp.id('mod1'), 'RESTAURAR', 'Correcto', 'Texto'), 'restaurar algo que no esta oculto por moderacion');
    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.moderacion_comunidad_auditoria (id_respuesta, id_moderador, accion, motivo, contenido_revisado) VALUES (%s, %s, %L, %L, %L)',
      pg_temp.id('resp'), pg_temp.id('mod1'), 'CERRAR', 'Hilo agotado', 'Texto'), 'cerrar una respuesta');
    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.moderacion_comunidad_auditoria (id_publicacion, id_moderador, accion, motivo, contenido_revisado) VALUES (%s, %s, %L, %L, %L)',
      pg_temp.id('pub'), pg_temp.id('mod1'), 'OCULTAR', '   ', 'Texto'), 'una decision sin motivo');
    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.moderacion_comunidad_auditoria (id_publicacion, id_moderador, accion, motivo, contenido_revisado) VALUES (%s, %s, %L, %L, %L)',
      pg_temp.id('pub'), pg_temp.id('mod1'), 'BORRAR', 'x', 'Texto'), 'una accion desconocida');

    -- Cambiar el contenido sin auditoria, o auditar sin cambiar el contenido.
    PERFORM pg_temp.debe_fallar(format('UPDATE public.publicacion_comunidad SET oculta_por_moderacion = TRUE WHERE id_publicacion = %s',
      pg_temp.id('pub')), 'ocultar sin auditoria');
    PERFORM pg_temp.debe_fallar(format('UPDATE public.publicacion_comunidad SET estado_moderacion = %L WHERE id_publicacion = %s',
      'PUBLICADA', pg_temp.id('pend1')), 'aprobar sin auditoria');
    PERFORM pg_temp.debe_fallar(format(
      'UPDATE public.publicacion_comunidad SET eliminada = TRUE, fecha_eliminacion = now(), eliminada_por = %s WHERE id_publicacion = %s',
      pg_temp.id('mod1'), pg_temp.id('pub')), 'que un moderador elimine sin auditoria');
    PERFORM pg_temp.debe_fallar(format('UPDATE public.publicacion_comunidad SET cerrada = TRUE WHERE id_publicacion = %s',
      pg_temp.id('pub')), 'cerrar sin auditoria');
    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.moderacion_comunidad_auditoria (id_publicacion, id_moderador, accion, motivo, contenido_revisado) VALUES (%s, %s, %L, %L, %L)',
      pg_temp.id('pub'), pg_temp.id('mod1'), 'OCULTAR', 'Incumple', 'Texto'), 'una auditoria OCULTAR sin ocultar el contenido');
    PERFORM pg_temp.debe_fallar(format('UPDATE public.publicacion_comunidad SET estado_moderacion = %L WHERE id_publicacion = %s',
      'RECHAZADA', pg_temp.id('pub')), 'pasar de PUBLICADA a RECHAZADA sin revision');

    -- Pasar a PENDIENTE sin editar oculta sin rastro (revision, I-1).
    PERFORM pg_temp.debe_fallar(format('UPDATE public.publicacion_comunidad SET estado_moderacion = %L WHERE id_publicacion = %s',
      'PENDIENTE', pg_temp.id('pub')), 'pasar a PENDIENTE sin edicion ni auditoria');

    -- Dos auditorias iguales en la misma transaccion (revision, M-3).
    -- Un DO agrupa las dos sentencias: EXECUTE no admite varias en un mismo texto.
    PERFORM pg_temp.debe_fallar(format(
      'DO $d$ BEGIN INSERT INTO public.moderacion_comunidad_auditoria (id_respuesta, id_moderador, accion, motivo, contenido_revisado) VALUES (%s, %s, %L, %L, %L); '
      || 'INSERT INTO public.moderacion_comunidad_auditoria (id_respuesta, id_moderador, accion, motivo, contenido_revisado) VALUES (%s, %s, %L, %L, %L); '
      || 'UPDATE public.respuesta_comunidad SET oculta_por_moderacion = TRUE WHERE id_respuesta = %s; END $d$',
      pg_temp.id('resp2'), pg_temp.id('mod1'), 'OCULTAR', 'Una', 'Texto', pg_temp.id('resp2'), pg_temp.id('mod1'), 'OCULTAR', 'Dos', 'Texto',
      pg_temp.id('resp2')),
      'dos auditorias OCULTAR del mismo contenido en una transaccion');

    -- Eliminacion firmada por otro moderador distinto del que audita.
    PERFORM pg_temp.debe_fallar(format(
      'DO $d$ BEGIN INSERT INTO public.moderacion_comunidad_auditoria (id_respuesta, id_moderador, accion, motivo, contenido_revisado) VALUES (%s, %s, %L, %L, %L); '
      || 'UPDATE public.respuesta_comunidad SET eliminada = TRUE, fecha_eliminacion = now(), eliminada_por = %s WHERE id_respuesta = %s; END $d$',
      pg_temp.id('resp2'), pg_temp.id('mod1'), 'ELIMINAR_MODERADOR', 'Spam', 'Texto', pg_temp.id('mod2'), pg_temp.id('resp2')),
      'una eliminacion auditada por un moderador y firmada por otro');

    -- Ocultar y restaurar una respuesta.
    INSERT INTO public.moderacion_comunidad_auditoria (id_respuesta, id_moderador, accion, motivo, contenido_revisado)
    VALUES (pg_temp.id('resp2'), pg_temp.id('mod1'), 'OCULTAR', 'Incumple', 'Respuesta para ocultar');
    UPDATE public.respuesta_comunidad SET oculta_por_moderacion = TRUE WHERE id_respuesta = pg_temp.id('resp2');
    SET CONSTRAINTS ALL IMMEDIATE;
    SET CONSTRAINTS ALL DEFERRED;
    INSERT INTO public.moderacion_comunidad_auditoria (id_respuesta, id_moderador, accion, motivo, contenido_revisado)
    VALUES (pg_temp.id('resp2'), pg_temp.id('mod1'), 'RESTAURAR', 'Revisado', 'Respuesta para ocultar');
    UPDATE public.respuesta_comunidad SET oculta_por_moderacion = FALSE WHERE id_respuesta = pg_temp.id('resp2');
    SET CONSTRAINTS ALL IMMEDIATE;
    SET CONSTRAINTS ALL DEFERRED;

    -- Decisiones validas.
    INSERT INTO public.moderacion_comunidad_auditoria (id_publicacion, id_moderador, accion, motivo, contenido_revisado)
    VALUES (pg_temp.id('pub'), pg_temp.id('mod1'), 'OCULTAR', 'Incumple las normas', 'Texto original');
    UPDATE public.publicacion_comunidad SET oculta_por_moderacion = TRUE WHERE id_publicacion = pg_temp.id('pub');
    SET CONSTRAINTS ALL IMMEDIATE;
    SET CONSTRAINTS ALL DEFERRED;

    INSERT INTO public.moderacion_comunidad_auditoria (id_publicacion, id_moderador, accion, motivo, contenido_revisado)
    VALUES (pg_temp.id('pub'), pg_temp.id('mod1'), 'RESTAURAR', 'Revisado de nuevo', 'Texto original');
    UPDATE public.publicacion_comunidad SET oculta_por_moderacion = FALSE WHERE id_publicacion = pg_temp.id('pub');
    SET CONSTRAINTS ALL IMMEDIATE;
    SET CONSTRAINTS ALL DEFERRED;

    INSERT INTO public.moderacion_comunidad_auditoria (id_publicacion, id_moderador, accion, motivo, contenido_revisado)
    VALUES (pg_temp.id('pend1'), pg_temp.id('mod1'), 'APROBAR', 'Correcto', 'Texto');
    UPDATE public.publicacion_comunidad SET estado_moderacion = 'PUBLICADA' WHERE id_publicacion = pg_temp.id('pend1');
    INSERT INTO public.moderacion_comunidad_auditoria (id_publicacion, id_moderador, accion, motivo, contenido_revisado)
    VALUES (pg_temp.id('pend2'), pg_temp.id('mod1'), 'RECHAZAR', 'Lenguaje ofensivo', 'Texto');
    UPDATE public.publicacion_comunidad SET estado_moderacion = 'RECHAZADA' WHERE id_publicacion = pg_temp.id('pend2');
    SET CONSTRAINTS ALL IMMEDIATE;
    SET CONSTRAINTS ALL DEFERRED;

    -- Lo rechazado no se publica directamente; el autor puede editarlo y vuelve a revision.
    PERFORM pg_temp.debe_fallar(format('UPDATE public.publicacion_comunidad SET estado_moderacion = %L WHERE id_publicacion = %s',
      'PUBLICADA', pg_temp.id('pend2')), 'publicar directamente algo rechazado');
    UPDATE public.publicacion_comunidad SET estado_moderacion = 'PENDIENTE', contenido = 'Texto corregido', fecha_edicion = now()
     WHERE id_publicacion = pg_temp.id('pend2');
    SET CONSTRAINTS ALL IMMEDIATE;
    SET CONSTRAINTS ALL DEFERRED;

    -- Eliminacion por moderador, auditada e irreversible.
    INSERT INTO public.moderacion_comunidad_auditoria (id_respuesta, id_moderador, accion, motivo, contenido_revisado)
    VALUES (pg_temp.id('resp'), pg_temp.id('mod1'), 'ELIMINAR_MODERADOR', 'Spam', 'Una respuesta');
    UPDATE public.respuesta_comunidad SET eliminada = TRUE, fecha_eliminacion = now(), eliminada_por = pg_temp.id('mod1')
     WHERE id_respuesta = pg_temp.id('resp');
    SET CONSTRAINTS ALL IMMEDIATE;
    SET CONSTRAINTS ALL DEFERRED;
    PERFORM pg_temp.debe_fallar(format(
      'UPDATE public.respuesta_comunidad SET eliminada = FALSE, fecha_eliminacion = NULL, eliminada_por = NULL WHERE id_respuesta = %s',
      pg_temp.id('resp')), 'deshacer una eliminacion');

    -- Restaurar algo eliminado no tiene sentido (revision, M-4).
    INSERT INTO public.moderacion_comunidad_auditoria (id_respuesta, id_moderador, accion, motivo, contenido_revisado)
    VALUES (pg_temp.id('resp3'), pg_temp.id('mod1'), 'OCULTAR', 'Incumple', 'Respuesta oculta y eliminada');
    UPDATE public.respuesta_comunidad SET oculta_por_moderacion = TRUE WHERE id_respuesta = pg_temp.id('resp3');
    INSERT INTO public.moderacion_comunidad_auditoria (id_respuesta, id_moderador, accion, motivo, contenido_revisado)
    VALUES (pg_temp.id('resp3'), pg_temp.id('mod2'), 'ELIMINAR_MODERADOR', 'Spam', 'Respuesta oculta y eliminada');
    UPDATE public.respuesta_comunidad SET eliminada = TRUE, fecha_eliminacion = now(), eliminada_por = pg_temp.id('mod2')
     WHERE id_respuesta = pg_temp.id('resp3');
    SET CONSTRAINTS ALL IMMEDIATE;
    SET CONSTRAINTS ALL DEFERRED;
    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.moderacion_comunidad_auditoria (id_respuesta, id_moderador, accion, motivo, contenido_revisado) VALUES (%s, %s, %L, %L, %L)',
      pg_temp.id('resp3'), pg_temp.id('mod1'), 'RESTAURAR', 'x', 'Texto'), 'restaurar contenido eliminado');
    IF (SELECT tipo_contenido FROM public.moderacion_comunidad_auditoria WHERE id_respuesta = pg_temp.id('resp')) <> 'RESPUESTA' THEN
        RAISE EXCEPTION 'FALLO: tipo_contenido de la auditoria no se genero como RESPUESTA';
    END IF;

    -- El autor elimina lo suyo sin auditoria.
    UPDATE public.publicacion_comunidad SET eliminada = TRUE, fecha_eliminacion = now(), eliminada_por = pg_temp.id('autor')
     WHERE id_publicacion = pg_temp.id('pend1');
    SET CONSTRAINTS ALL IMMEDIATE;
    SET CONSTRAINTS ALL DEFERRED;

    -- La auditoria es de solo insercion.
    PERFORM pg_temp.debe_fallar(format('UPDATE public.moderacion_comunidad_auditoria SET motivo = %L WHERE id_publicacion = %s',
      'otro', pg_temp.id('pub')), 'modificar la auditoria');
    PERFORM pg_temp.debe_fallar(format('DELETE FROM public.moderacion_comunidad_auditoria WHERE id_publicacion = %s',
      pg_temp.id('pub')), 'borrar la auditoria');
END $$;

\echo 'OK: todas las verificaciones de la 030 pasaron'
ROLLBACK;
