# TecReview Bloque C — Inicio editorial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar la home oscura de 1.776 líneas por un inicio claro de TecReview con hero, categorías, presupuesto, ofertas, destacados, rankings, opiniones y CTA de comparador, preservando autenticación Supabase, roles, panel de administración, reseñas y rankings reales.

**Architecture:** `src/app/page.tsx` sigue siendo el orquestador cliente: carga productos, categorías, marcas, rankings y reseñas; sincroniza la sesión; y compone secciones presentacionales en `src/components/home/`. Los productos del inicio se transforman con `construirCatalogo` y se filtran con las funciones puras del Bloque A. El shell del Bloque B (`SiteHeader`, `BottomNav`, `SiteFooter`) envuelve la página; `SiteHeader` acepta un slot para los controles de sesión. Los modales existentes se conservan sin cambios.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, Vitest 3 + Testing Library.

**Spec:** `docs/tecreview-redesign.md`

## Global Constraints

- Paleta oficial únicamente: `#2563EB`, `#0F172A`, `#F3F4F6`, `#E5E7EB`, `#10B981`, `#F59E0B`, `#FFFFFF`, `#64748B`.
- Inter, pesos 400/500/600/700; nada de Doto ni Space Grotesk en componentes nuevos.
- Radios 8–12 px, sombras suaves, iconos outline 1.5–2 px.
- Nada de clases `dark:` en componentes nuevos. La home usa `.theme-tecreview`.
- No modificar backend, `.env` ni base de datos.
- No inventar ratings, precios, especificaciones ni disponibilidad.
- Preservar: auth Supabase, roles, admin, creación de reseñas, rankings reales y fallback de mocks.
- Los commits van en español y no se hace push ni merge.
- Cada tarea termina con pruebas verdes y un commit local.

## Review Focus

- La home debe seguir mostrando “Modo local” cuando la API falla o devuelve `[]`, y “Servidor conectado” cuando responde.
- Los productos sin precio no desaparecen del inicio; muestran “Consultar disponibilidad”.
- El filtro de presupuesto es explícito: por defecto no oculta productos; al activarlo, los productos sin precio quedan fuera.
- La búsqueda prevalece sobre el presupuesto, igual que en la home anterior.
- `matchCatRanking` desaparece junto con el filtro de categoría muerto: las categorías navegan a sus páginas dedicadas.
- Los rankings no inventan datos: error, vacío y carga tienen estados propios.
- Las reseñas conservan el formulario, el filtro y el aviso de login.
- Los enlaces a rutas inexistentes siguen siendo “Próximamente” sin `href`.

---

## File Structure

- Modify: `src/components/SearchBar.tsx` — tokens claros y etiqueta ARIA configurable.
- Modify: `src/components/RankingItem.tsx` — tarjeta de ranking en tema claro.
- Modify: `src/components/catalogo/TarjetaProducto.tsx` — badge opcional de presupuesto.
- Create: `src/components/home/ResumenSesion.tsx` — controles de sesión y rol.
- Create: `src/components/home/CategoriasHome.tsx` — botón “Todos” y enlaces de categoría.
- Create: `src/components/home/PresupuestoHome.tsx` — slider y filtro explícito.
- Create: `src/components/home/OfertasHome.tsx` — ofertas reales con reintento.
- Create: `src/components/home/DestacadosHome.tsx` — grid de productos y estados.
- Create: `src/components/home/RankingsHome.tsx` — mejor valorados, más comentados y más deseados.
- Create: `src/components/home/OpinionesHome.tsx` — formulario y listado de reseñas.
- Create: `src/components/home/CtaComparador.tsx` — CTA de comparador.
- Create: `src/components/home/home.test.tsx` — pruebas de las secciones.
- Create: `src/components/home/ResumenSesion.test.tsx` — pruebas de sesión.
- Modify: `src/components/shell/SiteHeader.tsx` — slot de acciones.
- Modify: `src/components/shell/shell.test.tsx` — prueba del slot.
- Modify: `src/app/page.tsx` — nueva composición y carga de datos.
- Modify: `src/app/page.test.tsx` — pruebas adaptadas a la nueva home.
- Modify: `src/components/catalogo/TarjetaProducto.test.tsx` — badge de presupuesto.

