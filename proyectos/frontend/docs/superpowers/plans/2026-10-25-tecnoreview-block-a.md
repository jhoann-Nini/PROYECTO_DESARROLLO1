# TecnoReview Bloque A — Fundaciones Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Agregar los tokens del tema claro de TecnoReview y la capa de datos pura (normalización de COP, view model de producto, filtros y paginación) sin cambiar el comportamiento visual existente.

**Architecture:** Capa de convivencia. Los tokens semánticos nuevos viven junto a los tokens oscuros actuales. Módulos TypeScript puros transforman los productos de la API en un view model listo para UI y ofrecen filtrado/paginación deterministas. Este bloque no contiene React ni llamadas de red.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, Vitest 3.

**Spec:** `docs/tecnoreview-redesign.md`

## Global Constraints

- Usar únicamente la paleta oficial: `#2563EB`, `#0F172A`, `#F3F4F6`, `#E5E7EB`, `#10B981`, `#F59E0B`, `#FFFFFF`, `#64748B`.
- Tipografía Inter, pesos 400/500/600/700.
- Radios de 8 px a 12 px.
- No modificar el backend ni el esquema de la base de datos.
- No romper las páginas existentes ni la clase `dark` durante el Bloque A.
- No inventar ratings, especificaciones ni disponibilidad.
- Mantener el formato COP y la compatibilidad con los mocks legados.
- Cada tarea termina con pruebas verdes y un commit local.

## Review Focus

- `precioReferencia: null` debe producir `precioCOP: 0` y “Consultar disponibilidad”, nunca `$ 0`.
- `caracteristicas: null` o vacías deben producir especificaciones `null`, sin datos inventados.
- `estado: false` debe producir `disponible: false`.
- Un precio legado menor a 10.000 debe normalizarse igual para mostrar y para filtrar.
- La búsqueda debe ignorar acentos y mayúsculas; los conteos deben ser coherentes con los filtros.

---

## File Structure

- Create: `src/data/precios.ts` — regla única de normalización COP.
- Create: `src/data/precios.test.ts` — pruebas de normalización y formato.
- Create: `src/data/productoViewModel.ts` — transformación `Producto → ProductoViewModel`.
- Create: `src/data/productoViewModel.test.ts` — pruebas del view model.
- Create: `src/data/catalogo.ts` — conteos, filtros, chips y paginación.
- Create: `src/data/catalogo.test.ts` — pruebas de catálogo.
- Modify: `src/data/specsHelper.ts` — `formatearCOP` usa `normalizarPrecioCOP`.
- Modify: `src/app/globals.css` — tokens nuevos y `.theme-tecnoreview`.
- Create: `docs/tecnoreview-redesign.md` — especificación (ya creada).
- Create: `docs/superpowers/plans/2026-10-25-tecnoreview-block-a.md` — este plan.

---

### Task 1: Tokens oficiales y alcance del tema claro

**Files:**
- Modify: `src/app/globals.css`
- Test: verificación por `grep` y build final

**Interfaces:**
- Produces: tokens `--color-brand-blue`, `--color-ink`, `--color-canvas`, `--color-hairline`, `--color-positive`, `--color-star`, `--color-paper`, `--color-subtle`, sombras `--shadow-paper`, `--shadow-paper-hover` y la clase `.theme-tecnoreview`.

- [x] **Step 1: Agregar los tokens dentro de `@theme`**

Valores exactos:

```css
--color-brand-blue: #2563eb;
--color-ink: #0f172a;
--color-canvas: #f3f4f6;
--color-hairline: #e5e7eb;
--color-positive: #10b981;
--color-star: #f59e0b;
--color-paper: #ffffff;
--color-subtle: #64748b;
--shadow-paper: 0 1px 2px rgba(15, 23, 42, 0.06), 0 8px 24px -12px rgba(15, 23, 42, 0.12);
--shadow-paper-hover: 0 2px 4px rgba(15, 23, 42, 0.08), 0 16px 32px -16px rgba(15, 23, 42, 0.18);
```

- [x] **Step 2: Agregar la clase de alcance**

