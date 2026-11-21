# Carga de ofertas en marketplaces

**Decisión del equipo (20 de noviembre de 2026).** TecReview compara precios de sitios de venta en línea (Mercado Libre, Amazon, eBay, etc.), no de tiendas físicas. Las ofertas se cargan **a mano** desde *Panel de administración → Ofertas por tienda* (Fase 3, `docs/api.md` §32).

## Criterios

1. **Un sitio = un establecimiento.** Crea uno por sitio (por ejemplo, «Mercado Libre Colombia») en *Establecimientos*. Dirección, teléfono y coordenadas quedan vacíos.
2. **Una publicación por producto y por sitio.** El modelo guarda una sola oferta por pareja producto–sitio. Elige la publicación de la **tienda oficial** de la marca si existe; si no, la del vendedor con mejor reputación.
3. **Solo precios finales en COP mostrados por el sitio para Colombia.** No conviertas dólares a pesos a mano: si el sitio no muestra el total en pesos con envío e impuestos a Colombia, no cargues la oferta.
4. **La variante debe ser exacta.** Mismo modelo, capacidad y, si cambia el precio, color. Si no coincide con el producto del catálogo, no la cargues.
5. **El enlace va a la publicación concreta**, nunca a una búsqueda ni a la portada del sitio.
6. **Sin sello «Verificada» por ahora.** No se marca ningún sitio como verificado: el sello depende de la tienda, y lo relevante en un marketplace es el vendedor. Un sello por publicación («Vendedor oficial») requeriría una migración nueva.
7. **Evidencia.** Guarda fuera de la aplicación una hoja con producto, sitio, precio, disponibilidad, enlace y fecha de consulta. La aplicación registra cuándo se guardó cada precio, pero no de dónde salió.
8. **Mantenimiento.** Si cambia el precio, edita la oferta y la fecha se actualiza sola. Si se agota, desmarca «Disponible» en lugar de eliminarla.

## No permitido

- Extraer precios automáticamente de los sitios (*scraping*): va en contra de sus condiciones de uso. Una automatización futura debe usar sus API oficiales, como la API pública de Mercado Libre o las API de Amazon y eBay para desarrolladores registrados.
- Inventar precios o completar datos que no se comprobaron en el sitio.

## Limitaciones conocidas

- No se guarda la moneda: todos los precios se interpretan en COP.
- No se pueden comparar varios vendedores del mismo sitio para un producto.
- «Ofertas destacadas» de la portada solo muestra ofertas cuyo precio es menor que el precio de referencia del producto.