---

### Task 1: Piezas compartidas en tema claro

**Files:**
- Modify: `src/components/SearchBar.tsx`
- Modify: `src/components/RankingItem.tsx`
- Modify: `src/components/catalogo/TarjetaProducto.tsx`
- Modify: `src/components/catalogo/TarjetaProducto.test.tsx`

**Interfaces:**
- `SearchBar` agrega `ariaLabel?: string`; conserva `value`, `onChange` y `placeholder`.
- `TarjetaProducto` agrega `presupuesto?: "dentro" | "fuera" | null`.

- [x] **Step 1: Escribir las pruebas que fallan**

En `TarjetaProducto.test.tsx`:

```ts
it("muestra '✓ En presupuesto' cuando el producto cabe en el límite")
it("muestra 'Supera presupuesto' cuando el producto excede el límite")
it("no muestra badge de presupuesto si no se pasa la prop")
```

- [x] **Step 2: Ejecutar y verificar el fallo**

Run: `npx vitest run src/components/catalogo/TarjetaProducto.test.tsx`
Expected: FAIL por la prop y los textos ausentes.

- [x] **Step 3: Implementar**

`SearchBar`: reemplazar clases slate/blue por tokens (`--color-paper`, `--color-ink`, `--color-subtle`, `--color-hairline`, `--color-brand-blue`), `rounded-lg`, `shadow-[var(--shadow-paper)]`, y `aria-label={ariaLabel ?? "Buscar dispositivos tecnológicos por marca o modelo"}`.

`RankingItem`: reemplazar `border-line`, `bg-surface-*`, `text-white/slate-*` por `--color-hairline`, `--color-paper`, `--color-canvas`, `--color-ink`, `--color-subtle`, `--color-brand-blue` y `--color-star`. Mantener `aria-label={`Ver ficha de ${nombre}`}`, los `alt` y el botón de reintento de imagen.

`TarjetaProducto`: en el pie, junto al precio, renderizar:

```tsx
{producto.presupuesto === "dentro" && (
  <span className="... bg-[var(--color-positive)]/15 text-[var(--color-ink)]">✓ En presupuesto</span>
)}
{producto.presupuesto === "fuera" && (
  <span className="... bg-[var(--color-hairline)] text-[var(--color-subtle)]">Supera presupuesto</span>
)}
```

- [x] **Step 4: Ejecutar y verificar que pasan**

