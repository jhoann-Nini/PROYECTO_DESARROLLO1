# TecnoReview Bloque B — Shell y catálogo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Construir el shell responsive de TecnoReview (header, bottom nav y footer) y reemplazar `/productos` por el catálogo real con búsqueda, filtros, chips y paginación.

**Architecture:** El catálogo vive en un componente cliente (`CatalogoCliente`) que consume la API, enriquece productos con marcas y categorías, y delega el cálculo en las funciones puras del Bloque A. El shell se monta con `src/app/productos/layout.tsx`, de modo que `/productos` y la futura `/productos/[id]` lo compartan. El inspector actual se mueve a `/debug/productos` sin perder sus pruebas.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, Vitest 3 + Testing Library.

**Spec:** `docs/tecnoreview-redesign.md`

## Estado de ejecución

- **Fecha:** 2026-10-25
- **Rama:** `feat/tecnoreview-redesign`
- **Pruebas:** 262 pasando en 23 archivos.
- **Build y lint:** `npm run build` y `npm run lint` exitosos.
- **Commits locales:** shell, enriquecido de catálogo, tarjeta v2, filtros y catálogo real.
- **Pendiente:** Bloque C (home).

## Global Constraints

- Paleta oficial únicamente: `#2563EB`, `#0F172A`, `#F3F4F6`, `#E5E7EB`, `#10B981`, `#F59E0B`, `#FFFFFF`, `#64748B`.
- Tipografía Inter, pesos 400/500/600/700; sin Doto ni Space Grotesk en componentes nuevos.
- Radios de 8 px a 12 px; sombras suaves; iconos outline de 1.5–2 px.
- Todo componente nuevo usa `.theme-tecnoreview` o sus tokens; nada de clases `dark:`.
- No modificar backend, `.env`, base de datos ni la home `/` en este bloque.
- No inventar ratings, especificaciones ni disponibilidad: rating `null` se muestra como “Sin reseñas”.
- El inspector de API existente no se elimina: se traslada a `/debug/productos`.
- Cada tarea termina con pruebas verdes y un commit local. Sin push.

## Review Focus

- La API no trae `nombreMarca` ni `nombreCategoria`: si el enriquecimiento falla, la tarjeta debe mostrar `Marca #id` y no romperse.
- Un producto con `precioReferencia: null` debe mostrar “Consultar disponibilidad” y quedar fuera de los filtros de precio, nunca `$ 0`.
- Un producto con `estado: false` debe mostrar “No disponible” y no un badge verde.
- Los filtros combinados deben mantener conteos coherentes y permitir limpiar todo con una acción.
- El catálogo debe ser usable con teclado y en 360 px de ancho sin desbordamiento horizontal.

---

## File Structure

- Create: `src/components/shell/SiteHeader.tsx` — cabecera con marca, navegación y buscador en desktop.
- Create: `src/components/shell/BottomNav.tsx` — navegación inferior móvil.
- Create: `src/components/shell/SiteFooter.tsx` — pie de página.
- Create: `src/components/shell/shell.test.tsx` — pruebas de accesibilidad del shell.
- Create: `src/app/productos/layout.tsx` — monta el shell alrededor del catálogo.
- Create: `src/data/catalogoApi.ts` — enriquecido `Producto` + catálogos → view models.
- Create: `src/data/catalogoApi.test.ts` — pruebas del enriquecido.
- Create: `src/components/catalogo/RatingStars.tsx` — estrellas o “Sin reseñas”.
- Create: `src/components/catalogo/ProductCardTecno.tsx` — tarjeta v2.
- Create: `src/components/catalogo/ProductCardTecno.test.tsx` — pruebas de la tarjeta.
- Create: `src/components/catalogo/FilterSidebar.tsx` — categorías, marcas, precio y características.
- Create: `src/components/catalogo/FilterChips.tsx` — chips removibles.
- Create: `src/components/catalogo/Pagination.tsx` — paginación accesible.
- Create: `src/components/catalogo/CatalogoCliente.tsx` — orquestador de datos y estado.
- Create: `src/components/catalogo/CatalogoCliente.test.tsx` — pruebas de integración del catálogo.
- Create: `src/app/debug/productos/page.tsx` — inspector movido.
- Create: `src/app/debug/productos/page.test.tsx` — pruebas del inspector movidas.
- Modify: `src/app/productos/page.tsx` — pasa a renderizar el catálogo.
- Delete: `src/app/productos/page.test.tsx` — se traslada a `/debug/productos`.

