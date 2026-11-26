-- Verificacion de comportamiento PostgreSQL para la migracion 031
-- (apelaciones de la comunidad). Ejecutar en una base de PRUEBAS con el
-- esquema de produccion y la 031 aplicada. No usar en produccion: inserta
-- datos dentro de una transaccion y los deshace (ROLLBACK).
--
--   psql -v ON_ERROR_STOP=1 -f 031_verificacion_apelaciones_comunidad.sql
--
-- Falla con 'FALLO: ...' si una regla no se cumple. Criterios CA-15 y CA-17.
-- Limitacion: todo el script es una transaccion (txid_current() no cambia y
-- la 030 no admite dos decisiones iguales en una transaccion). Dos casos se
-- prueban aparte, con operaciones confirmadas, en
-- docs/sql/tests/031_verificacion_transacciones.sh:
--   - una apelacion aceptada en OTRA transaccion no permite aprobar;
--   - la apelacion aceptada de un rechazo que no es el ultimo no permite aprobar;
--   - el ultimo rechazo se decide por id, aunque su fecha_evento sea anterior;
--   - no se puede apelar mientras el autor elimina el contenido.

BEGIN;

CREATE TEMP TABLE ctx (k TEXT PRIMARY KEY, v BIGINT) ON COMMIT DROP;

-- Debe fallar, y por el motivo esperado: p_motivo es un fragmento del mensaje.
CREATE FUNCTION pg_temp.debe_fallar(p_sql TEXT, p_regla TEXT, p_motivo TEXT) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE v_error TEXT;
BEGIN
    BEGIN
        EXECUTE p_sql;
        SET CONSTRAINTS ALL IMMEDIATE;
        SET CONSTRAINTS ALL DEFERRED;
    EXCEPTION WHEN OTHERS THEN
        v_error := SQLERRM;
    END;
    IF v_error IS NULL THEN
        RAISE EXCEPTION 'FALLO: se permitio %', p_regla;
    END IF;
    IF strpos(v_error, p_motivo) = 0 THEN
        RAISE EXCEPTION 'FALLO: % fallo por otro motivo: %', p_regla, v_error;
    END IF;
END $$;

CREATE FUNCTION pg_temp.id(p_k TEXT) RETURNS BIGINT LANGUAGE sql AS $$ SELECT v FROM ctx WHERE k = p_k $$;

-- Decision de moderacion completa (auditoria y cambio), como el backend.
CREATE FUNCTION pg_temp.decidir_pub(p_pub BIGINT, p_mod BIGINT, p_accion TEXT) RETURNS BIGINT LANGUAGE plpgsql AS $$
DECLARE v_id BIGINT;
BEGIN
    INSERT INTO public.moderacion_comunidad_auditoria (id_publicacion, id_moderador, accion, motivo, contenido_revisado)
    VALUES (p_pub, p_mod, p_accion, 'Motivo de prueba', 'Texto revisado') RETURNING id_auditoria INTO v_id;
    IF p_accion = 'APROBAR' THEN
        UPDATE public.publicacion_comunidad SET estado_moderacion = 'PUBLICADA' WHERE id_publicacion = p_pub;
    ELSIF p_accion = 'RECHAZAR' THEN
        UPDATE public.publicacion_comunidad SET estado_moderacion = 'RECHAZADA' WHERE id_publicacion = p_pub;
    ELSIF p_accion = 'OCULTAR' THEN
        UPDATE public.publicacion_comunidad SET oculta_por_moderacion = TRUE WHERE id_publicacion = p_pub;
    ELSIF p_accion = 'ELIMINAR_MODERADOR' THEN
        UPDATE public.publicacion_comunidad SET eliminada = TRUE, fecha_eliminacion = now(), eliminada_por = p_mod
         WHERE id_publicacion = p_pub;
    END IF;
    RETURN v_id;
END $$;