```css
.theme-tecnoreview {
  color-scheme: light;
  background-color: var(--color-canvas);
  color: var(--color-ink);
}
```

- [x] **Step 3: Verificar que los valores sean exactos**

Run: `rg -n "color-(brand-blue|ink|canvas|hairline|positive|star|paper|subtle)|shadow-paper|theme-tecnoreview" src/app/globals.css`
Expected: aparecen los ocho tokens, las dos sombras y la clase, con los hex indicados.

- [x] **Step 4: Commit**

```bash
git add src/app/globals.css docs/tecnoreview-redesign.md docs/superpowers/plans/2026-10-25-tecnoreview-block-a.md
git commit -m "feat: add TecnoReview design tokens and foundation docs"
```

---

### Task 2: Normalización de precios COP

**Files:**
- Create: `src/data/precios.ts`
- Create: `src/data/precios.test.ts`
- Modify: `src/data/specsHelper.ts`

**Interfaces:**
- Produces: `TASA_CAMBIO_LEGADO: number`, `UMBRAL_PRECIO_COP: number`, `normalizarPrecioCOP(valor: number | null | undefined): number`.
- Consumes: `formatearCOP` existente.

- [x] **Step 1: Escribir la prueba que falla**

`src/data/precios.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { normalizarPrecioCOP, TASA_CAMBIO_LEGADO } from "./precios";
import { formatearCOP } from "./specsHelper";

describe("normalizarPrecioCOP", () => {
  it("convierte precios legados en dólares a COP", () => {
    expect(TASA_CAMBIO_LEGADO).toBe(4000);
    expect(normalizarPrecioCOP(437.25)).toBe(1_749_000);
  });

  it("conserva los precios que ya están en COP", () => {
    expect(normalizarPrecioCOP(289_900)).toBe(289_900);
    expect(normalizarPrecioCOP(5_374_999)).toBe(5_374_999);
  });

  it("devuelve 0 para valores ausentes o inválidos", () => {
    expect(normalizarPrecioCOP(null)).toBe(0);
    expect(normalizarPrecioCOP(undefined)).toBe(0);
    expect(normalizarPrecioCOP(Number.NaN)).toBe(0);
    expect(normalizarPrecioCOP(-10)).toBe(0);
  });

  it("formatea en COP usando la misma normalización", () => {
    expect(formatearCOP(437.25)).toContain("1.749.000");
    expect(formatearCOP(437.25)).toContain("COP");
    expect(formatearCOP(null)).toBe("Consultar disponibilidad");
  });
});
```

- [x] **Step 2: Ejecutar la prueba y verificar el fallo**

Run: `npx vitest run src/data/precios.test.ts`
Expected: FAIL porque `./precios` no existe.

- [x] **Step 3: Implementar `src/data/precios.ts`**

```ts
export const TASA_CAMBIO_LEGADO = 4000;
export const UMBRAL_PRECIO_COP = 10000;

export function normalizarPrecioCOP(
  valor: number | null | undefined
): number {
  if (valor === null || valor === undefined || !Number.isFinite(valor) || valor <= 0) {
    return 0;
  }
  return valor < UMBRAL_PRECIO_COP
    ? Math.round(valor * TASA_CAMBIO_LEGADO)
    : Math.round(valor);
}
```

- [x] **Step 4: Modificar `formatearCOP` para usar la regla compartida**

Importar `normalizarPrecioCOP` desde `./precios` y reemplazar el cálculo interno:

```ts
const monto = normalizarPrecioCOP(valor);
```

Mantener el retorno `"Consultar disponibilidad"` para `null`/`undefined`.

- [x] **Step 5: Ejecutar las pruebas y verificar que pasan**

Run: `npx vitest run src/data/precios.test.ts src/data/specsHelper.test.ts`
Expected: PASS en ambos archivos.

- [x] **Step 6: Commit**

```bash
git add src/data/precios.ts src/data/precios.test.ts src/data/specsHelper.ts
git commit -m "feat: centralize COP price normalization"
```

---

### Task 3: View model de producto

**Files:**
- Create: `src/data/productoViewModel.ts`
- Create: `src/data/productoViewModel.test.ts`