---

### Task 1: Shell responsive

**Files:**
- Create: `src/components/shell/SiteHeader.tsx`
- Create: `src/components/shell/BottomNav.tsx`
- Create: `src/components/shell/SiteFooter.tsx`
- Create: `src/components/shell/shell.test.tsx`
- Create: `src/app/productos/layout.tsx`

**Interfaces:**
- Produces: `SiteHeader`, `BottomNav`, `SiteFooter` como componentes sin props.
- Consumes: `next/link`, tokens `--color-ink`, `--color-paper`, `--color-hairline`, `--color-brand-blue`, `--color-subtle`.

Reglas de contenido:

- Marca: `TecnoReview` con `Tecno` en `--color-ink` y `Review` en `--color-brand-blue`.
- Navegación desktop: Inicio (`/`), Productos (`/productos`), Comparador, Reseñas, Blog.
- Comparador, Reseñas y Blog aún no existen: se renderizan como `aria-disabled="true"` con `title="Próximamente"` y **sin** `href`, para no producir 404.
- Bottom nav móvil: Inicio, Catálogo, Comparador y Perfil con la misma regla de disponibilidad.
- Footer: `© 2026 TecnoReview — Compara · Analiza · Decide.`

- [x] **Step 1: Escribir las pruebas que fallan**

`src/components/shell/shell.test.tsx` (happy-dom) debe verificar:

```ts
it("el header muestra la marca y enlaza a rutas existentes")
// TecnoReview visible; Inicio con href "/"; Productos con href "/productos".

it("marca las rutas futuras como no disponibles sin href")
// Comparador, Reseñas y Blog: aria-disabled="true" y sin atributo href.

it("el bottom nav expone navegación accesible")
// nav con aria-label "Navegación principal móvil"; 4 enlaces/botones.

it("el footer muestra la marca y el tagline")
```

- [x] **Step 2: Ejecutar y verificar el fallo**

Run: `npx vitest run src/components/shell/shell.test.tsx`
Expected: FAIL por módulos inexistentes.

- [x] **Step 3: Implementar los tres componentes y el layout**

`SiteHeader`: `header` sticky con `bg-[var(--color-paper)]/95`, borde inferior `--color-hairline`, alto 64 px, `hidden md:flex` para la navegación. Enlace activo con `aria-current="page"` cuando corresponda (se calcula con `usePathname`; el componente es cliente).

`BottomNav`: `nav` fija al fondo, visible solo `md:hidden`, `aria-label="Navegación principal móvil"`, cuatro destinos con iconos SVG outline `strokeWidth={1.75}`.

`SiteFooter`: `footer` sobre `--color-paper`, texto `--color-subtle`, `text-xs`.

`src/app/productos/layout.tsx`:

```tsx
export default function ProductosLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="theme-tecnoreview flex min-h-screen flex-col">
      <SiteHeader />
      <div className="flex-1 pb-20 md:pb-0">{children}</div>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
```

- [x] **Step 4: Ejecutar y verificar que pasan**