-- ---------- Estructura y seguridad (CA-17) ----------
DO $$
DECLARE v_oid OID := to_regclass('public.apelacion_comunidad');
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.schema_version WHERE version = '031_apelaciones_comunidad') THEN
        RAISE EXCEPTION 'FALLO: la migracion 031 no esta registrada en schema_version';
    END IF;
    IF v_oid IS NULL THEN
        RAISE EXCEPTION 'FALLO: no existe la tabla apelacion_comunidad';
    END IF;
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = v_oid) THEN
        RAISE EXCEPTION 'FALLO: apelacion_comunidad sin RLS';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = v_oid) THEN
        RAISE EXCEPTION 'FALLO: apelacion_comunidad tiene politicas';
    END IF;
    IF has_table_privilege('anon', v_oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
       OR has_table_privilege('authenticated', v_oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
       OR has_sequence_privilege('anon', 'public.apelacion_comunidad_id_apelacion_seq', 'USAGE,SELECT,UPDATE')
       OR has_sequence_privilege('authenticated', 'public.apelacion_comunidad_id_apelacion_seq', 'USAGE,SELECT,UPDATE') THEN
        RAISE EXCEPTION 'FALLO: la API publica tiene privilegios sobre apelacion_comunidad';
    END IF;
    IF EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname LIKE 'fn\_%apelacion\_comunidad%'
           AND (has_function_privilege('anon', p.oid, 'EXECUTE')
                OR has_function_privilege('authenticated', p.oid, 'EXECUTE')
                OR NOT coalesce(p.proconfig @> ARRAY['search_path=pg_catalog'], FALSE))
    ) THEN
        RAISE EXCEPTION 'FALLO: una funcion de apelaciones es ejecutable por la API publica o no fija search_path';
    END IF;
    -- Si alguien reaplico la 030 despues de la 031, estas funciones perdieron la reversion.
    IF (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public'
           AND p.proname IN ('fn_validar_insert_moderacion_comunidad', 'fn_exigir_auditoria_contenido_comunidad')
           AND p.prosrc LIKE '%fn_apelacion_comunidad_revierte_rechazo%') <> 2 THEN
        RAISE EXCEPTION 'FALLO: las funciones de la 030 no tienen la reversion de la 031 (¿se reaplico la 030?)';
    END IF;
END $$;

-- ---------- Datos de prueba ----------
DO $$
DECLARE
    v_rol_usuario BIGINT; v_rol_moderador BIGINT;
    v_autor BIGINT; v_otro BIGINT; v_sin_rol BIGINT; v_mod1 BIGINT; v_mod2 BIGINT;
    v_rech BIGINT; v_oculta BIGINT; v_elim BIGINT; v_vieja BIGINT; v_autoelim BIGINT; v_libre BIGINT;
    v_autormod BIGINT; v_pub_autormod BIGINT; v_rech2 BIGINT;
BEGIN
    INSERT INTO public.rol (nombre) VALUES ('Usuario registrado 031') RETURNING id_rol INTO v_rol_usuario;
    SELECT id_rol INTO v_rol_moderador FROM public.rol WHERE lower(nombre) = 'moderador';
    IF v_rol_moderador IS NULL THEN
        INSERT INTO public.rol (nombre) VALUES ('Moderador') RETURNING id_rol INTO v_rol_moderador;
    END IF;
    INSERT INTO public.usuario (correo, estado, fecha_registro, nombre, id_rol)
    VALUES ('autor031@test.local', TRUE, now(), 'Autor 031', v_rol_usuario) RETURNING id_usuario INTO v_autor;
    INSERT INTO public.usuario (correo, estado, fecha_registro, nombre, id_rol)
    VALUES ('otro031@test.local', TRUE, now(), 'Otro 031', v_rol_usuario) RETURNING id_usuario INTO v_otro;
    INSERT INTO public.usuario (correo, estado, fecha_registro, nombre, id_rol)
    VALUES ('sinrol031@test.local', TRUE, now(), 'Sin rol 031', v_rol_usuario) RETURNING id_usuario INTO v_sin_rol;
    INSERT INTO public.usuario (correo, estado, fecha_registro, nombre, id_rol)
    VALUES ('mod1_031@test.local', TRUE, now(), 'Moderador 1', v_rol_moderador) RETURNING id_usuario INTO v_mod1;
    INSERT INTO public.usuario (correo, estado, fecha_registro, nombre, id_rol)
    VALUES ('mod2_031@test.local', TRUE, now(), 'Moderador 2', v_rol_moderador) RETURNING id_usuario INTO v_mod2;
    INSERT INTO public.usuario (correo, estado, fecha_registro, nombre, id_rol)
    VALUES ('autormod031@test.local', TRUE, now(), 'Autor moderador 031', v_rol_moderador) RETURNING id_usuario INTO v_autormod;
    INSERT INTO public.usuario_rol (id_usuario, id_rol) VALUES
      (v_autor, v_rol_usuario), (v_otro, v_rol_usuario), (v_sin_rol, v_rol_usuario),
      (v_mod1, v_rol_moderador), (v_mod2, v_rol_moderador), (v_autormod, v_rol_moderador);

    INSERT INTO public.publicacion_comunidad (tipo, id_autor, titulo, contenido, estado_moderacion)
    VALUES ('GENERAL', v_autor, 'Rechazada para apelar', 'Texto', 'PENDIENTE') RETURNING id_publicacion INTO v_rech;
    INSERT INTO public.publicacion_comunidad (tipo, id_autor, titulo, contenido)
    VALUES ('GENERAL', v_autor, 'Oculta para apelar', 'Texto') RETURNING id_publicacion INTO v_oculta;
    INSERT INTO public.publicacion_comunidad (tipo, id_autor, titulo, contenido)
    VALUES ('GENERAL', v_autor, 'Eliminada por moderador', 'Texto') RETURNING id_publicacion INTO v_elim;
    INSERT INTO public.publicacion_comunidad (tipo, id_autor, titulo, contenido)
    VALUES ('GENERAL', v_autor, 'Decision antigua', 'Texto') RETURNING id_publicacion INTO v_vieja;
    INSERT INTO public.publicacion_comunidad (tipo, id_autor, titulo, contenido, estado_moderacion)
    VALUES ('GENERAL', v_autor, 'Rechazada y eliminada por su autor', 'Texto', 'PENDIENTE') RETURNING id_publicacion INTO v_autoelim;
    INSERT INTO public.publicacion_comunidad (tipo, id_autor, titulo, contenido, estado_moderacion)
    VALUES ('GENERAL', v_autor, 'Rechazada sin apelacion', 'Texto', 'PENDIENTE') RETURNING id_publicacion INTO v_libre;

    INSERT INTO public.publicacion_comunidad (tipo, id_autor, titulo, contenido, estado_moderacion)
    VALUES ('GENERAL', v_autormod, 'Rechazada de un moderador', 'Texto', 'PENDIENTE') RETURNING id_publicacion INTO v_pub_autormod;
    INSERT INTO public.publicacion_comunidad (tipo, id_autor, titulo, contenido, estado_moderacion)
    VALUES ('GENERAL', v_autor, 'Rechazada con apelacion rechazada', 'Texto', 'PENDIENTE') RETURNING id_publicacion INTO v_rech2;
    INSERT INTO ctx VALUES ('autormod', v_autormod), ('pub_autormod', v_pub_autormod), ('rech2', v_rech2);

    INSERT INTO ctx VALUES ('autor', v_autor), ('otro', v_otro), ('sin_rol', v_sin_rol), ('mod1', v_mod1), ('mod2', v_mod2),
      ('rech', v_rech), ('oculta', v_oculta), ('elim', v_elim), ('vieja', v_vieja), ('autoelim', v_autoelim),
      ('libre', v_libre);

    INSERT INTO ctx VALUES ('d_rech', pg_temp.decidir_pub(v_rech, v_mod1, 'RECHAZAR'));
    INSERT INTO ctx VALUES ('d_oculta', pg_temp.decidir_pub(v_oculta, v_mod1, 'OCULTAR'));
    INSERT INTO ctx VALUES ('d_elim', pg_temp.decidir_pub(v_elim, v_mod1, 'ELIMINAR_MODERADOR'));
    INSERT INTO ctx VALUES ('d_autoelim', pg_temp.decidir_pub(v_autoelim, v_mod1, 'RECHAZAR'));
    INSERT INTO ctx VALUES ('d_libre', pg_temp.decidir_pub(v_libre, v_mod1, 'RECHAZAR'));
    INSERT INTO ctx VALUES ('d_autormod', pg_temp.decidir_pub(v_pub_autormod, v_mod1, 'RECHAZAR'));
    INSERT INTO ctx VALUES ('d_rech2', pg_temp.decidir_pub(v_rech2, v_mod1, 'RECHAZAR'));
    SET CONSTRAINTS ALL IMMEDIATE;
    SET CONSTRAINTS ALL DEFERRED;

    -- Decision antigua (20 dias): se inserta con su fecha.
    INSERT INTO public.moderacion_comunidad_auditoria (id_publicacion, id_moderador, accion, motivo, contenido_revisado, fecha_evento)
    VALUES (v_vieja, v_mod1, 'OCULTAR', 'Antigua', 'Texto', now() - interval '20 days') RETURNING id_auditoria INTO v_rech;
    UPDATE public.publicacion_comunidad SET oculta_por_moderacion = TRUE WHERE id_publicacion = v_vieja;
    INSERT INTO ctx VALUES ('d_vieja', v_rech);

    -- El autor elimina por su cuenta la rechazada.
    UPDATE public.publicacion_comunidad SET eliminada = TRUE, fecha_eliminacion = now(), eliminada_por = v_autor
     WHERE id_publicacion = v_autoelim;
END $$;

-- ---------- Apelar ----------
DO $$
DECLARE v_aprobar BIGINT;
BEGIN
    -- Una decision APROBAR no se apela.
    INSERT INTO public.publicacion_comunidad (tipo, id_autor, titulo, contenido, estado_moderacion)
    VALUES ('GENERAL', pg_temp.id('autor'), 'Aprobada', 'Texto', 'PENDIENTE') RETURNING id_publicacion INTO v_aprobar;
    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.apelacion_comunidad (id_auditoria, id_autor, motivo) VALUES (%s, %s, %L)',
      (SELECT pg_temp.decidir_pub(v_aprobar, pg_temp.id('mod1'), 'APROBAR')), pg_temp.id('autor'), 'No'),
      'apelar una decision APROBAR', 'Solo se apelan decisiones');

    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.apelacion_comunidad (id_auditoria, id_autor, motivo) VALUES (%s, %s, %L)',
      pg_temp.id('d_rech'), pg_temp.id('otro'), 'No es mia'), 'apelar la decision sobre contenido ajeno', 'Solo el autor del contenido');
    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.apelacion_comunidad (id_auditoria, id_autor, motivo) VALUES (%s, %s, %L)',
      pg_temp.id('d_vieja'), pg_temp.id('autor'), 'Tarde'), 'apelar fuera de plazo (20 dias)', 'plazo de 15 dias');
    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.apelacion_comunidad (id_auditoria, id_autor, motivo) VALUES (%s, %s, %L)',
      pg_temp.id('d_autoelim'), pg_temp.id('autor'), 'Ya la borre'), 'apelar contenido que el autor elimino', 'El autor elimino el contenido');
    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.apelacion_comunidad (id_auditoria, id_autor, motivo) VALUES (%s, %s, %L)',
      pg_temp.id('d_rech'), pg_temp.id('autor'), '   '), 'una apelacion sin motivo', 'chk_apelacion_comunidad_motivo');
    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.apelacion_comunidad (id_auditoria, id_autor, motivo, estado, id_moderador, respuesta) VALUES (%s, %s, %L, %L, %s, %L)',
      pg_temp.id('d_rech'), pg_temp.id('autor'), 'Ya resuelta', 'ACEPTADA', pg_temp.id('mod2'), 'Si'),
      'crear una apelacion ya resuelta', 'empieza en PENDIENTE y sin resolver');

    INSERT INTO public.apelacion_comunidad (id_auditoria, id_autor, motivo)
    VALUES (pg_temp.id('d_rech'), pg_temp.id('autor'), 'No insulte a nadie');
    PERFORM pg_temp.debe_fallar(format(
      'INSERT INTO public.apelacion_comunidad (id_auditoria, id_autor, motivo) VALUES (%s, %s, %L)',
      pg_temp.id('d_rech'), pg_temp.id('autor'), 'Otra vez'), 'una segunda apelacion de la misma decision', 'uk_apelacion_comunidad_auditoria');

    -- Una eliminacion por moderador si se apela.
    INSERT INTO public.apelacion_comunidad (id_auditoria, id_autor, motivo)
    VALUES (pg_temp.id('d_elim'), pg_temp.id('autor'), 'No era spam');
    INSERT INTO public.apelacion_comunidad (id_auditoria, id_autor, motivo)
    VALUES (pg_temp.id('d_oculta'), pg_temp.id('autor'), 'Era informacion correcta');
    INSERT INTO public.apelacion_comunidad (id_auditoria, id_autor, motivo)
    VALUES (pg_temp.id('d_autormod'), pg_temp.id('autormod'), 'Mi propia publicacion');
    INSERT INTO public.apelacion_comunidad (id_auditoria, id_autor, motivo)
    VALUES (pg_temp.id('d_rech2'), pg_temp.id('autor'), 'Tampoco insulte');
