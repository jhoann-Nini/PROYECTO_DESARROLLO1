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

## Revisión de fuentes comerciales e imágenes (16 de noviembre de 2026)

Esta revisión es una fotografía de resultados públicos consultados en la fecha indicada. No es un feed de inventario ni una garantía de que el precio siga vigente.

### Referencias comerciales encontradas en Colombia

| Producto / variante | Fuente consultada | Precio publicado | Condición y observación |
|---|---|---:|---|
| Samsung Galaxy S24 Ultra 512 GB | [Samsung Colombia](https://www.samsung.com/co/smartphones/galaxy-s24-ultra/buy/?modelCode=SM-S928BZTILTC) | $7.499.900 COP | Precio mostrado en el selector de 512 GB; verificar disponibilidad/color y precio final en checkout. |
| iPad Pro 11 M4 512 GB | [Tienda PC](https://www.tiendapc.com.co/LoNuevo) | $6.839.000 COP | Publicación indexada para 512 GB; confirmar stock, color y vigencia directamente con la tienda. |
| iPad Pro 11 M4 512 GB | [Mac Center](https://mac-center.com/products/ipad-pro-de-11-pulgadas-m4-mvvc3cl-a) | $7.169.000 COP | La página consultada indicaba agotado. No presentar como oferta disponible. |
| ThinkPad E14 Gen 5 Intel i5-1335U, 16/512 | [PCWare](https://www.pcware.com.co/lenovo-thinkpad-e14-gen-5-intel-core-i5-1335u-4-6ghz-ram-16gb-ssd-512gb-intel-iris-xe-graphics-14-pulgadas-ips-wuxga-1920-1200-windows-11-pro-21jl000llm) | $5.299.900 COP | La publicación indicaba sobre pedido y precio excluido de IVA. No comparar directamente con precios finales con impuestos. |
| ThinkPad E14 Gen 5 Intel i7-1355U, 16/512 | [Castor Data](https://www.castordata.com.co/shop/computacion-computadores-portatiles-1046/21jl002alm-portatil-lenovo-thinkpad-e14-gen-5-intel-core-i7-1355u-ram-16gb-ssd-512gb-w11-pro-negro-4427) | $4.697.750 COP | Configuración distinta (i7); la página muestra precio promocional. Confirmar inventario y precio final. |
| MacBook Pro 16 M3 Max, 36 GB/1 TB | [Mac Center](https://mac-center.com/products/macbook-pro-de-16-pulgadas-m3-max-mrw33e-a) | $18.629.000 COP | Configuración y SKU publicados; verificar stock. |
| MacBook Pro 16 M3 Max, 36 GB/1 TB | [Colombian Mac Store](https://www.colombianmacstore.com.co/comprar-mac-usado/computador-apple-portatil/macbook-pro-16-pulgadas/laptop-macbook-pro-m3-max-16.html) | $11.499.900 COP | Publicación de equipo usado en condición "como nuevo"; no mezclar con producto nuevo. |
| Sony WH-1000XM5 | [Sony Colombia](https://www.sony.com.co/headphones/wireless) | $2.249.896 COP | Precio mostrado para color Smoky Pink; confirmar color, stock y precio final. |
| Nothing Ear (2) | [Exclusive JJ](https://www.exclusivejj.com/tienda/accesorios/1159-nothing-ear-2.html) | $599.990 COP | Publicación por encargo; confirmar plazo, existencia y garantía. |
| Nothing Phone (2a) Special Edition | [Nothing — ficha oficial](https://checkout.nothing.tech/pages/phone-2a) | Sin oferta colombiana verificada | La ficha confirma la edición, pero no se encontró oferta local verificable en esta revisión. La tienda colombiana localizada corresponde al Phone (2a) regular, no a la Special Edition. |
| OnePlus Pad 2 | [OnePlus — ficha oficial](https://www.oneplus.com/us/oneplus-pad-2) | Sin oferta colombiana verificada | Se confirmó el modelo en el fabricante, pero no se localizó una oferta colombiana suficientemente respaldada en esta revisión. |

**Regla para el catálogo:** no guardar un precio como atributo fijo del producto canónico. Cada oferta debe ser un registro separado con vendedor, URL, variante/SKU, moneda, precio, condición (nuevo/usado/reacondicionado), disponibilidad, fecha y hora de consulta, e impuestos/envío cuando se conozcan. Si no hay fuente o stock verificable, el estado debe ser "no verificado" y no "disponible".

### Imágenes y derechos de uso

La revisión no autoriza copiar imágenes de páginas oficiales ni de tiendas:

- [Apple — directrices de propiedad intelectual](https://www.apple.com/legal/intellectual-property/guidelinesfor3rdparties.html) y [términos del sitio](https://images.apple.com/legal/internet-services/terms/site.html): las fotografías de Apple están protegidas; para fotografías propiedad de Apple o licenciadas por Apple se requiere permiso expreso, salvo activos entregados para programas autorizados con sus reglas.
- [OnePlus — política de propiedad intelectual](https://www.oneplus.com/global/legal/copyright): el permiso general descrito para materiales del sitio es personal y no comercial; el uso distinto requiere consentimiento previo por escrito.
- [Samsung — términos de Newsroom](https://news.samsung.com/global/terms): los materiales se limitan a uso personal, informativo y no comercial salvo autorización aplicable. No se debe asumir que una imagen de producto puede reutilizarse comercialmente.

Por tanto, la política de implementación sigue siendo:

1. Mantener las URLs heredadas solo como referencias pendientes; no declararlas autorizadas.
2. Preferir imágenes propias tomadas por el equipo o activos con licencia comercial documentada.
3. Para assets del fabricante, solicitar permiso escrito o usar un portal/feed de distribuidor que conceda expresamente derechos de merchandising.
4. Guardar en cada imagen: URL/archivo, autor o proveedor, licencia, alcance de uso, atribución requerida, fecha de obtención y evidencia del permiso.
5. No descargar, copiar ni alojar imágenes oficiales por scraping para producción.

### Estado tras la revisión

- Los ocho modelos conservan su identidad canónica y referencias originales.
- Se encontraron referencias comerciales colombianas para seis productos; para Nothing Phone (2a) Special Edition y OnePlus Pad 2 no se confirmó oferta local.
- Las referencias de precio son heterogéneas y algunas tienen restricciones de stock, condición o IVA. No deben convertirse en precio "actual" del catálogo sin revalidación.
- No se ha validado permiso de reutilización para ninguna imagen heredada.
- No se modificó código, backend, SQL ni Supabase en esta revisión; el estado `estadoVerificacion` continúa en `pendiente`.
