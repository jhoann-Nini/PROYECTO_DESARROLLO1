-- Verificacion de seguridad de la API publica de Supabase (migracion 023).
-- Ejecutar DESPUES de aplicar la 023. Es de solo lectura y falla con el
-- primer problema que encuentre.
--
-- Comprueba que:
--   1. la 023 esta registrada en schema_version;
--   2. todas las tablas de public tienen RLS activado;
--   3. ninguna tabla tiene politicas RLS (el backend usa postgres; la API
--      publica no debe poder leer ni escribir filas);
--   4. anon y authenticated no tienen privilegios sobre tablas ni secuencias;
--   5. anon y authenticated no pueden ejecutar funciones de public.

DO $checks$
DECLARE
    v_objeto TEXT;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.schema_version
        WHERE version = '023_revocar_privilegios_api_publica'
    ) THEN
        RAISE EXCEPTION 'FALLO: migracion 023 no registrada en schema_version.';
    END IF;

    SELECT c.relname INTO v_objeto
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity
    LIMIT 1;
    IF FOUND THEN
        RAISE EXCEPTION 'FALLO: la tabla public.% no tiene RLS activado.', v_objeto;
    END IF;

    SELECT tablename || '.' || policyname INTO v_objeto
    FROM pg_policies WHERE schemaname = 'public' LIMIT 1;
    IF FOUND THEN
        RAISE EXCEPTION 'FALLO: existe la politica RLS %; revisar si es intencional.', v_objeto;
    END IF;

    SELECT c.relname INTO v_objeto
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'v', 'm')
      AND (
        has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
        OR has_table_privilege('authenticated', c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      )
    LIMIT 1;
    IF FOUND THEN
        RAISE EXCEPTION 'FALLO: anon o authenticated conservan privilegios sobre la tabla public.%.', v_objeto;
    END IF;

    SELECT c.relname INTO v_objeto
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'S'
      AND (
        has_sequence_privilege('anon', c.oid, 'USAGE,SELECT,UPDATE')
        OR has_sequence_privilege('authenticated', c.oid, 'USAGE,SELECT,UPDATE')
      )
    LIMIT 1;
    IF FOUND THEN
        RAISE EXCEPTION 'FALLO: anon o authenticated conservan privilegios sobre la secuencia public.%.', v_objeto;
    END IF;

    SELECT p.proname INTO v_objeto
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND (has_function_privilege('anon', p.oid, 'EXECUTE')
           OR has_function_privilege('authenticated', p.oid, 'EXECUTE'))
    LIMIT 1;
    IF FOUND THEN
        RAISE EXCEPTION 'FALLO: anon o authenticated pueden ejecutar public.%.', v_objeto;
    END IF;

    RAISE NOTICE 'OK: RLS activo sin politicas y sin privilegios para anon/authenticated en public.';
END
$checks$;