Run: `npx vitest run src/components/shell/shell.test.tsx`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/components/shell src/app/productos/layout.tsx
git commit -m "feat: add TecnoReview responsive shell"
```

---

### Task 2: Ensamblado de datos del catálogo

**Files:**
- Create: `src/data/catalogoApi.ts`
- Create: `src/data/catalogoApi.test.ts`

**Interfaces:**
- Consumes: `Producto`, `CategoriaResponse`, `MarcaResponse`; `crearProductoViewModel`, `ProductoViewModel`.
- Produces:

```ts
export interface DatosCatalogo {
  productos: Producto[];
  categorias: CategoriaResponse[];
  marcas: MarcaResponse[];
}

export function construirCatalogo(datos: DatosCatalogo): ProductoViewModel[];
```

Reglas:

- Índice `idMarca → nombre` y `idCategoria → nombre`; los IDs desconocidos no inventan nombre.
- Pasa `nombreMarca` como opción al view model; si falta, el view model produce `Marca #id`.
- Asigna `nombreCategoria` al producto antes de crear la vista para que el texto de búsqueda incluya la categoría real (“Laptops / PCs”).
- Conserva el orden de entrada y tolera listas vacías.

- [x] **Step 1: Escribir las pruebas que fallan**

```ts
it("enriquece la marca desde /api/marcas")
it("enriquece la categoría en el texto de búsqueda")
it("usa Marca #id cuando el id de marca no existe")
it("tolera listas vacías y conserva el orden")
```

- [x] **Step 2: Ejecutar y verificar el fallo**

Run: `npx vitest run src/data/catalogoApi.test.ts`
Expected: FAIL por módulo inexistente.

- [x] **Step 3: Implementar `construirCatalogo`**

Construye dos `Map<number, string>` y mapea con `crearProductoViewModel({ ...producto, nombreCategoria }, { nombreMarca })`.

- [x] **Step 4: Ejecutar y verificar que pasan**

Run: `npx vitest run src/data/catalogoApi.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/data/catalogoApi.ts src/data/catalogoApi.test.ts
git commit -m "feat: enrich catalog products with brand and category names"
```

---

### Task 3: Estrellas y tarjeta de producto v2

**Files:**
- Create: `src/components/catalogo/RatingStars.tsx`
- Create: `src/components/catalogo/ProductCardTecno.tsx`
- Create: `src/components/catalogo/ProductCardTecno.test.tsx`

**Interfaces:**
- Produces:

```ts
export function RatingStars(props: {
  rating: number | null;
  cantidadResenas?: number | null;
  tamano?: "sm" | "md";
}): React.ReactElement;

export default function ProductCardTecno(props: {
  producto: ProductoViewModel;
  onVerDetalle?: (producto: ProductoViewModel) => void;
}): React.ReactElement;
```

Reglas visuales:

- Tarjeta `bg-[var(--color-paper)]`, `rounded-lg`, `border border-[var(--color-hairline)]`, `shadow-[var(--shadow-paper)]`, hover con `--shadow-paper-hover`.
- Badge “Disponible” en `--color-positive` con texto `--color-ink`; “No disponible” en `--color-hairline` con `--color-subtle`.
- Marca y categoría como texto secundario `--color-subtle`, `text-xs`.
- Nombre en `--color-ink`, `font-semibold`, máximo 2 líneas.
- Hasta dos especificaciones clave (pantalla y procesador) con icono outline; se omiten si son `null`.
- Precio en `--color-ink`, `text-lg font-semibold`; si `precioCOP === 0`, muestra “Consultar disponibilidad” en `--color-subtle`.
- Botón “Ver detalle” en `--color-brand-blue` con texto blanco.

- [x] **Step 1: Escribir las pruebas que fallan**

```ts
it("muestra nombre, marca, categoría y precio formateado")
it("muestra 'Consultar disponibilidad' cuando no hay precio")
it("muestra 'No disponible' cuando estado es false")
it("muestra 'Sin reseñas' cuando no hay rating")
it("muestra el rating numérico cuando existe")
it("omite especificaciones ausentes")
it("invoca onVerDetalle al pulsar la tarjeta y el botón")
```

