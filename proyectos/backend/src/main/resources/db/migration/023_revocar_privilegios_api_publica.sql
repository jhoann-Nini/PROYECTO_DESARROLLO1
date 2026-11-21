-- ============================================================
-- MIGRACION 023: REVOCAR PRIVILEGIOS DE LA API PUBLICA DE SUPABASE
-- Fase 5 de la auditoria (hallazgo H-14)
-- ============================================================
-- Contexto (verificado el 2026-11-21 con consultas de solo lectura):
--   * Las 20 tablas de public tienen RLS activado y ninguna politica: la API
--     publica de Supabase (PostgREST, roles anon y authenticated) no puede
--     leer ni escribir filas. Es intencional: el frontend usa Supabase solo
--     para autenticacion y el backend se conecta como postgres, dueno de las
--     tablas, al que RLS no aplica.
--   * Aun asi, anon y authenticated tenian TODOS los privilegios sobre las
--     tablas (incluido TRUNCATE, que RLS no frena), las secuencias y las
--     funciones, y PUBLIC podia ejecutar todas las funciones. Los privilegios
--     por defecto de public los volvian a otorgar en cada objeto nuevo.
--
-- Cambios (defensa en profundidad; no cambia el funcionamiento):
--   1. REVOKE ALL en tablas y secuencias de public para anon y authenticated.
--   2. REVOKE EXECUTE en funciones de public para anon, authenticated y PUBLIC.
--      Los triggers siguen funcionando: PostgreSQL comprueba EXECUTE al crear
--      el trigger, no al dispararlo, y el backend es el dueno.
--   3. Privilegios por defecto de postgres: las tablas, secuencias y funciones
--      nuevas de public ya no se otorgan a anon ni authenticated, y las
--      funciones nuevas que cree postgres ya no son ejecutables por PUBLIC
--      (esta ultima regla es global porque PostgreSQL no permite quitarla por
--      esquema).
--   RLS sigue activado en todas las tablas. service_role no se toca.
--
-- Limitacion: los privilegios por defecto creados por supabase_admin no se
-- pueden cambiar con el rol de la aplicacion. Solo afectan a objetos que cree
-- supabase_admin (el panel de Supabase); las migraciones del proyecto las
-- ejecuta postgres.
--
-- Reversion: GRANT ... TO anon, authenticated sobre los objetos necesarios.
--
-- Verificacion: proyectos/docs/sql/tests/023_verificacion_privilegios.sql
-- ============================================================

BEGIN;

-- 1. Tablas y secuencias.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

-- 2. Funciones.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;

-- 3. Objetos que se creen despues con el rol postgres.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;
-- EXECUTE para PUBLIC es un privilegio por defecto global: los de un esquema
-- solo pueden sumar permisos, no quitarlo. Por eso esta revocacion es global
-- para las funciones que cree postgres (en la practica, solo en public).
ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

INSERT INTO public.schema_version (version, descripcion)
VALUES (
  '023_revocar_privilegios_api_publica',
  'Revoca a anon, authenticated y PUBLIC los privilegios sobre tablas, secuencias y funciones de public; RLS sigue activado'
)
ON CONFLICT (version) DO NOTHING;

COMMIT;
