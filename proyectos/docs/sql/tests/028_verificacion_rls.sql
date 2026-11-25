-- Verificacion estructural PostgreSQL para la migracion 028 (RLS en las
-- tablas de public). Es de solo lectura: no modifica nada.
--
--   psql -v ON_ERROR_STOP=1 -f 028_verificacion_rls.sql
--
-- Falla con 'FALLO: ...' si alguna tabla de public no tiene RLS habilitado,
-- tiene politicas, o si anon o authenticated conservan cualquier privilegio
-- sobre tablas, vistas o secuencias de public.
--
-- Criterio del proyecto (023 y especificacion de la comunidad): el backend se
-- conecta como postgres y salta RLS; el frontend solo usa Supabase Auth. Por
-- eso RLS va habilitado SIN politicas (todo denegado para la API publica).
-- RLS no frena TRUNCATE ni REFERENCES: por eso tambien se revisan TODOS los
-- privilegios, no solo los de lectura y escritura.
--
-- En una base local de prueba hay que crear antes los roles de Supabase:
--   CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;

DO $checks$
DECLARE
    v_objeto RECORD;
    v_fallos TEXT := '';
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
       OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        RAISE EXCEPTION 'FALLO: faltan los roles anon o authenticated (en una base local, crearlos antes de verificar).';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.schema_version WHERE version = '028_rls_tablas_publicas'
    ) THEN
        v_fallos := v_fallos || E'\n - la migracion 028 no esta registrada en schema_version';
    END IF;

    -- RLS habilitado y sin politicas: tablas normales, particionadas y foraneas.
    FOR v_objeto IN
        SELECT c.oid, c.relname, c.relrowsecurity
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'f')
         ORDER BY c.relname
    LOOP
        IF NOT v_objeto.relrowsecurity THEN
            v_fallos := v_fallos || format(E'\n - %s sin RLS habilitado', v_objeto.relname);
        END IF;
        IF EXISTS (
            SELECT 1 FROM pg_policy p WHERE p.polrelid = v_objeto.oid
        ) THEN
            v_fallos := v_fallos || format(E'\n - %s tiene politicas (se esperaba ninguna)', v_objeto.relname);
        END IF;
    END LOOP;

    -- Ningun privilegio para la API publica en tablas, vistas y vistas materializadas.
    FOR v_objeto IN
        SELECT c.relname
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'f', 'v', 'm')
           AND (
             has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
             OR has_table_privilege('authenticated', c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
           )
         ORDER BY c.relname
    LOOP
        v_fallos := v_fallos || format(E'\n - %s concede privilegios a anon o authenticated', v_objeto.relname);
    END LOOP;

    -- Ni sobre secuencias.
    FOR v_objeto IN
        SELECT c.relname
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public' AND c.relkind = 'S'
           AND (
             has_sequence_privilege('anon', c.oid, 'USAGE,SELECT,UPDATE')
             OR has_sequence_privilege('authenticated', c.oid, 'USAGE,SELECT,UPDATE')
           )
         ORDER BY c.relname
    LOOP
        v_fallos := v_fallos || format(E'\n - la secuencia %s concede privilegios a anon o authenticated', v_objeto.relname);
    END LOOP;

    IF v_fallos <> '' THEN
        RAISE EXCEPTION 'FALLO:%', v_fallos;
    END IF;
END
$checks$;

\echo 'OK: todas las tablas de public tienen RLS sin politicas y la API publica no tiene privilegios'
