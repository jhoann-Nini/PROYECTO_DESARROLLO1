-- Consultas de SOLO LECTURA para auditar el esquema de TecReview.
-- Enviar de una en una con execute_sql, solo con autorización de la sesión.
-- Ninguna modifica datos ni estructura. No añadir consultas que escriban.

-- 1. Migraciones registradas
SELECT version, descripcion, aplicado_en
FROM public.schema_version
ORDER BY version;

-- 2. Columnas de una tabla (sustituir el nombre)
SELECT column_name, data_type, character_maximum_length, numeric_precision, numeric_scale,
       is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'reporte_oferta'
ORDER BY ordinal_position;

-- 3. Restricciones (PK, FK, UNIQUE, CHECK) de una tabla
SELECT con.conname, con.contype, pg_get_constraintdef(con.oid) AS definicion
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public' AND rel.relname = 'reporte_oferta';

-- 4. Índices de una tabla
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'reporte_oferta';

-- 5. Triggers del esquema public
SELECT event_object_table AS tabla, trigger_name, action_timing, event_manipulation,
       action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY tabla, trigger_name;

-- 6. Funciones y su search_path
SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS argumentos, p.proconfig
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
ORDER BY p.proname;

-- 7. Estado de RLS por tabla
SELECT c.relname AS tabla, c.relrowsecurity AS rls_activo, c.relforcerowsecurity AS rls_forzado
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY c.relname;

-- 8. Políticas RLS existentes
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
