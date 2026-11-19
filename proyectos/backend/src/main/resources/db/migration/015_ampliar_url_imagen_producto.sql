BEGIN;

-- ============================================================================
-- MIGRACION 015: AMPLIAR LONGITUD DE URL DE IMAGEN
--
-- La columna VARCHAR(255) no admite algunas URLs legítimas de Wikimedia
-- Commons, incluso cuando la imagen tiene licencia y atribución verificadas.
-- TEXT conserva compatibilidad con el contrato string del backend/frontend.
-- ============================================================================

ALTER TABLE public.producto
  ALTER COLUMN imagen TYPE TEXT;

UPDATE public.producto
SET imagen = 'https://upload.wikimedia.org/wikipedia/commons/e/e8/HK_%E4%B8%AD%E7%92%B0_Central_%E7%9A%87%E5%90%8E%E5%A4%A7%E9%81%93%E4%B8%AD_33_Queen%27s_Road_Central_shop_%E8%B1%90%E6%BE%A4%E9%9B%BB%E5%99%A8_Fortress_Store_%E6%89%8B%E6%A9%9F_smartphone_XiaoMi_14_Ultra_watch_May_2024_R12S_01.jpg'
WHERE id_producto = 3
  AND nombre = 'Xiaomi 14 Ultra'
  AND imagen IS NULL;

INSERT INTO public.schema_version (version, descripcion)
VALUES (
  '015_ampliar_url_imagen_producto',
  'Amplia producto.imagen a TEXT para admitir URLs largas de imágenes con licencia'
)
ON CONFLICT (version) DO NOTHING;

COMMIT;
