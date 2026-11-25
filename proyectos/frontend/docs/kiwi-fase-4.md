# Kiwi V3 — Fase 4: Inicio

Fecha: 2026-11-25. Rama: `rediseno-kiwi`.
Referencias: [DISENO.md](tecreview-diseno-v3-kiwi/DISENO.md),
[Inicio.html](tecreview-diseno-v3-kiwi/pantallas/Inicio.html) y
[Movil-publico.html](tecreview-diseno-v3-kiwi/pantallas/Movil-publico.html).

## Cambios

La portada y `components/home` usan las superficies, bordes punteados, texto y
señales del sistema Kiwi. Se retiraron las clases de sombra y los colores
directos de estos archivos. Los títulos y rótulos de la portada emplean peso
500, sin espaciado adicional, y las mayúsculas se aplican con CSS. El hero
adapta su escala entre móvil y escritorio. El bloque del comparador usa la
superficie elevada para conservar contraste en ambos temas.

`SearchBar` reutiliza el `Input` de la fase 2: línea inferior y radio cero.
Su botón para borrar mantiene el nombre accesible, el manejador y el indicador
de foco compartido. No cambiaron el presupuesto, las búsquedas, las fuentes de
datos, las rutas, las reseñas ni los paneles modales.

## Verificación

- `npm test`: **94 archivos y 1375 pruebas aprobadas**. La primera ejecución
  señaló únicamente la clase de foco del botón para borrar búsqueda; se
  restauró `CLASE_FOCO` y la segunda ejecución pasó sin cambiar pruebas ni
  lógica. Línea base de la fase anterior: 94 archivos y 1375 pruebas.
- `npm run build`: **correcto**, TypeScript aprobado y **17/17 páginas**
  generadas.
- Una comparación estructural del árbol TypeScript de los 12 archivos de
  interfaz confirmó que solo cambiaron clases, el componente visual Input y
  sus imports; se conservaron textos, atributos y lógica.
- `git diff --check`: sin errores. La revisión de estos archivos no encontró
  sombras ni colores directos en JSX.

La revisión visual completa de ambos temas y de las demás páginas corresponde
a la fase 11. La fase 5 aún no comienza.
