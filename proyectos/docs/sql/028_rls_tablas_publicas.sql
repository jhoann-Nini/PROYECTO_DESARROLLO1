-- ============================================================
-- MIGRACION 028: RLS EN TODAS LAS TABLAS DE PUBLIC
-- Comunidad, fase 0 (decision P5 de la especificacion de la comunidad)
-- ============================================================
-- Problema:
--   En produccion, las 23 tablas de public ya tienen RLS habilitado sin
--   politicas (verificado el 24 de noviembre de 2026 sobre el esquema
--   volcado con pg_dump), pero las migraciones del repositorio solo lo
--   activan en reporte_oferta (018), reporte_oferta_historial (021) y
--   auditoria_usuario_estado (024). Una base creada con el esquema base mas
--   las migraciones del repositorio quedaria menos protegida que produccion.
--
-- Cambios:
--   1. ENABLE ROW LEVEL SECURITY en las 23 tablas existentes de public,
--      nombradas una por una. Es idempotente: en produccion no cambia nada.
--   2. No se crean politicas: el backend se conecta como postgres (salta
--      RLS) y el frontend solo usa Supabase Auth. Sin politicas, la API
--      publica de Supabase no puede leer ni escribir (criterio de la 023).
--
-- No cambia columnas ni entidades: el backend (ddl-auto=validate) funciona
-- con o sin esta migracion.
--
-- Antes de ejecutar en Supabase:
--   1. Aplicarla en horario de poco trafico: ENABLE ROW LEVEL SECURITY toma
--      un bloqueo ACCESS EXCLUSIVE en cada tabla, aunque RLS ya este activo.
--      Con lock_timeout de 5 s, si una tabla esta ocupada la migracion falla
--      limpia (no deja nada a medias) y basta con reintentarla.
--   2. Comprobar que la consulta de verificacion de RLS (relrowsecurity en
--      pg_class) sigue mostrando las 23 tablas con RLS activo.
--   3. Al final, si alguna tabla de public queda sin RLS (por ejemplo, una
--      creada a mano que no esta en la lista), la migracion aborta.
--
-- Requisitos previos: 027 aplicada.
-- Verificacion: docs/sql/tests/028_verificacion_rls.sql
-- ============================================================

BEGIN;

SET LOCAL lock_timeout = '5s';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.schema_version WHERE version = '027_terminos_moderacion'
    ) THEN
        RAISE EXCEPTION 'Preflight fallido: la migracion 027 debe estar aplicada antes de 028.';
    END IF;
END $$;

ALTER TABLE public.apelacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_usuario_establecimiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_usuario_estado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_usuario_rol ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.establecimiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marca ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.producto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.producto_establecimiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reporte_oferta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reporte_oferta_historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reporte_resena ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reporte_resena_decision_auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reporte_resena_historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resena ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resena_moderacion_auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rol ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schema_version ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.termino_moderacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuario_establecimiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuario_rol ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.valoracion ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    v_tablas TEXT;
BEGIN
    SELECT string_agg(c.relname, ', ' ORDER BY c.relname) INTO v_tablas
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND NOT c.relrowsecurity;
    IF v_tablas IS NOT NULL THEN
        RAISE EXCEPTION 'Tablas de public sin RLS tras la 028 (agregarlas a la lista): %', v_tablas;
    END IF;
END $$;

INSERT INTO public.schema_version (version, descripcion)
VALUES (
  '028_rls_tablas_publicas',
  'RLS sin politicas en todas las tablas de public, igual que en produccion'
)
ON CONFLICT (version) DO NOTHING;

COMMIT;