Run: `npx vitest run src/components/catalogo/TarjetaProducto.test.tsx src/components/RankingItem.test.tsx`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/components/SearchBar.tsx src/components/RankingItem.tsx src/components/catalogo/TarjetaProducto.tsx src/components/catalogo/TarjetaProducto.test.tsx
git commit -F <archivo-utf8> # "feat: adaptar buscador, ranking y tarjeta al tema claro"
```

---

### Task 2: Sesión en el encabezado

**Files:**
- Create: `src/components/home/ResumenSesion.tsx`
- Create: `src/components/home/ResumenSesion.test.tsx`
- Modify: `src/components/shell/SiteHeader.tsx`
- Modify: `src/components/shell/shell.test.tsx`

**Interfaces:**

```ts
interface ResumenSesionProps {
  cargando: boolean;
  usuario: UsuarioSesion | null;
  error: string | null;
  esAdmin: boolean;
  esRepresentante: boolean;
  onAbrirAuth: () => void;
  onCerrarSesion: () => void;
  onReintentar: () => void;
  onAbrirAdmin: () => void;
}
```

- [x] **Step 1: Escribir las pruebas que fallan**

`ResumenSesion.test.tsx`:

```ts
it("muestra 'Verificando...' mientras carga la sesión")
it("muestra 'Iniciar sesión' para visitantes")
it("muestra nombre, rol y 'Cerrar sesión' para un usuario")
it("muestra el enlace de administración solo para administradores")
it("muestra el error y permite reintentar")
```

`shell.test.tsx` agrega:

```ts
it("el header renderiza las acciones que recibe")
```

- [x] **Step 2: Ejecutar y verificar el fallo**

Run: `npx vitest run src/components/home/ResumenSesion.test.tsx src/components/shell/shell.test.tsx`
Expected: FAIL por módulo y prop inexistentes.

- [x] **Step 3: Implementar**

`ResumenSesion` replica los textos y roles accesibles de la barra superior anterior:

- `role="alert"` para el error, con botón “Reintentar”.
- `Verificando...` con `aria-live="polite"`.
- Nombre + `• {rol}`; color del punto según admin/representante/usuario.
- Enlace `<a href="#administracion" aria-label="Panel de administración">` solo si `esAdmin`.
- Botón “Cerrar sesión”.
- Botón “Iniciar sesión” con icono de llave.

`SiteHeader` acepta `children?: React.ReactNode` y los renderiza antes del CTA “Explorar catálogo”; el CTA se oculta en móvil (`hidden sm:inline-flex`).

- [x] **Step 4: Ejecutar y verificar que pasan**

Run: `npx vitest run src/components/home/ResumenSesion.test.tsx src/components/shell/shell.test.tsx`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/components/home/ResumenSesion.tsx src/components/home/ResumenSesion.test.tsx src/components/shell/SiteHeader.tsx src/components/shell/shell.test.tsx
git commit -F <archivo-utf8> # "feat: integrar la sesión en el encabezado del inicio"
```

---

### Task 3: Secciones presentacionales del inicio

**Files:**
- Create: `src/components/home/CategoriasHome.tsx`
- Create: `src/components/home/PresupuestoHome.tsx`
- Create: `src/components/home/OfertasHome.tsx`
- Create: `src/components/home/DestacadosHome.tsx`
- Create: `src/components/home/RankingsHome.tsx`
- Create: `src/components/home/OpinionesHome.tsx`
- Create: `src/components/home/CtaComparador.tsx`
- Create: `src/components/home/home.test.tsx`

**Interfaces:**

```ts
CategoriasHome({ onSeleccionarTodos }: { onSeleccionarTodos: () => void })

PresupuestoHome({
  presupuestoMax, onCambiarPresupuesto, totalEnPresupuesto, totalProductos,
  filtrarSolo, onAlternarFiltro,
})

OfertasHome({
  ofertas, cargando, error, onReintentar, mostrarTodas, onAlternar,
  onVerDetalle,
})

DestacadosHome({
  productos, totalVerificados, totalMostrados, cargando, estadoBackend,
  busqueda, filtroPresupuesto, presupuestoMax, limitePresupuestoCOP,
  onVerDetalle, onLimpiarBusqueda, onMostrarTodos,
})

RankingsHome({
  mejorValorados, cargandoMejorValorados, errorMejorValorados, onReintentarMejorValorados,
  mostrarTodosMejorValorados, onAlternarMejorValorados,
  masComentados, cargandoMasComentados, errorMasComentados, onReintentarMasComentados,
  mostrarTodosComentados, onAlternarComentados,
  masDeseados, cargandoMasDeseados, errorMasDeseados, onReintentarMasDeseados,
  onVerDetalle,
})

OpinionesHome({
  usuario, resenas, resenasFiltradas, cargando, filtro, onCambiarFiltro,
  onActualizar, comentario, onCambiarComentario, idProducto, onCambiarProducto,
  productos, enviando, error, onPublicar, onPedirLogin,
})

CtaComparador()
```

