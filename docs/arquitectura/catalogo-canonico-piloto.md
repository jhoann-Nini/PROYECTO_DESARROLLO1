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
| `samsung-galaxy-s24-ultra` | Samsung Galaxy S24 Ultra | deseados:202 (256 GB), ofertas:300 (512 GB) |
| `oneplus-pad-2` | OnePlus Pad 2 | vendidos:108, ofertas:303, mock:5 (12 GB/256 GB, UFS 3.1) |
| `apple-ipad-pro-11-m4` | Apple iPad Pro 11 pulgadas M4 | deseados:208 (16 GB/1 TB, pendiente de validar SKU) |
| `lenovo-thinkpad-e14-gen-5` | Lenovo ThinkPad E14 Gen 5 | mock:6 (SKU 21JK0005RI, i5-1335U, 16 GB/512 GB) |
| `apple-macbook-pro-16-m3-max` | Apple MacBook Pro 16 pulgadas M3 Max | deseados:209 (48 GB/1 TB, 16 CPU/40 GPU; pendiente de validar SKU) |
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
| Apple iPad Pro 11 pulgadas M4 | [Apple — especificaciones técnicas](https://support.apple.com/en-am/119892) | Modelo y opciones de capacidad confirmados. El registro local fue corregido a 16 GB/1 TB por PR #108; conservarlo como variante de origen pendiente de cotejo por SKU y conectividad. |
| Lenovo ThinkPad E14 Gen 5 | [Lenovo — E14 Gen 5 AMD](https://www.lenovo.com/us/en/p/LEN101T0068) y [PSREF modelo AMD](https://psref.lenovo.com/Detail/ThinkPad/ThinkPad_E14_Gen_5_AMD?M=21JR000AIX) | La familia tiene configuraciones Intel y AMD. El registro local ahora identifica SKU 21JK0005RI e Intel Core i5-1335U; la combinación exacta sigue pendiente de cotejo con PSREF/MTM oficial. |
| Apple MacBook Pro 16 pulgadas M3 Max | [Apple — especificaciones técnicas](https://support.apple.com/es-la/117737) | Modelo confirmado (noviembre de 2023). El registro local fue corregido a M3 Max de 16 CPU/40 GPU, 48 GB/1 TB; mantener la configuración pendiente de validar contra el SKU exacto y el mercado. |
| Nothing Ear (2) | [Nothing — Ear (2)](https://checkout-us.nothing.tech/products/ear-2) | Modelo confirmado y ficha oficial de características disponible. El color Transparent White se conserva como variante de origen; no se validó disponibilidad comercial actual. |
| Sony WH-1000XM5 | [Sony — especificaciones](https://www.sony.com/electronics/support/wireless-headphones-bluetooth-headphones/wh-1000xm5/specifications) | Modelo confirmado mediante ficha oficial de soporte. La fuente consultada respalda especificaciones, no disponibilidad ni precio actual. |

### Resultado de la validación

- **Identidad de modelo/familia:** los ocho productos tienen respaldo en fuentes oficiales.
- **Variantes:** Samsung Galaxy S24 Ultra 512 GB y OnePlus Pad 2 12/256 GB coinciden con opciones publicadas por sus fabricantes. Para ThinkPad E14 Gen 5 y MacBook Pro M3 Max se requiere identificar el SKU/MTM exacto antes de confirmar la configuración. En los demás casos se conserva la variante heredada sin elevarla automáticamente a dato verificado.
- **Precios, disponibilidad y vendedores:** no verificados; deben obtenerse de una fuente comercial por país y con fecha de consulta.
- **Imágenes:** siguen pendientes de verificación individual de procedencia, licencia y atribución. Una página oficial del producto no demuestra que la URL de imagen heredada esté autorizada para reutilización.
- **Estado del catálogo canónico:** el campo `estadoVerificacion` de sus registros permanece en `pendiente`. Es independiente de `estado_verificacion` en las fichas técnicas V2 y no debe interpretarse como el estado de estas fichas.



### Reconciliación de variantes tras PR #108

La revisión del catálogo canónico debe tomar como referencia las fichas corregidas en `mockProductos.ts`, sin convertir esos datos mock en información verificada por fabricante:

- Samsung Galaxy S24 Ultra: `deseados:202` corresponde a 256 GB y `ofertas:300` a 512 GB. Ambas referencias se asignan a variantes distintas; no se debe dejar la referencia deseada sin variante.
- OnePlus Pad 2: conservar 12 GB/256 GB y especificar UFS 3.1.
- iPad Pro 11 M4: el registro piloto corregido es 16 GB de memoria unificada/1 TB, no 8 GB/512 GB.
- ThinkPad E14 Gen 5: el registro piloto identifica SKU 21JK0005RI, Intel Core i5-1335U, 16 GB DDR4, 512 GB SSD NVMe y panel 14 pulgadas WUXGA de 45% NTSC. La coincidencia con una ficha oficial Lenovo aún debe validarse.
- MacBook Pro 16 M3 Max: el registro piloto corregido es 16 núcleos CPU/40 GPU, 48 GB de memoria unificada y 1 TB SSD; el SKU exacto sigue pendiente.

Las referencias comerciales históricas de iPad Pro 512 GB y MacBook Pro 36 GB no corresponden a las variantes actuales del piloto. La publicación PCWare citada para ThinkPad no demuestra que sea el SKU 21JK0005RI. No asociar estas ofertas con las variantes canónicas actuales ni mostrar sus precios como comparables. El estado `pendiente` mencionado aquí corresponde al catálogo canónico y a la validación de ofertas comerciales (SKU, mercado, condición e inventario); no describe el estado de las fichas técnicas V2, que se registra por separado.

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


## Estado vigente de las fichas técnicas V2 tras PR #112 (17 de noviembre de 2026)

La verificación de fuentes oficiales se incorporó en `proyectos/frontend/src/data/fichasTecnicasV2Piloto.ts` y quedó cubierta por pruebas en `fichasTecnicasV2Piloto.test.ts`. El estado de la ficha V2 no debe confundirse con el campo de verificación del catálogo canónico: son contratos distintos y no se sincronizan automáticamente.

| Ficha V2 | Estado vigente | Alcance de la verificación |
|---|---|---|
| Nothing Phone (2a) Special Edition | `verificado` | La fuente del fabricante y el anuncio de Nothing respaldan el modelo Special Edition y la configuración 12 GB/256 GB. |
| Samsung Galaxy S24 Ultra 256 GB | `verificado` | La ficha oficial respalda la variante de 256 GB. |
| Samsung Galaxy S24 Ultra 512 GB | `verificado` | La ficha oficial respalda la variante de 512 GB. |
| OnePlus Pad 2 12 GB/256 GB | `verificado` | La ficha estadounidense del fabricante respalda memoria, almacenamiento UFS 3.1 y especificaciones asociadas. |
| Apple iPad Pro 11 pulgadas M4 16 GB/1 TB | `verificado` | Las especificaciones oficiales respaldan la configuración técnica registrada. |
| Lenovo ThinkPad E14 Gen 5, MTM 21JK0005RI | `verificado` | La ficha PSREF asociada al MTM exacto respalda la configuración y el mercado Rumania (región EET). |
| Apple MacBook Pro 16 pulgadas M3 Max 48 GB/1 TB | `verificado` | Las especificaciones oficiales respaldan la configuración técnica registrada. |
| Nothing Ear (2) | `parcial` | El modelo y sus especificaciones están respaldados; no se encontró confirmación primaria expresa del acabado Transparent White. |
| Sony WH-1000XM5 | `verificado` | La ficha oficial de soporte respalda el modelo y las especificaciones registradas. |

**Importante:** `verificado` describe la evidencia técnica de la ficha V2; no garantiza precio vigente, inventario, vendedor autorizado, condición del producto, disponibilidad en Colombia ni licencia de las imágenes. Nothing Ear (2) permanece `parcial` hasta confirmar el acabado específico. El estado independiente del catálogo canónico continúa sujeto a sus propias reglas y no debe elevarse por inferencia.
- Esta revisión documental no modificó código, backend, SQL ni Supabase. El estado `estadoVerificacion` del catálogo canónico continúa en `pendiente`; no equivale al estado de verificación de las fichas V2.


## Estado vigente de las fichas técnicas V2 del piloto (16 de noviembre de 2026)

Las PR #110, #111 y #112 están integradas en `main`. La implementación de fichas técnicas V2 se encuentra en `proyectos/frontend/src/data/fichasTecnicasV2Piloto.ts`; su normalización y resolución se conectan desde `proyectos/frontend/src/data/normalizadorFicha.ts`, y las pruebas específicas están en `proyectos/frontend/src/data/fichasTecnicasV2Piloto.test.ts`.

El alcance del piloto es de **ocho modelos y nueve variantes**: el Samsung Galaxy S24 Ultra tiene dos variantes (256 GB y 512 GB). Los estados siguientes corresponden exclusivamente al contrato `FichaTecnicaV2.estado_verificacion`.

| Modelo / variante | Estado V2 | Evidencia y observación |
|---|---|---|
| Nothing Phone (2a) Special Edition — 12 GB/256 GB | `verificado` | Página oficial de Nothing y anuncio de la edición especial respaldan el modelo y la configuración. |
| Samsung Galaxy S24 Ultra — 12 GB/256 GB | `verificado` | Hoja oficial de especificaciones de Samsung y ficha regional Colombia. |
| Samsung Galaxy S24 Ultra — 12 GB/512 GB | `verificado` | Hoja oficial de especificaciones de Samsung y ficha regional Colombia. |
| OnePlus Pad 2 — 12 GB/256 GB UFS 3.1 | `verificado` | Ficha oficial estadounidense de OnePlus respalda la configuración y las especificaciones registradas. |
| Apple iPad Pro 11 pulgadas M4 — 16 GB/1 TB | `verificado` | Especificaciones oficiales de Apple respaldan chip, memoria y almacenamiento registrados. |
| Lenovo ThinkPad E14 Gen 5 — MTM 21JK0005RI | `verificado` | PSREF de Lenovo asociado al MTM exacto respalda la configuración y el mercado Rumania (región EET). |
| Apple MacBook Pro 16 pulgadas M3 Max — 48 GB/1 TB | `verificado` | Especificaciones oficiales de Apple respaldan la configuración M3 Max CPU 16/GPU 40, 48 GB y SSD de 1 TB. |
| Nothing Ear (2) — Transparent White | `parcial` | La fuente oficial respalda las especificaciones del modelo; falta una fuente primaria que confirme expresamente el acabado Transparent White. |
| Sony WH-1000XM5 | `verificado` | Ficha oficial de soporte de Sony respalda el modelo y las especificaciones registradas. |

### Interpretación de los estados y límites

- `verificado` significa que la evidencia primaria identificada respalda los datos técnicos incluidos en esa ficha y variante. No certifica autenticidad de una unidad física ni disponibilidad comercial.
- `parcial` significa que el modelo y parte de sus especificaciones tienen respaldo, pero queda al menos un dato de variante por confirmar. En Nothing Ear (2), el pendiente concreto es el acabado Transparent White.
- Los estados de Ficha V2 **no actualizan automáticamente** el estado `estadoVerificacion` del catálogo canónico. Este último continúa `pendiente` hasta completar su propio proceso de identidad, reconciliación y validación de referencias.
- La verificación técnica no valida precios, stock, vendedores, garantía, condición del producto, disponibilidad en Colombia ni derechos de reutilización de imágenes.
- Las métricas del piloto se conservan como informativas (`comparable: false`) y no se presentan como benchmarks comparables. No hay benchmarks verificados incorporados en estas fichas.

### Siguiente trabajo del piloto

1. Obtener evidencia primaria del acabado Transparent White de Nothing Ear (2); si no aparece, mantener el estado `parcial` y registrar el límite.
2. Completar la auditoría independiente de imágenes: modelo y variante correctos, URL utilizable, autor/proveedor, licencia, atribución, alcance de uso y fecha de consulta. Las URLs heredadas no se consideran autorizadas por defecto.
3. Mantener separadas las fuentes técnicas de las fuentes comerciales. Los precios y la disponibilidad requieren consulta por país, vendedor y fecha.
4. Una vez cerrados estos controles, ampliar el mismo estándar a los demás modelos del catálogo (28 modelos únicos identificados en la auditoría), sin duplicar modelos ni mezclar variantes.

Esta actualización documental describe el estado del código integrado en `main`; no modifica datos del catálogo, backend, migraciones SQL ni Supabase.
