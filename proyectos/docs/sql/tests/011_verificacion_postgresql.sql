-- Verificacion estructural PostgreSQL para migracion 011.
-- Ejecutar DESPUES de aplicar 007-011 en una base de pruebas/staging.
-- Este script es de solo lectura y falla si falta una proteccion esperada.

DO $checks$
DECLARE
    v_def TEXT;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.schema_version
        WHERE version = '011_integridad_multirole_y_auditoria_moderacion'
    ) THEN
        RAISE EXCEPTION 'FALLO: migracion 011 no registrada en schema_version.';
    END IF;

    IF to_regprocedure('public.fn_usuario_tiene_rol_activo(bigint,text[])') IS NULL THEN
        RAISE EXCEPTION 'FALLO: falta fn_usuario_tiene_rol_activo(bigint,text[]).';
    END IF;

    SELECT pg_get_functiondef('public.fn_validar_historial_roles()'::regprocedure) INTO v_def;
    IF position('fn_usuario_tiene_rol_activo' IN v_def) = 0 THEN
        RAISE EXCEPTION 'FALLO: fn_validar_historial_roles no usa asignaciones multirrol activas.';
    END IF;

    SELECT pg_get_functiondef('public.fn_verificar_correspondencia_reasignacion()'::regprocedure) INTO v_def;
    IF position('fn_usuario_tiene_rol_activo' IN v_def) = 0 THEN
        RAISE EXCEPTION 'FALLO: fn_verificar_correspondencia_reasignacion no usa asignaciones multirrol activas.';
    END IF;

    SELECT pg_get_functiondef('public.fn_validar_transicion_moderacion()'::regprocedure) INTO v_def;
    IF position('fn_usuario_tiene_rol_activo' IN v_def) = 0 THEN
        RAISE EXCEPTION 'FALLO: fn_validar_transicion_moderacion no usa asignaciones multirrol activas.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public'
          AND table_name='reporte_resena_decision_auditoria'
          AND column_name='id_transaccion'
          AND is_nullable='NO'
    ) OR NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public'
          AND table_name='resena_moderacion_auditoria'
          AND column_name='id_transaccion'
          AND is_nullable='NO'
    ) THEN
        RAISE EXCEPTION 'FALLO: id_transaccion debe existir y ser NOT NULL en ambas auditorias.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname='trg_exigir_auditoria_transicion_reporte'
          AND tgrelid='public.reporte_resena'::regclass
          AND tgconstraint <> 0
          AND tgdeferrable
          AND tginitdeferred
    ) THEN
        RAISE EXCEPTION 'FALLO: falta constraint trigger diferido para transiciones de reportes.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname='trg_exigir_auditoria_ocultamiento_resena'
          AND tgrelid='public.resena'::regclass
          AND tgconstraint <> 0
          AND tgdeferrable
          AND tginitdeferred
    ) THEN
        RAISE EXCEPTION 'FALLO: falta constraint trigger diferido para ocultamiento manual.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname='trg_validar_insert_reporte_decision_auditoria'
          AND tgrelid='public.reporte_resena_decision_auditoria'::regclass
    ) OR NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname='trg_validar_insert_resena_moderacion_auditoria'
          AND tgrelid='public.resena_moderacion_auditoria'::regclass
    ) THEN
        RAISE EXCEPTION 'FALLO: faltan triggers de validacion de actor/conflicto de interes.';
    END IF;

    RAISE NOTICE 'OK: migracion 011, funciones multirrol y triggers diferidos de auditoria verificados.';
END
$checks$;
