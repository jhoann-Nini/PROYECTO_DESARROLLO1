# Catálogo canónico TecReview — piloto de ocho productos

## Alcance implementado en frontend

El piloto introduce una identidad canónica por modelo y conserva las referencias a los registros de origen existentes:

- `vendidos`: `DispositivosKimovil.id`
- `deseados`: `DispositivosKimovil.id`
- `ofertas`: `DispositivosKimovil.id`
- `mock`: `Producto.idProducto`

Los identificadores de origen no se reemplazan ni se interpretan como IDs de la API. El identificador canónico es una clave estable de dominio, por ejemplo `oneplus-pad-2`.

## Reglas de identidad

1. Las apariciones del mismo modelo en rankings, ofertas y mocks se agrupan bajo una identidad canónica.
2. Las variantes comerciales (RAM, almacenamiento, color o mercado) se mantienen separadas.
3. No se fusionan modelos de una misma familia por similitud de nombre. Por ejemplo, Nothing Phone (2a) Plus y Nothing Phone (2a) Special Edition no son el mismo registro canónico.
4. Los datos de precio, ranking, puntuación y especificaciones permanecen en su registro de origen; el catálogo canónico no los duplica.
5. Una referencia sin capacidad/color explícitos permanece sin variante asignada.

## Imágenes

Las URLs actuales se conservan como referencias heredadas para no romper la presentación existente. No se consideran imágenes verificadas del dispositivo. La metadata deja licencia y atribución como nulas hasta que se confirme la imagen exacta, su autoría y sus condiciones de uso.

## Piloto

| ID canónico | Modelo | Referencias |
|---|---|---|
| `nothing-phone-2a-special-edition` | Nothing Phone (2a) Special Edition | mock:1 |
| `samsung-galaxy-s24-ultra` | Samsung Galaxy S24 Ultra | deseados:202, ofertas:300 |
| `oneplus-pad-2` | OnePlus Pad 2 | vendidos:108, ofertas:303, mock:5 |
| `apple-ipad-pro-11-m4` | Apple iPad Pro 11 pulgadas M4 | deseados:208 |
| `lenovo-thinkpad-e14-gen-5` | Lenovo ThinkPad E14 Gen 5 | mock:6 |
| `apple-macbook-pro-16-m3-max` | Apple MacBook Pro 16 pulgadas M3 Max | deseados:209 |
| `nothing-ear-2` | Nothing Ear (2) | mock:3 |
| `sony-wh-1000xm5` | Sony WH-1000XM5 | vendidos:109 |

## Revisión futura de backend (no ejecutada)

Antes de persistir el catálogo en Spring Boot/PostgreSQL, conviene acordar:

- Tabla `producto_canonico`: UUID/clave estable, nombre normalizado, marca, categoría y estado de verificación.
- Tabla `producto_variante`: relación con el canónico, SKU/mercado/color/RAM/almacenamiento opcionales y restricciones de unicidad según el alcance comercial.
- Tabla `producto_referencia_origen`: sistema de origen, colección/ID legado, variante opcional y fecha de vinculación. Restricción única por sistema + colección + ID de origen.
- Tabla `producto_imagen`: URL, proveedor, atribución, licencia, variante opcional, fecha de consulta y estado de verificación.
- Relación desde productos transaccionales (reseñas, votos, favoritos y comparaciones) al ID persistente que se decida como identidad de producto. No cambiar los IDs usados hoy por reseñas o favoritos hasta diseñar una migración compatible.
- Endpoints de lectura para resolver identidad canónica y variantes; mantener temporalmente compatibilidad con `/api/productos/{id}`.
- Proceso de reconciliación de registros existentes, con reporte de colisiones y revisión humana antes de consolidar duplicados.

### Decisiones que requieren análisis antes de una migración

- Si las reseñas/favoritos pertenecen al modelo canónico o a una variante concreta.
- Cómo versionar las especificaciones cuando dos fuentes discrepan.
- Qué fuente prevalece para precio y disponibilidad (que son datos temporales, no atributos canónicos).
- Política de derechos de uso y atribución de imágenes.
- Estrategia de alias para IDs actuales y rutas públicas existentes.

Este documento es una propuesta de evolución; no crea tablas, endpoints ni altera Supabase.

## Validación externa de identidad (16 de noviembre de 2026)

