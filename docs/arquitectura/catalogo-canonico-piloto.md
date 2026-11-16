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
