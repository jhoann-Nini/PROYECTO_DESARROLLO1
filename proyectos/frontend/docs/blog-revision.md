# Revisión del blog y las guías

Mejora 4. No incluye favoritos (mejora 5).

## Alcance

Se revisaron los cuatro artículos estáticos de `/blog` y su página de detalle
`/blog/[slug]` con cuatro criterios:

1. Claridad: unidades correctas, frases sin ambigüedad y explicaciones que no
   den por sabido un término.
2. Coherencia: títulos, categorías, secciones y puntos clave alineados entre sí.
3. Enlaces: cada enlace apunta a una ruta implementada y con sentido para el
   contenido.
4. Correspondencia con la funcionalidad real: lo que la guía afirma sobre el
   catálogo, el comparador y las reseñas debe existir en el código.

## Hallazgos y correcciones

| Hallazgo | Corrección |
|---|---|
| La guía de móviles decía «miliamperios (mAh)», una unidad incompleta. | Se cambió a «miliamperios-hora (mAh)». |
| La guía de comparación solo decía «hasta cuatro productos», sin explicar la regla de misma categoría ni las filas adaptadas. | Ahora indica que la comparación es de hasta cuatro productos de la misma categoría, que las filas se construyen con los datos registrados para esa categoría y que un valor ausente aparece como «Sin dato». |
| La guía de batería decía que un dato faltante «aparecerá como no registrado», pero el comparador muestra «Sin dato» y la ficha omite los campos sin información. | Se precisó el comportamiento real en ambos lugares. |
| La guía de auriculares hablaba de «las opiniones de la comunidad» sin enlace a la sección correspondiente. | Se menciona la sección Reseñas y se añadió el enlace `/resenas` al pie del artículo. |
| El índice del blog no tenía un enlace directo al comparador, aunque su introducción invita a comparar dispositivos. | Se añadió «Abrir comparador» junto a «Explorar catálogo». |
| El tipo `categoriaSlug` repetía manualmente los cuatro slugs navegables. | Ahora usa `CategoriaSlug`, derivado de `CATEGORIAS_NAVEGABLES`. |

## Correspondencia verificada

- `/blog` lista el artículo destacado y las demás guías; `/blog/[slug]` genera
  una ruta estática por artículo y responde con `notFound()` si el slug no
  existe.
- El comparador acepta hasta `MAX_COMPARADOR` (cuatro) productos y exige que
  pertenezcan a la misma categoría. La guía ya refleja ambas reglas.
- Las filas técnicas del comparador se construyen con características
  registradas (campos planos, secciones y métricas comparables), se adaptan a la
  categoría y muestran «Sin dato» en celdas ausentes. La sugerencia es
  informativa y no declara un ganador absoluto.
- El promedio de las estrellas de la comunidad proviene de valoraciones reales
  (`valoracion-stats` u `obtenerMejorValorados`) y se muestra por separado del
  texto de las reseñas. Cada reseña puede incluir su propia puntuación opcional;
  la guía de auriculares describe esa separación.
- La ficha del producto omite los campos sin información y muestra un estado
  vacío si no hay especificaciones. No se completan datos por lógica.
- Los slugs de categoría usados por el blog (`celulares`, `portatiles` y
  `auriculares`) son navegables reales; `tablets` también está disponible en
  `CATEGORIAS_NAVEGABLES` para futuros artículos. La página de categoría resuelve
  el slug contra `GET /api/categorias`; si la API no devuelve una categoría
  coincidente, muestra «Categoría no encontrada» en lugar de inventar productos.

## Enlaces usados

| Enlace | Destino |
|---|---|
| `/blog` | Índice de guías. |
| `/blog/[slug]` | Detalle de cada artículo. |
| `/categorias/[slug]` | Categoría navegable resuelta contra la API. |
| `/comparador` | Comparador de productos. |
| `/resenas` | Reseñas y valoraciones de la comunidad. |
| `/productos` | Catálogo general. |

## Pruebas

- `src/data/blog.test.ts` valida slugs únicos y con formato, categorías
  navegables, fechas ISO reales (incluidos días imposibles), títulos de sección
  únicos, párrafos y puntos clave no vacíos, y que las guías de comparación y
  batería mencionen el comportamiento real. El límite se contrasta con
  `MAX_COMPARADOR`.
- `src/app/blog/page.test.tsx` valida los enlaces del índice a las guías, la
  categoría destacada y el comparador, y los enlaces de cada artículo a su
  categoría, comparador y reseñas.

## Verificación

- `npm test`: **760 pruebas correctas en 62 archivos** (17 de ellas del blog).
- `npx tsc --noEmit`, `npm run lint` y `npm run build` correctos.
- El build sigue prerenderizando `/blog` y las cuatro rutas de artículo.
- No se modificaron backend, JPA, base de datos ni dependencias.

## Revisión independiente

La revisión detectó que la guía de móviles y el índice prometían un marcador de
dato «ausente» en la ficha, cuando la ficha omite el campo. Se corrigió el copy
para distinguir el comparador («Sin dato») de la ficha (campo omitido). También
se ajustaron las pruebas para atar el límite a `MAX_COMPARADOR`, validar fechas
imposibles y describir el promedio de estrellas separado del texto de las
reseñas.

## Límites

- El blog sigue siendo contenido estático en el repositorio: no hay CMS,
  autores ni métricas de lectura distintas del cálculo local de palabras.
- Los enlaces de categoría dependen de que la API real devuelva categorías
  cuyos nombres coincidan con los slugs navegables. No se simulan categorías
  para evitar enlaces falsos.
- No se modificaron backend, JPA, base de datos ni dependencias.
- Las pruebas de vista usan datos controlados; no se ejecutó una prueba manual
  contra un backend real.