- [x] **Step 1: Escribir las pruebas que fallan**

`home.test.tsx`:

```ts
it("CategoriasHome muestra 'Todos' y las cuatro categorías navegables")
it("PresupuestoHome mueve el slider y alterna el filtro")
it("DestacadosHome muestra el estado de carga y el estado vacío de búsqueda")
it("DestacadosHome muestra tarjetas con el badge de presupuesto")
it("OfertasHome muestra la oferta, el descuento y el reintento")
it("RankingsHome muestra los tres rankings y sus estados vacíos")
it("OpinionesHome muestra el aviso de login y el formulario")
it("CtaComparador enlaza al catálogo y marca el comparador como próximamente")
```

- [x] **Step 2: Ejecutar y verificar el fallo**

Run: `npx vitest run src/components/home/home.test.tsx`
Expected: FAIL por módulos inexistentes.

- [x] **Step 3: Implementar las secciones**

Reglas visuales y de contenido:

- Todas usan tokens oficiales y `rounded-lg`/`rounded-md`.
- `CategoriasHome`: `role="group" aria-label="Explorar por categoría"`, botón “Todos” y enlaces de `CATEGORIAS_NAVEGABLES`.
- `PresupuestoHome`: `aria-label="Ajustar presupuesto máximo en pesos colombianos"`, mínimo 50, máximo 1500, paso 25; toggle con `aria-pressed`; texto “X de Y dentro del presupuesto”.
- `OfertasHome`: conserva “Ofertas destacadas”, “Reintentar ofertas”, “No hay ofertas coincidentes con este filtro.”, “Ver todas las ofertas disponibles”/“Ocultar ofertas adicionales”, `-{porcentaje}%`, ahorro y precios.
- `DestacadosHome`: conserva “Cargando catálogo de dispositivos...”, “Servidor conectado”/“Modo local”, “N productos verificados en la plataforma • M mostrados”, los tres estados vacíos y sus botones.
- `RankingsHome`: conserva “Mejor valorados”, “Más comentados”, “Los más deseados”, “Ver lista completa”, “Reintentar valoraciones/comentarios/deseos” y los textos de vacío.
- `OpinionesHome`: conserva “Opiniones de la comunidad (N)”, “Actualizar”, “Filtrar opiniones de la comunidad”, el aviso de login, “Escribe tu opinión”, “Publicar opinión” y el listado.
- `CtaComparador`: enlace “Explorar catálogo” a `/productos`; texto “Ir al comparador” con `aria-disabled="true"`, `title="Próximamente"` y sin `href`.

- [x] **Step 4: Ejecutar y verificar que pasan**

Run: `npx vitest run src/components/home/home.test.tsx`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/components/home
git commit -F <archivo-utf8> # "feat: construir las secciones del inicio de TecReview"
```

---

### Task 4: Nueva home en `/`

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/page.test.tsx`

**Interfaces:**
- `Home` conserva los estados y efectos de auth, rankings, ofertas, reseñas y modales.
- Nuevos estados: `categoriasApi`, `marcasApi`.
- Nuevas derivadas: `vistas`, `productosFiltrados`, `limitePresupuestoCOP`.

- [x] **Step 1: Escribir/adaptar las pruebas que fallan**

En `page.test.tsx`:

- Añadir `vi.mock("next/navigation", () => ({ usePathname: () => "/" }))`.
- Quitar los clics en “Catálogo general”; la grid de destacados es visible por defecto.
- Mantener las pruebas de auth, roles, reseñas y rankings sin cambios de texto.
- Reescribir las pruebas del catálogo general como pruebas de destacados, búsqueda y presupuesto:

```ts
it("muestra los productos del backend y 'Servidor conectado'")
it("cae a PRODUCTOS_MOCK y muestra 'Modo local' ante error o lista vacía")
it("muestra 'Supera presupuesto' y '✓ En presupuesto' con el límite por defecto")
it("la búsqueda localiza un producto aunque supere el presupuesto")
it("muestra el estado vacío de búsqueda y permite limpiarla")
it("el filtro explícito de presupuesto oculta los productos que lo superan")
it("el contador distingue productos verificados de productos mostrados")
```