**Interfaces:**
- Consumes: `Producto`, `CategoriaDispositivo` de `@/types/producto`; `normalizarPrecioCOP`; `formatearCOP`; `detectarCategoria`; `ETIQUETAS_CATEGORIA` (se define aquí o en `catalogo.ts`; este plan lo define en `productoViewModel.ts` para evitar ciclos).
- Produces:

```ts
export type CaracteristicaClave =
  | "5g"
  | "buena-camara"
  | "alto-rendimiento"
  | "gran-bateria";

export interface EspecificacionesClave {
  pantalla: string | null;
  procesador: string | null;
  ram: string | null;
  almacenamiento: string | null;
  camaras: string | null;
  bateria: string | null;
}

export interface ProductoViewModel {
  idProducto: number;
  nombre: string;
  marca: string;
  categoria: CategoriaDispositivo;
  categoriaEtiqueta: string;
  imagen: string | null;
  precioCOP: number;
  precioFormateado: string;
  disponible: boolean;
  rating: number | null;
  cantidadResenas: number | null;
  especificaciones: EspecificacionesClave;
  caracteristicas: CaracteristicaClave[];
  textoBusqueda: string;
}

export interface OpcionesProductoViewModel {
  rating?: number | null;
  cantidadResenas?: number | null;
  nombreMarca?: string | null;
}

export const ETIQUETAS_CATEGORIA: Record<CategoriaDispositivo, string>;
export function normalizarTexto(valor: string): string;
export function crearProductoViewModel(
  producto: Producto,
  opciones?: OpcionesProductoViewModel
): ProductoViewModel;
```

- [x] **Step 1: Escribir las pruebas que fallan**

`src/data/productoViewModel.test.ts` debe cubrir, como mínimo:

```ts
it("mapea identidad, categoría, marca y disponibilidad")
it("normaliza el precio a COP y lo formatea")
it("marca como no disponible cuando estado es false")
it("extrae especificaciones clave sin inventar las ausentes")
it("separa RAM y almacenamiento cuando vienen combinados")
it("acepta rating y cantidad de reseñas opcionales")
it("detecta 5G, buena cámara, alto rendimiento y gran batería")
it("construye un texto de búsqueda sin acentos")
it("usa Marca #id cuando no hay nombre de marca")
```

Valores exactos que deben aparecer en las aserciones:

- `precioReferencia: 437.25` → `precioCOP: 1_749_000`.
- `precioReferencia: null` → `precioCOP: 0` y `precioFormateado: "Consultar disponibilidad"`.
- `estado: false` → `disponible: false`.
- `ram_almacenamiento: "8 GB RAM + 128 GB Almacenamiento"` → `ram: "8 GB RAM"`, `almacenamiento: "128 GB Almacenamiento"`.
- `caracteristicas: null` → todas las specs `null`.
- `rating: 5.5` → `rating: 5`; `rating: -1` → `rating: 0`.
- `normalizarTexto("Móviles Cámara")` → `"moviles camara"`.

- [x] **Step 2: Ejecutar las pruebas y verificar el fallo**

Run: `npx vitest run src/data/productoViewModel.test.ts`
Expected: FAIL porque `./productoViewModel` no existe.

- [x] **Step 3: Implementar `src/data/productoViewModel.ts`**

Reglas:

- `normalizarTexto`: `toLowerCase()`, `normalize("NFD")`, quitar diacríticos y recortar.
- `normalizarClave`: `normalizarTexto(clave).replace(/[^a-z0-9]+/g, "_")`.
- Specs: buscar claves normalizadas en este orden:
  - pantalla: `pantalla`, `display`
  - procesador: `procesador`, `cpu`, `chipset`
  - ram: `ram`, `memoria_ram`, `memoria`
  - almacenamiento: `almacenamiento`, `disco`, `storage`
  - camaras: `camaras`, `camara`, `camara_trasera`
  - bateria: `bateria`, `autonomia`, `bateria_carga`
- Si falta RAM o almacenamiento y existe `ram_almacenamiento`, dividir por `+`:
  - la parte que contiene `RAM` alimenta `ram`;
  - la parte que contiene `Almacenamiento` alimenta `almacenamiento`.