- [x] **Step 2: Ejecutar y verificar el fallo**

Run: `npx vitest run src/components/catalogo/ProductCardTecno.test.tsx`
Expected: FAIL por módulo inexistente.

- [x] **Step 3: Implementar `RatingStars` y `ProductCardTecno`**

`RatingStars` usa `role="img"` con `aria-label` tipo `Valoración 4,5 de 5`; cuando `rating === null` renderiza `<span>Sin reseñas</span>` sin iconos.

- [x] **Step 4: Ejecutar y verificar que pasan**

Run: `npx vitest run src/components/catalogo/ProductCardTecno.test.tsx`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/components/catalogo/RatingStars.tsx src/components/catalogo/ProductCardTecno.tsx src/components/catalogo/ProductCardTecno.test.tsx
git commit -m "feat: add TecnoReview product card with rating and availability"
```

---

### Task 4: Filtros, chips y paginación

**Files:**
- Create: `src/components/catalogo/FilterSidebar.tsx`
- Create: `src/components/catalogo/FilterChips.tsx`
- Create: `src/components/catalogo/Pagination.tsx`

**Interfaces:**
- Consumes: `CatalogoPreparado`, `FiltrosCatalogo`, `ChipFiltro`, `CaracteristicaClave`.
- Produces:

```ts
export default function FilterSidebar(props: {
  catalogo: CatalogoPreparado;
  filtros: FiltrosCatalogo;
  onCambiar: (filtros: FiltrosCatalogo) => void;
  onLimpiar: () => void;
  hayFiltros: boolean;
}): React.ReactElement;

export default function FilterChips(props: {
  chips: ChipFiltro[];
  onQuitar: (chip: ChipFiltro) => void;
}): React.ReactElement;

export default function Pagination(props: {
  pagina: number;
  totalPaginas: number;
  total: number;
  onCambiar: (pagina: number) => void;
}): React.ReactElement;
```

Reglas:

- Cada opción de categoría, marca y característica es un `checkbox` con `label` asociado y conteo visible.
- Precio: dos `input type="range"` (`aria-label="Precio mínimo"` y `"Precio máximo"`) acotados a `rangoPrecio`; si el rango es `{0,0}` se deshabilita el bloque.
- Botón “Limpiar filtros” deshabilitado cuando `hayFiltros` es falso.
- `FilterChips` no renderiza nada si `chips` está vacío; cada chip tiene botón con `aria-label="Quitar filtro <etiqueta>"`.
- `Pagination`: `nav` con `aria-label="Paginación del catálogo"`, botones Anterior/Siguiente deshabilitados en los extremos, y texto “Página X de Y · N productos”.

- [x] **Step 1: Escribir las pruebas que fallan**

```ts
it("marca una categoría y devuelve los filtros actualizados")
it("añade y quita una marca")
it("mueve el rango de precio")
it("deshabilita 'Limpiar filtros' sin filtros activos")
it("quita un chip concreto")
it("no renderiza chips vacíos")
it("deshabilita Anterior en la primera página y Siguiente en la última")
```

- [x] **Step 2: Ejecutar y verificar el fallo**

Run: `npx vitest run src/components/catalogo/filtros.test.tsx`
Expected: FAIL por módulos inexistentes.

- [x] **Step 3: Implementar los tres componentes**

Las actualizaciones son inmutables: `onCambiar({ ...filtros, categorias: [...] })`. Al cambiar `precioMin` se garantiza `precioMin <= precioMax` recortando el otro extremo.

- [x] **Step 4: Ejecutar y verificar que pasan**

Run: `npx vitest run src/components/catalogo/filtros.test.tsx`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/components/catalogo/FilterSidebar.tsx src/components/catalogo/FilterChips.tsx src/components/catalogo/Pagination.tsx src/components/catalogo/filtros.test.tsx
git commit -m "feat: add catalog filter sidebar, chips and pagination"
```