END $$;

-- ---------- Resolver ----------
DO $$
DECLARE v_ap BIGINT := (SELECT id_apelacion FROM public.apelacion_comunidad WHERE id_auditoria = pg_temp.id('d_rech'));
BEGIN
    PERFORM pg_temp.debe_fallar(format(
      'UPDATE public.apelacion_comunidad SET estado = %L, id_moderador = %s, respuesta = %L WHERE id_apelacion = %s',
      'ACEPTADA', pg_temp.id('autor'), 'Me la acepto', v_ap), 'que el autor (sin rol) resuelva su apelacion', 'rol activo de moderacion');
    PERFORM pg_temp.debe_fallar(format(
      'UPDATE public.apelacion_comunidad SET estado = %L, id_moderador = %s, respuesta = %L WHERE id_apelacion = %s',
      'ACEPTADA', pg_temp.id('autormod'),  'Me la acepto',
      (SELECT id_apelacion FROM public.apelacion_comunidad WHERE id_auditoria = pg_temp.id('d_autormod'))),
      'que un autor moderador resuelva su propia apelacion', 'Conflicto de interes');

    -- RECHAZADA -> PUBLICADA con un UPDATE directo (sin APROBAR): rama diferida.
    PERFORM pg_temp.debe_fallar(format('UPDATE public.publicacion_comunidad SET estado_moderacion = %L WHERE id_publicacion = %s',
      'PUBLICADA', pg_temp.id('libre')), 'publicar una RECHAZADA con un UPDATE directo', 'exige aceptar su apelacion');

    -- Aceptar la apelacion y publicar SIN auditar APROBAR no se permite.
    PERFORM pg_temp.debe_fallar(format(
      'DO $d$ BEGIN UPDATE public.apelacion_comunidad SET estado = %L, id_moderador = %s, respuesta = %L WHERE id_auditoria = %s; '
      || 'UPDATE public.publicacion_comunidad SET estado_moderacion = %L WHERE id_publicacion = %s; END $d$',
      'ACEPTADA', pg_temp.id('mod2'), 'Si', pg_temp.id('d_rech2'), 'PUBLICADA', pg_temp.id('rech2')),
      'publicar con la apelacion aceptada sin auditar APROBAR', 'auditar APROBAR');

    -- Una apelacion RECHAZADA no permite aprobar.
    UPDATE public.apelacion_comunidad SET estado = 'RECHAZADA', id_moderador = pg_temp.id('mod2'), respuesta = 'Se mantiene'
     WHERE id_auditoria = pg_temp.id('d_rech2');
    PERFORM pg_temp.debe_fallar(format(
      'DO $d$ BEGIN INSERT INTO public.moderacion_comunidad_auditoria (id_publicacion, id_moderador, accion, motivo, contenido_revisado) VALUES (%s, %s, %L, %L, %L); '
      || 'UPDATE public.publicacion_comunidad SET estado_moderacion = %L WHERE id_publicacion = %s; END $d$',
      pg_temp.id('rech2'), pg_temp.id('mod2'), 'APROBAR', 'Apelacion rechazada', 'Texto', 'PUBLICADA', pg_temp.id('rech2')),
      'aprobar con la apelacion RECHAZADA', 'APROBAR no coincide');
    PERFORM pg_temp.debe_fallar(format(
      'UPDATE public.apelacion_comunidad SET estado = %L, id_moderador = %s, respuesta = %L WHERE id_apelacion = %s',
      'RECHAZADA', pg_temp.id('mod1'), 'Mantengo', v_ap), 'que el moderador de la decision resuelva la apelacion', 'Conflicto de interes');
    PERFORM pg_temp.debe_fallar(format(
      'UPDATE public.apelacion_comunidad SET estado = %L, id_moderador = %s, respuesta = %L WHERE id_apelacion = %s',
      'ACEPTADA', pg_temp.id('sin_rol'), 'Si', v_ap), 'que alguien sin rol resuelva', 'rol activo de moderacion');
    PERFORM pg_temp.debe_fallar(format(
      'UPDATE public.apelacion_comunidad SET estado = %L, id_moderador = %s, respuesta = NULL WHERE id_apelacion = %s',
      'RECHAZADA', pg_temp.id('mod2'), v_ap), 'rechazar sin respuesta', 'chk_apelacion_comunidad_resolucion');
    PERFORM pg_temp.debe_fallar(format(
      'UPDATE public.apelacion_comunidad SET motivo = %L WHERE id_apelacion = %s', 'Otro motivo', v_ap),
      'cambiar el motivo de la apelacion', 'no cambian');
    PERFORM pg_temp.debe_fallar(format('DELETE FROM public.apelacion_comunidad WHERE id_apelacion = %s', v_ap),
      'borrar una apelacion', 'no se borran');

    -- APROBAR una RECHAZADA sin apelacion aceptada no se permite.
    PERFORM pg_temp.debe_fallar(format(
      'DO $d$ BEGIN INSERT INTO public.moderacion_comunidad_auditoria (id_publicacion, id_moderador, accion, motivo, contenido_revisado) VALUES (%s, %s, %L, %L, %L); '
      || 'UPDATE public.publicacion_comunidad SET estado_moderacion = %L WHERE id_publicacion = %s; END $d$',
      pg_temp.id('libre'), pg_temp.id('mod2'), 'APROBAR', 'Sin apelacion', 'Texto', 'PUBLICADA', pg_temp.id('libre')),
      'aprobar una RECHAZADA sin apelacion aceptada', 'APROBAR no coincide');

    -- Aceptar la apelacion de un rechazo y publicar en la misma transaccion.
    UPDATE public.apelacion_comunidad SET estado = 'ACEPTADA', id_moderador = pg_temp.id('mod2'), respuesta = 'Tiene razon'
     WHERE id_apelacion = v_ap;
    IF (SELECT id_transaccion_resolucion FROM public.apelacion_comunidad WHERE id_apelacion = v_ap) IS DISTINCT FROM txid_current() THEN
        RAISE EXCEPTION 'FALLO: no se registro la transaccion de la resolucion';
    END IF;
    INSERT INTO public.moderacion_comunidad_auditoria (id_publicacion, id_moderador, accion, motivo, contenido_revisado)
    VALUES (pg_temp.id('rech'), pg_temp.id('mod2'), 'APROBAR', 'Apelacion aceptada', 'Texto');
    UPDATE public.publicacion_comunidad SET estado_moderacion = 'PUBLICADA' WHERE id_publicacion = pg_temp.id('rech');
    SET CONSTRAINTS ALL IMMEDIATE;
    SET CONSTRAINTS ALL DEFERRED;

    -- La apelacion aceptada de 'rech' no permite aprobar otro contenido rechazado.
    PERFORM pg_temp.debe_fallar(format(
      'DO $d$ BEGIN INSERT INTO public.moderacion_comunidad_auditoria (id_publicacion, id_moderador, accion, motivo, contenido_revisado) VALUES (%s, %s, %L, %L, %L); '
      || 'UPDATE public.publicacion_comunidad SET estado_moderacion = %L WHERE id_publicacion = %s; END $d$',
      pg_temp.id('libre'), pg_temp.id('mod2'), 'APROBAR', 'Apelacion de otro contenido', 'Texto', 'PUBLICADA', pg_temp.id('libre')),
      'aprobar un contenido con la apelacion aceptada de otro', 'APROBAR no coincide');

    PERFORM pg_temp.debe_fallar(format(
      'UPDATE public.apelacion_comunidad SET estado = %L, id_moderador = %s, respuesta = %L WHERE id_apelacion = %s',
      'RECHAZADA', pg_temp.id('mod2'), 'Cambio de opinion', v_ap), 'resolver dos veces una apelacion', 'ya esta resuelta');

    -- Aceptar un ocultamiento: se restaura con su auditoria.
    UPDATE public.apelacion_comunidad SET estado = 'ACEPTADA', id_moderador = pg_temp.id('mod2'), respuesta = 'Restauro'
     WHERE id_auditoria = pg_temp.id('d_oculta');
    INSERT INTO public.moderacion_comunidad_auditoria (id_publicacion, id_moderador, accion, motivo, contenido_revisado)
    VALUES (pg_temp.id('oculta'), pg_temp.id('mod2'), 'RESTAURAR', 'Apelacion aceptada', 'Texto');
    UPDATE public.publicacion_comunidad SET oculta_por_moderacion = FALSE WHERE id_publicacion = pg_temp.id('oculta');

    -- Aceptar una eliminacion: anula la falta, pero el contenido sigue eliminado.
    UPDATE public.apelacion_comunidad SET estado = 'ACEPTADA', id_moderador = pg_temp.id('mod2'), respuesta = 'Se anula la falta'
     WHERE id_auditoria = pg_temp.id('d_elim');
    PERFORM pg_temp.debe_fallar(format(
      'UPDATE public.publicacion_comunidad SET eliminada = FALSE, fecha_eliminacion = NULL, eliminada_por = NULL WHERE id_publicacion = %s',
      pg_temp.id('elim')), 'deshacer una eliminacion aunque la apelacion se acepte', 'no se puede restaurar');
    SET CONSTRAINTS ALL IMMEDIATE;
    SET CONSTRAINTS ALL DEFERRED;
END $$;

-- ---------- Regresion de la 030 ----------
DO $$
DECLARE v_pub BIGINT;
BEGIN
    INSERT INTO public.publicacion_comunidad (tipo, id_autor, titulo, contenido)
    VALUES ('GENERAL', pg_temp.id('autor'), 'Publicada normal', 'Texto') RETURNING id_publicacion INTO v_pub;
    PERFORM pg_temp.debe_fallar(format('UPDATE public.publicacion_comunidad SET estado_moderacion = %L WHERE id_publicacion = %s',
      'PENDIENTE', v_pub), 'volver a PENDIENTE sin edicion (030)', 'solo ocurre al editar');
    PERFORM pg_temp.debe_fallar(format('UPDATE public.publicacion_comunidad SET estado_moderacion = %L WHERE id_publicacion = %s',
      'RECHAZADA', v_pub), 'pasar de PUBLICADA a RECHAZADA sin revision (030)', 'PUBLICADA -> RECHAZADA');
END $$;

\echo 'OK: todas las verificaciones de la 031 pasaron'
ROLLBACK;
