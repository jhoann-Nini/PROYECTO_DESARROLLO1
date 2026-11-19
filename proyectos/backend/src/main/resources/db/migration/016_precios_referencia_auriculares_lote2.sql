BEGIN;

-- ============================================================================
-- MIGRACION 016: PRECIOS DE REFERENCIA PARA AURICULARES (LOTE 2)
--
-- Valores observados en comercios colombianos el 19/11/2026.
-- Solo completa precios NULL con coincidencia exacta de ID + nombre.
-- No garantiza disponibilidad ni conserva precios promocionales históricos.
-- ============================================================================

UPDATE public.producto AS p
SET precio_referencia = v.precio
FROM (VALUES
  (37::BIGINT, 'JBL Tune Buds', 299900::NUMERIC),
  (38::BIGINT, 'JBL Live Beam 3', 589900::NUMERIC),
  (39::BIGINT, 'JBL Tour Pro 3', 1324900::NUMERIC),
  (73::BIGINT, 'Sony WF-1000XM5', 1999900::NUMERIC),
  (76::BIGINT, 'Sony WH-CH720N', 349900::NUMERIC)
) AS v(id_producto, nombre, precio)
WHERE p.id_producto = v.id_producto
  AND p.nombre = v.nombre
  AND p.precio_referencia IS NULL;

INSERT INTO public.schema_version (version, descripcion)
VALUES (
  '016_precios_referencia_auriculares_lote2',
  'Registra cinco precios de referencia para auriculares con fuentes comerciales colombianas'
)
ON CONFLICT (version) DO NOTHING;

COMMIT;
