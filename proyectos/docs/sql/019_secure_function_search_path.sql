-- ============================================================================
-- MIGRACION 019: FIJAR SEARCH_PATH DE FUNCIONES PUBLICAS
-- Seguridad: evita resolucion de objetos mediante esquemas no confiables.
--
-- Las referencias a tablas y funciones propias dentro de estas funciones
-- estan calificadas explicitamente con el esquema public. Las funciones
-- integradas se resuelven desde pg_catalog.
--
-- Esta migracion no cambia la logica de negocio ni los permisos de ejecucion.
-- ============================================================================
BEGIN;

ALTER FUNCTION public.fn_actualizar_fecha_reporte()
  SET search_path = pg_catalog;

ALTER FUNCTION public.fn_validar_no_autoreporte()
  SET search_path = pg_catalog;

ALTER FUNCTION public.fn_recalcular_ocultamiento_resena()
  SET search_path = pg_catalog;

ALTER FUNCTION public.fn_proteger_inmutabilidad_historial()
  SET search_path = pg_catalog;

ALTER FUNCTION public.fn_proteger_truncate_historial()
  SET search_path = pg_catalog;

ALTER FUNCTION public.fn_proteger_inmutabilidad_reporte()
  SET search_path = pg_catalog;

ALTER FUNCTION public.fn_proteger_rol_administrador()
  SET search_path = pg_catalog;

ALTER FUNCTION public.fn_validar_historial_roles()
  SET search_path = pg_catalog;

ALTER FUNCTION public.fn_proteger_inmutabilidad_reporte_decision_auditoria()
  SET search_path = pg_catalog;

ALTER FUNCTION public.fn_proteger_truncate_reporte_decision_auditoria()
  SET search_path = pg_catalog;

ALTER FUNCTION public.fn_proteger_inmutabilidad_resena_moderacion_auditoria()
  SET search_path = pg_catalog;

ALTER FUNCTION public.fn_proteger_truncate_resena_moderacion_auditoria()
  SET search_path = pg_catalog;

ALTER FUNCTION public.fn_usuario_tiene_rol_activo(BIGINT, TEXT[])
  SET search_path = pg_catalog;

ALTER FUNCTION public.fn_validar_transicion_moderacion()
  SET search_path = pg_catalog;

ALTER FUNCTION public.fn_verificar_correspondencia_reasignacion()
  SET search_path = pg_catalog;

ALTER FUNCTION public.fn_validar_insert_reporte_decision_auditoria()
  SET search_path = pg_catalog;

ALTER FUNCTION public.fn_validar_insert_resena_moderacion_auditoria()
  SET search_path = pg_catalog;

ALTER FUNCTION public.fn_exigir_auditoria_transicion_reporte()
  SET search_path = pg_catalog;

ALTER FUNCTION public.fn_exigir_estado_final_evento_reporte()
  SET search_path = pg_catalog;

ALTER FUNCTION public.fn_exigir_auditoria_ocultamiento_resena()
  SET search_path = pg_catalog;

ALTER FUNCTION public.fn_exigir_estado_final_evento_resena()
  SET search_path = pg_catalog;

INSERT INTO public.schema_version (version, descripcion)
VALUES (
  '019_secure_function_search_path',
  'Fija search_path a pg_catalog en 21 funciones publicas para evitar resolucion insegura de objetos'
)
ON CONFLICT (version) DO NOTHING;

COMMIT;
