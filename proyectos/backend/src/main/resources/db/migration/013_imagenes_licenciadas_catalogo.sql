BEGIN;

-- ============================================================================
-- MIGRACION 013: IMAGENES CON LICENCIA PARA PRODUCTOS EXISTENTES
--
-- Vincula seis imagenes ya documentadas en:
-- frontend/src/data/atribucionImagenes.ts
-- No altera precios, nombres, categorias, variantes ni caracteristicas.
-- Solo completa imagen cuando el registro exacto aun no tiene una.
-- ============================================================================

UPDATE public.producto AS p
SET imagen = v.imagen
FROM (VALUES
  (1::BIGINT, 'Samsung Galaxy S24 Ultra', 'https://upload.wikimedia.org/wikipedia/commons/e/e7/SAMSUNG_Galaxy_S24_Ultra.jpg'),
  (7::BIGINT, 'Samsung Galaxy A55 5G', 'https://upload.wikimedia.org/wikipedia/commons/8/8b/Samsung_Galaxy_A55_5G_2024.jpg'),
  (56::BIGINT, 'Apple iPad Pro 11 pulgadas M4', 'https://upload.wikimedia.org/wikipedia/commons/8/87/About_iPad_Pro_11-inch_%28M4%29.jpg'),
  (69::BIGINT, 'OnePlus Pad 2', 'https://upload.wikimedia.org/wikipedia/commons/3/34/OnePlusPad2.jpg'),
  (74::BIGINT, 'Sony WH-1000XM5', 'https://thehelpfulbuyer.com/assets/products/xm5.jpg'),
  (85::BIGINT, 'Nothing Ear (2)', 'https://upload.wikimedia.org/wikipedia/commons/8/84/Nothing_ear2_%28cropped%29.jpg')
) AS v(id_producto, nombre, imagen)
WHERE p.id_producto = v.id_producto
  AND p.nombre = v.nombre
  AND p.imagen IS NULL;

INSERT INTO public.schema_version (version, descripcion)
VALUES (
  '013_imagenes_licenciadas_catalogo',
  'Asocia seis imagenes con procedencia y licencia documentadas a productos existentes'
)
ON CONFLICT (version) DO NOTHING;

COMMIT;