---

### Task 5: Catálogo real en `/productos`

**Files:**
- Create: `src/components/catalogo/CatalogoCliente.tsx`
- Create: `src/components/catalogo/CatalogoCliente.test.tsx`
- Modify: `src/app/productos/page.tsx`
- Create: `src/app/debug/productos/page.tsx`
- Create: `src/app/debug/productos/page.test.tsx`
- Delete: `src/app/productos/page.test.tsx`

**Interfaces:**
- Consumes: `obtenerProductos`, `obtenerCategorias`, `obtenerMarcas`, `construirCatalogo`, `prepararCatalogo`, `filtrarProductos`, `paginar`, `construirChips`, `hayFiltrosActivos`, `ProductCardTecno`, `FilterSidebar`, `FilterChips`, `Pagination`, `SearchBar`, `FichaTecnicaModal`.
- Produces: `CatalogoCliente` sin props.

Reglas:

- Carga en paralelo con `Promise.all`; si falla cualquiera, muestra el mensaje de error de la API en un `role="alert"`.
- `ProductoViewModel[]` se memoiza con `useMemo` sobre los datos cargados; `prepararCatalogo` igual.
- Filtros iniciales: `precioMin` y `precioMax` se fijan al rango real cuando termina la carga.
- `POR_PAGINA = 12`; cualquier cambio de filtro o búsqueda vuelve a la página 1.
- Estado vacío con `role="status"`: “No encontramos productos con esos filtros.” y botón para limpiar.
- El botón “Ver detalle” abre `FichaTecnicaModal` con el `Producto` original (la ruta `/productos/[id]` llega en el Bloque D).
- `src/app/productos/page.tsx` queda como componente servidor que renderiza `<CatalogoCliente />`.
- El inspector actual y su prueba se mueven literalmente a `src/app/debug/productos/`.

- [x] **Step 1: Escribir las pruebas que fallan**

```ts
it("muestra el estado de carga")
it("muestra un error accesible si la API falla")
it("muestra el total y las tarjetas con datos enriquecidos")
it("filtra por categoría y vuelve a la página 1")
it("limpia todos los filtros")
it("muestra el estado vacío cuando no hay coincidencias")
it("pagina los resultados de 12 en 12")
```

- [x] **Step 2: Ejecutar y verificar el fallo**

Run: `npx vitest run src/components/catalogo/CatalogoCliente.test.tsx`
Expected: FAIL por módulo inexistente.

- [x] **Step 3: Implementar `CatalogoCliente`, la página y mover el inspector**

Mover con `git mv src/app/productos/page.tsx src/app/debug/productos/page.tsx` y su prueba; ajustar el título del inspector a “Inspector de API” sin cambiar su lógica.

- [x] **Step 4: Ejecutar y verificar que pasan**

Run: `npx vitest run src/components/catalogo/CatalogoCliente.test.tsx src/app/debug/productos/page.test.tsx`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/app/productos src/app/debug src/components/catalogo
git commit -m "feat: replace products page with real TecnoReview catalog"
```

---

### Task 6: Verificación completa

- [x] **Step 1: Suite completa**

Run: `npm test`
Expected: todas las pruebas pasan, incluidas las nuevas.

- [x] **Step 2: Build**

Run: `npm run build`
Expected: exit 0; rutas `/productos` y `/debug/productos` presentes.

- [x] **Step 3: Lint**

Run: `npm run lint`
Expected: sin errores.

- [x] **Step 4: Revisión del diff**

Run: `git status --short` y `git diff --stat`
Expected: solo archivos del Bloque B; sin backend, `.env` ni home.

- [x] **Step 5: Actualizar documentación**

Marcar las tareas y anotar desviaciones en este documento y en `docs/tecnoreview-redesign.md`.

- [x] **Step 6: Commit**

```bash
git add docs
git commit -m "docs: mark TecnoReview block B progress"
```