- Valores no string/number → `null`; arrays de strings → unirlos con `", "`.
- `marca`: `producto.nombreMarca?.trim() || opciones.nombreMarca?.trim() || "Marca #" + idMarca`.
- `categoria`: `detectarCategoria(producto)`.
- `categoriaEtiqueta`: `ETIQUETAS_CATEGORIA[categoria]`.
- `precioCOP`: `normalizarPrecioCOP(producto.precioReferencia)`.
- `precioFormateado`: `formatearCOP(producto.precioReferencia)`.
- `disponible`: `producto.estado === true`.
- `rating`: si es finito, limitar a `[0, 5]`; si no, `null`.
- `cantidadResenas`: si es finito y `>= 0`, redondear; si no, `null`.
- `caracteristicas`: detectar con heurísticas documentadas:
  - `5g`: `\b5g\b` en texto de búsqueda.
  - `buena-camara`: spec de cámaras con `MP` o texto con `cámara` y `MP`.
  - `alto-rendimiento`: procesador con `snapdragon 8`, `dimensity 9`, `apple a1[7-9]`, `m[2-4]`, `ryzen 7|9`, `core i7|i9`, `ultra 7|9`, o RAM con `>= 8 GB`.
  - `gran-bateria`: `>= 5000 mAh` o `>= 12` horas.
- `textoBusqueda`: concatenar nombre, descripción, marca, categoría, specs y valores string de `caracteristicas`, y normalizar.

- [x] **Step 4: Ejecutar las pruebas y verificar que pasan**

Run: `npx vitest run src/data/productoViewModel.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/data/productoViewModel.ts src/data/productoViewModel.test.ts
git commit -m "feat: add product view model for TecnoReview catalog"
```

---

### Task 4: Filtros, conteos, chips y paginación

**Files:**
- Create: `src/data/catalogo.ts`
- Create: `src/data/catalogo.test.ts`

**Interfaces:**
- Consumes: `ProductoViewModel`, `CaracteristicaClave`, `ETIQUETAS_CATEGORIA` de `./productoViewModel`; `formatearCOP` de `./specsHelper`.
- Produces:

```ts
export interface FiltrosCatalogo {
  busqueda: string;
  categorias: CategoriaDispositivo[];
  marcas: string[];
  precioMin: number;
  precioMax: number;
  caracteristicas: CaracteristicaClave[];
}

export interface RangoPrecio {
  min: number;
  max: number;
}

export interface OpcionConteo<T extends string> {
  valor: T;
  etiqueta: string;
  cantidad: number;
}

export interface CatalogoPreparado {
  productos: ProductoViewModel[];
  categorias: OpcionConteo<CategoriaDispositivo>[];
  marcas: { nombre: string; cantidad: number }[];
  caracteristicas: OpcionConteo<CaracteristicaClave>[];
  rangoPrecio: RangoPrecio;
}

export interface ChipFiltro {
  tipo: "busqueda" | "categoria" | "marca" | "precio" | "caracteristica";
  valor: string;
  etiqueta: string;
}

export interface Pagina<T> {
  items: T[];
  pagina: number;
  totalPaginas: number;
  total: number;
}

export const ETIQUETAS_CARACTERISTICA: Record<CaracteristicaClave, string>;
export function prepararCatalogo(productos: ProductoViewModel[]): CatalogoPreparado;
export function filtrarProductos(
  productos: ProductoViewModel[],
  filtros: FiltrosCatalogo
): ProductoViewModel[];
export function paginar<T>(
  items: T[],
  pagina: number,
  porPagina: number
): Pagina<T>;
export function construirChips(filtros: FiltrosCatalogo): ChipFiltro[];
export function hayFiltrosActivos(
  filtros: FiltrosCatalogo,
  rango: RangoPrecio
): boolean;
```

- [x] **Step 1: Escribir las pruebas que fallan**

`src/data/catalogo.test.ts` debe cubrir:

```ts
it("cuenta categorías, marcas y características")
it("calcula el rango de precios ignorando precios desconocidos")
it("filtra por búsqueda sin acentos ni mayúsculas")
it("filtra por categoría y marca")
it("filtra por rango de precio inclusivo")
it("excluye precios desconocidos cuando hay filtro de precio")
it("filtra por características clave con AND")
it("combina búsqueda, categoría, marca, precio y características")
it("pagina y limita la página al rango válido")
it("construye chips legibles para filtros activos")
it("detecta si hay filtros activos comparando con el rango completo")
```

Datos de prueba: al menos 5 view models con precios `1_000_000`, `2_000_000`, `3_000_000`, `0` y `4_000_000`; categorías `moviles`, `laptops`, `tablets`, `auriculares`; marcas `Samsung`, `Apple`, `Xiaomi`, `Sony`.

- [x] **Step 2: Ejecutar las pruebas y verificar el fallo**

Run: `npx vitest run src/data/catalogo.test.ts`
Expected: FAIL porque `./catalogo` no existe.

- [x] **Step 3: Implementar `src/data/catalogo.ts`**

Reglas:

- `prepararCatalogo`:
  - Categorías en orden fijo `moviles`, `laptops`, `tablets`, `auriculares`, con conteo (incluye 0).
  - Marcas solo presentes, ordenadas por cantidad descendente y luego `localeCompare("es")`.
  - Características en orden fijo `5g`, `buena-camara`, `alto-rendimiento`, `gran-bateria`, con conteo.
  - `rangoPrecio`: mínimo y máximo de `precioCOP > 0`; si no hay, `{ min: 0, max: 0 }`.
- `filtrarProductos`:
  - Búsqueda normalizada con `normalizarTexto`.
  - Categorías y marcas: intersección si el array no está vacío.
  - Precio: inclusivo. Si hay filtro activo (`precioMin > 0` o `precioMax < Number.MAX_SAFE_INTEGER`), excluir `precioCOP === 0`.
  - Características: todas las seleccionadas deben estar presentes (AND).
- `paginar`:
  - `porPagina` mínimo 1.
  - `totalPaginas = Math.max(1, Math.ceil(total / porPagina))`.
  - Clamp de `pagina` a `[1, totalPaginas]`.
  - `items` vacío para lista vacía.
- `construirChips`:
  - Búsqueda: `Búsqueda: <texto>`.
  - Categoría: etiqueta oficial.
  - Marca: nombre de la marca.
  - Precio: `${formatearCOP(min)} - ${formatearCOP(max)}`.
  - Característica: etiqueta oficial.
- `hayFiltrosActivos`: verdadero si hay búsqueda, categorías, marcas, características o si `precioMin > rango.min` o `precioMax < rango.max`.

- [x] **Step 4: Ejecutar las pruebas y verificar que pasan**

Run: `npx vitest run src/data/catalogo.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/data/catalogo.ts src/data/catalogo.test.ts
git commit -m "feat: add catalog filtering and pagination helpers"
```

---

### Task 5: Verificación completa

- [x] **Step 1: Ejecutar toda la suite**

Run: `npm test`
Expected: todos los tests pasan, incluidos los nuevos.

- [x] **Step 2: Ejecutar el build**

Run: `npm run build`
Expected: build exitoso, sin errores de Tailwind ni TypeScript.

- [x] **Step 3: Revisar el diff**

Run: `git status --short` y `git diff --stat`
Expected: solo los archivos del Bloque A; sin cambios en backend, `.env` ni páginas existentes.

- [x] **Step 4: Actualizar el estado del plan**

Marcar las tareas completadas y anotar cualquier desviación en este documento.

- [x] **Step 5: Commit final si queda algún ajuste**

```bash
git add docs/superpowers/plans/2026-10-25-tecnoreview-block-a.md
git commit -m "docs: mark TecnoReview block A progress"
```

---

## Estado de ejecución

- **Fecha:** 2026-10-25
- **Rama:** `feat/tecnoreview-redesign`
- **Pruebas:** 232 pasando en 18 archivos.
- **Build:** `npm run build` exitoso.
- **Commits locales:** tokens y docs, normalización COP, view model, filtros de catálogo.
- **Pendiente:** Bloque B (shell y catálogo).
