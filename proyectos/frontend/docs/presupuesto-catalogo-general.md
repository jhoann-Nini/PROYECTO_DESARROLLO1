# Presupuesto de home hacia el catálogo general

Mejora 3. No incluye la revisión de blog/guías ni favoritos (mejoras 4–5).

## Flujo

1. Ajustar «Presupuesto máximo» en la página principal. El importe y el contador
   se actualizan en COP, sin cambiar los productos de «Destacados para ti».
2. Confirmar con «Filtrar por presupuesto» o al terminar el ajuste del slider
   con puntero, ratón, tacto o teclas de ajuste. Enter también permite confirmar;
   Tab y Escape no provocan navegación.
3. Se abre el catálogo general, por ejemplo:
   `/productos?precioMax=4000000`.
4. El catálogo muestra productos de cualquier categoría con precio de referencia
   registrado, positivo y menor o igual a 4.000.000 COP. No se añade la búsqueda de la home
   ni una categoría o marca implícita.

El contador de la barra usa el mismo catálogo general y condición de precio,
sin imponer disponibilidad. No se inventa un precio para productos sin dato.
El slider conserva su rango de 200.000 a 6.000.000 COP.

## Destacados y otras secciones de home

- Los destacados mantienen la selección habitual de hasta seis productos
  (o los resultados de la búsqueda activa), sus rankings y enlaces a fichas.
- No reciben el presupuesto, badges «En presupuesto»/«Supera presupuesto» ni
  un estado de presupuesto aplicado.
- Las ofertas y rankings conservan la búsqueda y dejan de recibir el antiguo
  filtro de presupuesto local, sustituido por la navegación al catálogo.
- No se hace scroll automático a destacados al confirmar el presupuesto.

## Parámetro URL y filtros

- `precioMax` es un entero positivo en COP, sin separadores ni símbolo monetario.
  Se valida como entero seguro menor que `Number.MAX_SAFE_INTEGER`, reservado
  por los filtros existentes para «sin límite».
- Un parámetro ausente, inválido, negativo, cero o repetido no activa presupuesto.
  No se convierte USD/COP ni se interpreta la moneda por la magnitud del valor.
- El máximo inicial es inclusivo. No se aumenta al precio más barato del catálogo ni se
  reduce al precio más caro: un presupuesto sin coincidencias muestra el estado
  vacío de filtros.
- El chip de precio permite quitar el límite; «Borrar filtros»/«Limpiar filtros»
  recupera el catálogo completo, incluidos productos sin precio.
- El campo de precio máximo conserva y muestra el límite finito, aunque quede
  fuera del rango del catálogo. Enfocarlo y salir sin editar no cambia el
  presupuesto. La limpieza lateral sigue habilitada si hay un máximo finito.
- La URL aporta **filtros iniciales**. Los ajustes manuales posteriores del
  catálogo siguen siendo locales, igual que búsqueda, categoría, marca y orden.
  Recargar un enlace con `precioMax` vuelve a aplicar su presupuesto inicial;
  `/productos` sin parámetros abre el catálogo sin ese límite.
- Navegar a un presupuesto diferente inicia filtros nuevos, sin conservar una
  búsqueda o categoría anterior.

## Implementación

- `src/data/presupuesto.ts`: validación y construcción de ruta compartidas.
- `src/components/home/PresupuestoHome.tsx`: confirmación con el importe actual
  y supresión de eventos duplicados de una misma interacción.
- `src/app/page.tsx`: navegación al catálogo y contador independiente.
- `src/components/catalogo/CatalogoCliente.tsx`: lectura del parámetro e
  inicialización del filtro existente, antes de mostrar resultados.
- `src/app/productos/page.tsx`: frontera Suspense requerida por la versión
  instalada de Next.js para `useSearchParams` en una ruta prerenderizada.

No cambian las APIs, el backend, entidades JPA, base de datos ni persistencia.
Tampoco se modifica el comparador de las mejoras 1–2.

## Pruebas

Se cubren validación de importes y URL, categorías múltiples, límite exacto,
precios desconocidos/cero/inválidos, presupuesto sin resultados, quitar el
filtro, cambio de URL, confirmación con botón/puntero/tacto/teclado, eventos
duplicados, nuevo ajuste al mismo importe, ausencia de navegación por Tab y
destacados independientes.

Las pruebas de vista usan respuestas API controladas. El cierre requiere
`npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build` y revisión de Git.

Primera verificación automatizada: **744 pruebas correctas en 62 archivos**,
TypeScript, lint y build de producción correctos. `/productos` mantiene su
prerenderizado. No se ejecutaron pruebas de backend ni una prueba manual
contra un backend real, ya que no se modificó ese módulo.

La revisión independiente detectó una normalización silenciosa del máximo al
salir del campo sin editar y una detección incorrecta del filtro activo por
encima del rango. Ambos casos se corrigieron con RED→GREEN: 78 pruebas selectivas
correctas, incluidas regresiones para presupuestos inferiores, iguales y
superiores al rango del catálogo.

Cierre posterior a revisión: **750 pruebas correctas en 62 archivos**,
TypeScript, lint y build correctos. No quedan hallazgos de esta revisión
pendientes de atender.

## Búsqueda por palabras y productos no registrados (Fase 4, H-12)

- `coincideConBusqueda` (`data/catalogo.ts`) encuentra las palabras en cualquier
  orden («pro iphone» → «iPhone 16 Pro») y también la búsqueda escrita sin
  espacios («iphone16» → «iPhone 16»). La usan el catálogo, la portada, los
  rankings de la portada, las páginas de categoría y el selector del comparador.
- Sin resultados, la portada dice que el término «no está registrado en el
  catálogo de TecReview» y que eso no significa que no exista en el mercado.
  El catálogo general añade la misma aclaración.
- Debajo, «Productos registrados similares» (`buscarAlternativas`) lista hasta
  cuatro productos reales de la marca mencionada o con una palabra del nombre
  en común (palabras de al menos 3 letras que no sean solo números). Si no hay
  ninguno, la sección no aparece.
- Las tarjetas del catálogo solo afirman «Disponible» con ofertas confirmadas
  por `GET /api/productos/resumen-ofertas`; si la consulta falla, no muestran
  la etiqueta.
