BEGIN;

-- ============================================================================
-- MIGRACION 014: PRECIOS DE REFERENCIA CON FUENTE COMERCIAL
--
-- Guarda dos precios observados en Colombia el 19/11/2026.
-- Solo actualiza registros con ID + nombre exactos y precio aún NULL.
-- No representa inventario garantizado ni una oferta permanente.
-- ============================================================================

UPDATE public.producto AS p
SET precio_referencia = v.precio
FROM (VALUES
  (74::BIGINT, 'Sony WH-1000XM5', 2249896::NUMERIC),
  (85::BIGINT, 'Nothing Ear (2)', 599990::NUMERIC)
) AS v(id_producto, nombre, precio)
WHERE p.id_producto = v.id_producto
  AND p.nombre = v.nombre
  AND p.precio_referencia IS NULL;

INSERT INTO public.schema_version (version, descripcion)
VALUES (
  '014_precios_referencia_auriculares',
  'Registra precios de referencia con fuentes comerciales colombianas para Sony WH-1000XM5 y Nothing Ear (2)'
)
ON CONFLICT (version) DO NOTHING;

COMMIT;