- [x] **Step 2: Ejecutar y verificar el fallo**

Run: `npx vitest run src/app/page.test.tsx`
Expected: FAIL por la estructura anterior.

- [x] **Step 3: Implementar la nueva home**

Estructura:

```tsx
<div className="theme-tecreview flex min-h-screen flex-col">
  <SiteHeader><ResumenSesion ... /></SiteHeader>
  <main className="flex-1 pb-20 md:pb-0">
    <section hero> ... SearchBar, CategoriasHome, PresupuestoHome, OfertasHome ... </section>
    <DestacadosHome ... />
    <RankingsHome ... />
    <OpinionesHome ... />
    <CtaComparador />
  </main>
  <SiteFooter />
  <BottomNav />
  <AuthModal ... />
  <FichaTecnicaModal ... />
  <AdminPanelModal ... />
</div>
```

Carga de datos:

```ts
Promise.all([obtenerProductos<Producto>(), obtenerCategorias(), obtenerMarcas()])
```

Fallback: si `obtenerProductos` falla o devuelve `[]`, usar `PRODUCTOS_MOCK` y `estadoBackend = "offline"`.

Filtros del inicio:

```ts
const filtros: FiltrosCatalogo = {
  busqueda,
  categorias: [],
  marcas: [],
  precioMin: 0,
  precioMax:
    filtrarSoloEnPresupuesto && !busqueda.trim()
      ? limitePresupuestoCOP
      : Number.MAX_SAFE_INTEGER,
  caracteristicas: [],
};
const productosFiltrados = filtrarProductos(vistas, filtros);
```

Presupuesto: `limitePresupuestoCOP = normalizarPrecioCOP(presupuestoMax)`.

Rankings: filtrar por búsqueda y presupuesto explícito; sin filtro de categoría. Si el precio es `null`, se conserva. La búsqueda prevalece sobre el presupuesto.

`abrirDetalle(vista)` busca el `Producto` original por `idProducto` y abre `FichaTecnicaModal`.

`verFichaRanking(item)` conserva la conversión a `Producto` de la home anterior.

- [x] **Step 4: Ejecutar y verificar que pasan**

Run: `npx vitest run src/app/page.test.tsx`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/app/page.tsx src/app/page.test.tsx
git commit -F <archivo-utf8> # "feat: rediseñar el inicio de TecReview"
```

---

### Task 5: Verificación y documentación

- [x] **Step 1: Suite completa**

Run: `npm test`
Expected: todas las pruebas pasan.

- [x] **Step 2: Build**

Run: `npm run build`
Expected: exit 0; `/` presente.

- [x] **Step 3: Lint**

Run: `npm run lint`
Expected: sin errores.

- [x] **Step 4: Rutas**

Run: `Invoke-WebRequest http://localhost:3000/`, `/productos`, `/debug/productos`
Expected: 200.

- [x] **Step 5: Revisar diff**

Run: `git status --short` y `git diff --stat`
Expected: solo archivos del Bloque C; sin backend, `.env` ni base de datos.

- [x] **Step 6: Documentación**

Actualizar `docs/tecreview-redesign.md` con el estado del Bloque C, criterios de aceptación y desviaciones. Marcar este plan.

- [x] **Step 7: Commit**

```bash
git add docs
git commit -F <archivo-utf8> # "docs: registrar el avance del bloque C"
```

---

**Estado:** Bloque C completado el 2026-10-25 en `feat/tecreview-redesign`.
Suite: 288 pruebas en 25 archivos; build y lint exitosos; `/`, `/productos` y
`/debug/productos` responden 200. Todos los commits permanecen locales, sin
push ni merge.
