# Comparador: filas técnicas por categoría

Mejora 2. Se mantiene la restricción de misma categoría de la mejora 1.

## Qué muestra la tabla

- Siempre conserva precio de referencia, disponibilidad, marca y categoría.
- Las filas técnicas se construyen con las características del catálogo real,
  alineadas por ID de producto y en el orden de la selección.
- Aparece una fila técnica si al menos uno de los productos aporta un valor.
  Cuando falta en otro, su celda muestra «Sin dato». No se generan filas
  vacías de una plantilla.
- Si no hay características técnicas, se informa y se muestran solo los datos
  generales.
- «Solo diferencias» compara los textos registrados, incluyendo los valores
  ausentes. No convierte ni equipara mediciones o unidades distintas.

## Categorías y campos

Se reutiliza `obtenerSlugDeCategoria` con el nombre registrado de categoría,
resuelto por la API. No se asignan categorías por IDs fijos ni por el nombre
comercial del producto.

- **Auriculares:** transductores/drivers, cancelación de ruido, micrófonos,
  batería/autonomía, códecs, Bluetooth, conectividad, software y otros campos
  registrados. Se conservan también sus puertos físicos (jack, USB-C, etc.)
  cuando están registrados. No se muestran los campos reconocidos de pantalla, procesador,
  RAM, almacenamiento o cámaras, aunque queden datos residuales de ellos.
- **Celulares y tablets:** se conservan sus datos de pantalla, procesador,
  memoria, cámaras, batería y conectividad; tablets también admite productividad.
- **Portátiles:** se incluyen GPU, puertos y webcam cuando existen, sin tratar
  las cámaras de móvil como especificación del portátil.
- **Categorías desconocidas:** se muestran únicamente los datos registrados,
  sin asumir que son móviles ni añadir campos predeterminados.

Los campos técnicos personalizados con valores válidos se conservan. Sus
etiquetas se derivan de la clave registrada o de la etiqueta explícita, no de
datos técnicos inventados.

## Formatos de características existentes

El módulo `src/data/especificacionesComparador.ts` admite:

1. Campos planos de `caracteristicas`, incluidos aliases como `drivers`,
   `anc`, `cpu`, `gpu` y `disco`. También se reconocen los alias heredados
   `memoria` (RAM) y «CHIPSET & ARQUITECTURA» (procesador) para excluirlos
   correctamente de audio.
2. `secciones` explícitas con título y descripción; se conserva `detalleExtra`
   si contiene un valor.
3. `metricasComparables`, normalizadas con `normalizarDatosFichaTecnica`:
   solo las marcadas `comparable: true`, con sus valores y unidades registrados.

Para la misma clave reconocida, una métrica comparable válida tiene prioridad
sobre una sección válida, y esta sobre el campo plano. Los aliases reconocidos
se agrupan; las características diferentes no se comparan por posición.

Se conservan números finitos, `0`, booleanos (`Sí`/`No`), texto no vacío y listas
de valores simples. Se ignoran nulos, vacíos, valores no finitos y objetos
anidados, en lugar de mostrar JSON como si fuera una especificación.

Los metadatos de versión, variante, fuentes, verificación, tiendas,
benchmarks y puntuaciones no se convierten en filas técnicas. No se incorporan
datos simulados ni se crean valores, unidades o puntuaciones.

## Sugerencia informativa

Disponibilidad y precio mantienen su prioridad. Para desempatar por cantidad
de información, se cuentan solo los valores presentes en las filas técnicas
de esta comparación, sin el denominador fijo «de 6».

Cambiar «Solo diferencias» no modifica ese conteo: se sigue usando el conjunto
completo de filas de la selección, no el subconjunto visible tras el filtro.
Más información registrada no equivale a mayor calidad del producto.

## Alcance y pruebas

No cambia el modelo compartido del catálogo, el almacenamiento local, las APIs,
las entidades JPA ni la base de datos. Tampoco modifica presupuesto, blog o
favoritos: las mejoras 3–5 siguen pendientes.

Las pruebas del normalizador, la construcción de filas, la sugerencia y la vista
cubren audio y otras categorías, IDs no convencionales, datos faltantes,
formatos existentes, campos ajenos, aliases, valores falsos/cero y cambios
de selección. Se verifican también las regresiones de la mejora 1 mediante la
suite completa.

Primera verificación automatizada: `npm test` con 688 pruebas correctas en 61
archivos, `npx tsc --noEmit`, `npm run lint` y `npm run build` correctos. No se ejecutan
pruebas de backend porque ese módulo no cambia; los escenarios de la tabla usan
respuestas API controladas, no una comprobación manual contra un backend real.

La revisión independiente detectó dos límites del filtro: alias heredados de
memoria/chipset que aún aparecían en audio y puertos físicos de auriculares que
se descartaban. Se corrigieron con regresiones RED→GREEN en el normalizador,
las filas y la sugerencia de la vista: 58 pruebas selectivas correctas.

Cierre posterior a la revisión: **691 pruebas correctas en 61 archivos**,
TypeScript, lint y build de producción correctos. Cambios limitados a esta
mejora; las mejoras 3–5 esperan autorización de la siguiente ejecución.
