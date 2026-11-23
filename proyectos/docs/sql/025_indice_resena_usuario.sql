-- ============================================================
-- MIGRACION 025: INDICE DE RESENAS POR AUTOR
-- Caso 6 (moderacion inteligente), prioridad media: reincidencia
-- ============================================================
-- Problema:
--   La reincidencia cuenta las faltas de un autor uniendo
--   resena_moderacion_auditoria con resena por id_usuario. El unico indice
--   por usuario (uk_resena_usuario_producto_activa) es parcial: excluye las
--   resenas eliminadas, que tambien cuentan como falta.
--
-- Cambios:
--   1. Indice idx_resena_usuario sobre resena (id_usuario), sin filtro.
--
-- No cambia la estructura: el backend (ddl-auto=validate) funciona con o sin
-- esta migracion; solo hace mas rapida la consulta. Se puede aplicar antes o
-- despues de desplegar.
--
-- Requisitos previos: ninguno.
-- Antes de ejecutar en Supabase: la tabla resena es pequena; el indice se
-- crea en segundos y bloquea escrituras en resena mientras tanto.
-- ============================================================

BEGIN;

CREATE INDEX IF NOT EXISTS idx_resena_usuario
  ON public.resena (id_usuario);

INSERT INTO public.schema_version (version, descripcion)
VALUES (
  '025_indice_resena_usuario',
  'Indice de resenas por autor para calcular la reincidencia'
)
ON CONFLICT (version) DO NOTHING;

COMMIT;