Se contrastó la identidad comercial de los ocho modelos con documentación publicada por sus fabricantes. Esta comprobación valida la existencia del modelo/familia; no equivale a verificar precio, inventario, vendedor, autenticidad de una unidad ni derechos de uso de fotografías.

| Producto | Fuente oficial | Resultado y cautela |
|---|---|---|
| Nothing Phone (2a) Special Edition | [Nothing — Phone (2a) Special Edition](https://checkout.nothing.tech/pages/phone-2a) | El fabricante identifica expresamente la edición especial. La capacidad 12 GB/256 GB debe conservarse como variante de la fuente local hasta verificarla contra SKU/mercado. |
| Samsung Galaxy S24 Ultra | [Samsung — Galaxy S24 series specifications](https://news.samsung.com/us/enter-new-era-of-mobile-ai-samsung-galaxy-s24-series//) | Modelo confirmado. Samsung enumera capacidades de 256 GB, 512 GB y 1 TB; la referencia local de 512 GB es compatible con la oferta publicada, pero precio e inventario no quedan validados. |
| OnePlus Pad 2 | [OnePlus — especificaciones](https://www.oneplus.com/us/oneplus-pad-2/specs) | Modelo confirmado. La ficha estadounidense especifica 12 GB RAM y 256 GB; coincide con la variante piloto. |
| Apple iPad Pro 11 pulgadas M4 | [Apple — especificaciones técnicas](https://support.apple.com/en-am/119892) | Modelo y capacidades 256/512 GB confirmados. La ficha también documenta las opciones de capacidad; mantener la variante local 8 GB/512 GB como dato de origen, pendiente de cotejo por SKU y conectividad. |
| Lenovo ThinkPad E14 Gen 5 | [Lenovo — E14 Gen 5 AMD](https://www.lenovo.com/us/en/p/LEN101T0068) y [PSREF modelo AMD](https://psref.lenovo.com/Detail/ThinkPad/ThinkPad_E14_Gen_5_AMD?M=21JR000AIX) | Familia confirmada, pero hay configuraciones Intel y AMD y distintas combinaciones por mercado. La ficha PSREF consultada aparece como retirada. No se debe inferir el procesador ni dar por verificada la combinación local 16 GB/512 GB sin número de modelo/MTM. |
| Apple MacBook Pro 16 pulgadas M3 Max | [Apple — especificaciones técnicas](https://support.apple.com/es-la/117737) | Modelo confirmado (noviembre de 2023). Apple documenta M3 Max y opciones de memoria/almacenamiento; la combinación local 36 GB/1 TB no debe marcarse como confirmada sin comprobar el SKU exacto, ya que las configuraciones dependen del chip y del mercado. |
| Nothing Ear (2) | [Nothing — Ear (2)](https://checkout-us.nothing.tech/products/ear-2) | Modelo confirmado y ficha oficial de características disponible. El color Transparent White se conserva como variante de origen; no se validó disponibilidad comercial actual. |
| Sony WH-1000XM5 | [Sony — especificaciones](https://www.sony.com/electronics/support/wireless-headphones-bluetooth-headphones/wh-1000xm5/specifications) | Modelo confirmado mediante ficha oficial de soporte. La fuente consultada respalda especificaciones, no disponibilidad ni precio actual. |

### Resultado de la validación

- **Identidad de modelo/familia:** los ocho productos tienen respaldo en fuentes oficiales.
- **Variantes:** Samsung Galaxy S24 Ultra 512 GB y OnePlus Pad 2 12/256 GB coinciden con opciones publicadas por sus fabricantes. Para ThinkPad E14 Gen 5 y MacBook Pro M3 Max se requiere identificar el SKU/MTM exacto antes de confirmar la configuración. En los demás casos se conserva la variante heredada sin elevarla automáticamente a dato verificado.
- **Precios, disponibilidad y vendedores:** no verificados; deben obtenerse de una fuente comercial por país y con fecha de consulta.
- **Imágenes:** siguen pendientes de verificación individual de procedencia, licencia y atribución. Una página oficial del producto no demuestra que la URL de imagen heredada esté autorizada para reutilización.
- **Estado técnico:** el campo `estadoVerificacion` del catálogo permanece en `pendiente`; esta revisión documental no cambia el estado de verificación de cada registro en código.

