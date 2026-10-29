# TecReview Bloques D y E — Detalle y comparador Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Implementar la ruta real de detalle `/productos/[id]` y el comparador `/comparador`, preservando auth Supabase, roles, reseñas, valoraciones y datos reales de la API.

**Architecture:** La ruta dinámica resuelve `params` en un Server Component y entrega el id a un cliente orquestador. El detalle reutiliza `obtenerProductoPorId`, `normalizarFichaProducto`, `obtenerValoracionStats`, `obtenerResenas` y los endpoints de escritura existentes. El comparador persiste ids en `localStorage`, usa funciones puras para tabla/diferencias/recomendación y se alimenta del catálogo real. La sesión se extrae a un hook reutilizable y la home deja de abrir `FichaTecnicaModal` para navegar a la nueva ruta.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, Vitest 3 + Testing Library.

**Spec:** `docs/tecreview-redesign.md`

**Estado:** Completado el 2026-10-25. Verificación final en
`docs/tecreview-redesign.md` §8.2, §8.3 y §11.

## Global Constraints

- Paleta oficial únicamente: `#2563EB`, `#0F172A`, `#F3F4F6`, `#E5E7EB`, `#10B981`, `#F59E0B`, `#FFFFFF`, `#64748B`.
- Inter, pesos 400/500/600/700; nada de Doto ni Space Grotesk en componentes nuevos.
- Radios 8–12 px, sombras suaves, iconos outline 1.5–2 px.
- Nada de clases `dark:` en componentes nuevos. Las vistas nuevas usan `.theme-tecreview`.
- No modificar backend, `.env` ni base de datos.
- No inventar ratings, precios, especificaciones, disponibilidad ni ganadores.
- Preservar auth Supabase, roles, admin, creación de reseñas y valoraciones.
- Los commits van en español y no se hace push ni merge.
- Cada tarea termina con pruebas verdes y un commit local.

## Review Focus

- El detalle debe mostrar 404 limpio para ids inexistentes y un error con reintento para fallos de red.
- Las especificaciones se muestran solo si existen; si no, estado vacío sin datos inventados.
- Valorar y reseñar exige login y abre `AuthModal`; el formulario conserva el filtro de lenguaje soez.
- El comparador admite máximo 4 productos, no duplica ids y persiste entre recargas.
- La recomendación es una sugerencia derivada de disponibilidad, precio y cantidad de especificaciones; nunca se presenta como calificación editorial.
- La tabla marca diferencias reales y permite ocultar las filas iguales.
- La home, el catálogo y las categorías navegan a `/productos/[id]`; `FichaTecnicaModal` deja de ser el detalle principal.
- Header, bottom nav y CTA de la home enlazan a `/comparador`.

---

## File Structure

- Create: `src/hooks/useSesionTecReview.ts` — sincronización de sesión y perfil reutilizable.
- Create: `src/hooks/useComparador.ts` — estado persistente del comparador.
- Create: `src/data/comparador.ts` — ids, filas, diferencias y recomendación.
- Create: `src/data/comparador.test.ts` — pruebas puras del comparador.
- Create: `src/data/resenas.ts` — validación compartida de lenguaje no permitido.
- Create: `src/components/shell/AppShell.tsx` — shell claro compartido por rutas internas.
- Create: `src/app/productos/[id]/page.tsx` — ruta dinámica del detalle.
- Create: `src/app/productos/[id]/DetalleProductoCliente.tsx` — carga y composición del detalle.
- Create: `src/app/productos/[id]/DetalleProductoCliente.test.tsx` — pruebas del detalle.
- Create: `src/components/detalle/EspecificacionesProducto.tsx` — secciones y métricas reales.
- Create: `src/components/detalle/ValoracionProducto.tsx` — estrellas, promedio y formulario.
- Create: `src/components/detalle/OpinionesProducto.tsx` — formulario y listado de reseñas.
- Create: `src/components/detalle/BotonComparador.tsx` — agregar/quitar del comparador.
- Create: `src/app/comparador/layout.tsx` — shell del comparador.
- Create: `src/app/comparador/page.tsx` — metadatos de la ruta.
- Create: `src/app/comparador/ComparadorCliente.tsx` — selector, tabla y recomendación.
- Create: `src/app/comparador/ComparadorCliente.test.tsx` — pruebas del comparador.
- Modify: `src/app/page.tsx` — usar hook de sesión y navegar al detalle.
- Modify: `src/app/page.test.tsx` — navegación en lugar de modal.
- Modify: `src/components/catalogo/CatalogoCliente.tsx` — navegar al detalle.
- Modify: `src/components/catalogo/CatalogoCliente.test.tsx` — mock de router y prueba de navegación.
- Modify: `src/app/categorias/[slug]/CategoriaPageContent.tsx` — navegar al detalle.
- Modify: `src/app/categorias/[slug]/CategoriaPageContent.test.tsx` — mock de router.
- Modify: `src/components/shell/SiteHeader.tsx` — enlace a `/comparador`.
- Modify: `src/components/shell/BottomNav.tsx` — enlace a `/comparador`.
- Modify: `src/components/shell/shell.test.tsx` — enlaces disponibles.
- Modify: `src/components/home/CtaComparador.tsx` — enlace real.
- Modify: `src/components/home/home.test.tsx` — CTA real.
- Modify: `src/app/productos/layout.tsx` — usar `AppShell`.
- Modify: `src/components/catalogo/RatingStars.tsx` — etiqueta de cantidad configurable.
- Modify: `src/components/ProductImagePlaceholder.tsx` — variante clara opcional.
- Modify: `docs/tecreview-redesign.md` — estado y criterios D/E.

---

### Task 1: Datos puros del comparador

**Files:**
- Create: `src/data/comparador.ts`
- Create: `src/data/comparador.test.ts`

**Interfaces:**
- `MAX_COMPARADOR = 4`
- `CLAVE_COMPARADOR = "tecreview:comparador"`
- `normalizarIdsComparador(valor: unknown): number[]`
- `leerIdsComparador(storage: Pick<Storage, "getItem"> | null): number[]`
- `guardarIdsComparador(storage: Pick<Storage, "setItem"> | null, ids: number[]): void`
- `agregarIdComparador(ids: number[], id: number): { ids: number[]; agregado: boolean; motivo: "agregado" | "duplicado" | "lleno" | "invalido" }`
- `quitarIdComparador(ids: number[], id: number): number[]`
- `construirFilasComparacion(productos: ProductoViewModel[]): FilaComparacion[]`
- `generarRecomendacion(productos: ProductoViewModel[]): ResultadoRecomendacion`

- [x] **Step 1: Escribir las pruebas que fallan**

Casos mínimos:

```ts
it("normaliza ids válidos, elimina duplicados y respeta el máximo de 4")
it("agrega un id nuevo, detecta duplicados y rechaza el quinto producto")
it("lee y guarda ids en un storage tolerante a JSON inválido")
it("construye filas de precio, disponibilidad, marca y especificaciones")
it("marca como diferencia una fila con valores distintos y no una fila igual")
it("recomienda un producto disponible frente a uno no disponible")
it("recomienda el menor precio cuando ambos están disponibles")
it("no inventa un ganador cuando hay empate técnico")
it("no recomienda si ninguno tiene disponibilidad confirmada")
```

- [x] **Step 2: Ejecutar y verificar el fallo**

Run: `npx vitest run src/data/comparador.test.ts`
Expected: FAIL porque el módulo no existe.

- [x] **Step 3: Implementar**

Reglas:
- Los ids deben ser enteros positivos.
- La recomendación descarta primero los no disponibles.
- Solo compara precio si todos los candidatos tienen `precioCOP > 0`.
- Solo compara especificaciones después del precio y cuenta los 6 campos no nulos.
- Si queda más de un candidato, devuelve `idProducto: null` con un mensaje de empate.
- Si ninguno está disponible, devuelve `idProducto: null` y un mensaje explícito.
- `construirFilasComparacion` devuelve valores `null` para datos ausentes; la UI los muestra como "Sin dato".

- [x] **Step 4: Ejecutar y verificar que pasan**

Run: `npx vitest run src/data/comparador.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/data/comparador.ts src/data/comparador.test.ts
git commit -F <archivo-utf8> # "feat: agregar la lógica de comparación de productos"
```

---

### Task 2: Hook persistente del comparador

**Files:**
- Create: `src/hooks/useComparador.ts`
- Create: `src/hooks/useComparador.test.tsx`

**Interfaces:**
- `useComparador(): { ids, hidratado, agregar, quitar, limpiar, contiene }`
- `agregar(id: number)` devuelve el resultado de `agregarIdComparador`.

- [x] **Step 1: Escribir las pruebas que fallan**

Casos mínimos:

```ts
it("hidrata los ids desde localStorage")
it("persiste un id agregado y lo expone en el estado")
it("no persiste duplicados ni supera el máximo")
it("quita un id y limpia la selección")
it("sincroniza cambios de otra pestaña con el evento storage")
```

- [x] **Step 2: Ejecutar y verificar el fallo**

Run: `npx vitest run src/hooks/useComparador.test.tsx`
Expected: FAIL porque el hook no existe.

- [x] **Step 3: Implementar**

El hook usa `useRef` para evitar estados obsoletos en clics rápidos, `useEffect` para hidratar y escuchar `storage`, y guarda con `guardarIdsComparador`. No accede a `window` durante SSR.

- [x] **Step 4: Ejecutar y verificar que pasan**

Run: `npx vitest run src/hooks/useComparador.test.tsx`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/hooks/useComparador.ts src/hooks/useComparador.test.tsx
git commit -F <archivo-utf8> # "feat: persistir la selección del comparador"
```

---

### Task 3: Sesión reutilizable

**Files:**
- Create: `src/hooks/useSesionTecReview.ts`
- Modify: `src/app/page.tsx`

**Interfaces:**
- `useSesionTecReview(): { usuario, cargando, error, establecerUsuario, cerrarSesion, reintentar }`

- [x] **Step 1: Extraer la lógica existente**

Mover a `useSesionTecReview` la sincronización de Supabase Auth, el aprovisionamiento con `obtenerMiPerfil`, la revocación local ante 401/403/409, `cerrarSesion` y `reintentar`, conservando el comportamiento actual de la home.

- [x] **Step 2: Adaptar la home sin cambiar su comportamiento**

Sustituir el bloque de auth de `src/app/page.tsx` por el hook. `onLoginSuccess` llama `establecerUsuario`. El resto de la home no cambia.

- [x] **Step 3: Ejecutar las pruebas de la home**

Run: `npx vitest run src/app/page.test.tsx`
Expected: PASS con las mismas pruebas de sesión, roles y logout.

- [x] **Step 4: Commit**

```bash
git add src/hooks/useSesionTecReview.ts src/app/page.tsx
git commit -F <archivo-utf8> # "refactor: reutilizar la sincronización de sesión"
```

---

### Task 4: Ruta y vista de detalle

**Files:**
- Create: `src/app/productos/[id]/page.tsx`
- Create: `src/app/productos/[id]/DetalleProductoCliente.tsx`
- Create: `src/components/detalle/EspecificacionesProducto.tsx`
- Create: `src/components/detalle/ValoracionProducto.tsx`
- Create: `src/components/detalle/OpinionesProducto.tsx`
- Create: `src/components/detalle/BotonComparador.tsx`
- Create: `src/data/resenas.ts`
- Create: `src/app/productos/[id]/DetalleProductoCliente.test.tsx`
- Modify: `src/components/catalogo/RatingStars.tsx`
- Modify: `src/components/ProductImagePlaceholder.tsx`

**Interfaces:**
- `DetalleProductoCliente({ idProducto }: { idProducto: number })`
- `EspecificacionesProducto({ producto }: { producto: Producto })`
- `ValoracionProducto({ idProducto, usuario, onPedirLogin }: ...)`
- `OpinionesProducto({ idProducto, nombreProducto, usuario, onPedirLogin }: ...)`
- `BotonComparador({ idProducto, nombreProducto }: ...)`

- [x] **Step 1: Escribir las pruebas que fallan**

Casos mínimos:

```ts
it("muestra el estado de carga")
it("muestra un 404 accesible si el producto no existe")
it("muestra un error con reintento si la API falla")
it("renderiza nombre, marca, categoría, precio y disponibilidad reales")
it("muestra las especificaciones normalizadas y un vacío si no hay datos")
it("muestra el promedio real de valoraciones y las reseñas del producto")
it("abre AuthModal al intentar valorar o reseñar sin sesión")
it("agrega el producto al comparador y permite quitarlo")
```

- [x] **Step 2: Ejecutar y verificar el fallo**

Run: `npx vitest run "src/app/productos/[id]/DetalleProductoCliente.test.tsx"`
Expected: FAIL porque la vista no existe.

- [x] **Step 3: Implementar la ruta**

`page.tsx` resuelve `params` como `Promise`, valida que el id sea entero positivo y llama `notFound()` si no lo es. Exporta metadatos estáticos y renderiza el cliente.

- [x] **Step 4: Implementar la carga**

`DetalleProductoCliente` carga en paralelo producto, categorías, marcas, estadísticas y reseñas. Enriquece `nombreCategoria`/`nombreMarca`. Distingue 404 de error de red. Las reseñas y estadísticas pueden fallar sin ocultar el producto.

- [x] **Step 5: Implementar la composición visual**

- Imagen o `ProductImagePlaceholder` en variante clara.
- Nombre, marca, categoría, descripción, precio, disponibilidad y promedio.
- `BotonComparador`.
- Pestañas accesibles "Especificaciones" y "Opiniones (n)".
- Especificaciones con `normalizarFichaProducto`; sin datos, estado vacío.
- Valoración con estrellas y formulario; sin sesión, CTA a `AuthModal`.
- Reseñas con formulario, filtro de palabras no permitidas, lista y estado vacío.
- `AuthModal` se monta en el cliente y actualiza la sesión.

- [x] **Step 6: Ejecutar y verificar que pasan**

Run: `npx vitest run "src/app/productos/[id]/DetalleProductoCliente.test.tsx"`
Expected: PASS.

- [x] **Step 7: Commit**

```bash
git add "src/app/productos/[id]" src/components/detalle src/data/resenas.ts src/components/catalogo/RatingStars.tsx src/components/ProductImagePlaceholder.tsx
git commit -F <archivo-utf8> # "feat: crear la página de detalle de producto"
```

---

### Task 5: Navegación al detalle desde las vistas existentes

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/page.test.tsx`
- Modify: `src/components/catalogo/CatalogoCliente.tsx`
- Modify: `src/components/catalogo/CatalogoCliente.test.tsx`
- Modify: `src/app/categorias/[slug]/CategoriaPageContent.tsx`
- Modify: `src/app/categorias/[slug]/CategoriaPageContent.test.tsx`

- [x] **Step 1: Escribir las pruebas que fallan**

- Home: al pulsar "Ver ficha de ..." se llama `router.push("/productos/204")`.
- Catálogo: al pulsar "Ver detalle" se navega al id real.
- Categoría: al pulsar el detalle se navega al id real.

- [x] **Step 2: Ejecutar y verificar el fallo**

Run: `npx vitest run src/app/page.test.tsx src/components/catalogo/CatalogoCliente.test.tsx "src/app/categorias/[slug]/CategoriaPageContent.test.tsx"`
Expected: FAIL porque todavía se abre el modal.

- [x] **Step 3: Implementar**

Sustituir el estado `productoSeleccionado`, los imports y el render de `FichaTecnicaModal` por `useRouter().push(`/productos/${id}`)`. En la home eliminar el modal y sus callbacks. Mantener las firmas `onVerDetalle` de las secciones.

- [x] **Step 4: Ejecutar y verificar que pasan**

Run: `npx vitest run src/app/page.test.tsx src/components/catalogo/CatalogoCliente.test.tsx "src/app/categorias/[slug]/CategoriaPageContent.test.tsx"`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/app/page.tsx src/app/page.test.tsx src/components/catalogo/CatalogoCliente.tsx src/components/catalogo/CatalogoCliente.test.tsx "src/app/categorias/[slug]"
git commit -F <archivo-utf8> # "feat: navegar al detalle real de los productos"
```

---

### Task 6: Página del comparador

**Files:**
- Create: `src/components/shell/AppShell.tsx`
- Create: `src/app/comparador/layout.tsx`
- Create: `src/app/comparador/page.tsx`
- Create: `src/app/comparador/ComparadorCliente.tsx`
- Create: `src/app/comparador/ComparadorCliente.test.tsx`
- Modify: `src/app/productos/layout.tsx`

**Interfaces:**
- `ComparadorCliente()` carga el catálogo real, usa `useComparador`, `construirFilasComparacion` y `generarRecomendacion`.

- [x] **Step 1: Escribir las pruebas que fallan**

Casos mínimos:

```ts
it("muestra el estado vacío y el selector cuando no hay productos")
it("agrega un producto desde el selector y lo muestra en la tabla")
it("impide superar 4 productos y avisa del límite")
it("quita un producto de la tabla")
it("marca las diferencias y permite ocultar filas iguales")
it("muestra la recomendación derivada y su carácter informativo")
it("muestra un estado de error si el catálogo no carga")
```

- [x] **Step 2: Ejecutar y verificar el fallo**

Run: `npx vitest run src/app/comparador/ComparadorCliente.test.tsx`
Expected: FAIL porque la página no existe.

- [x] **Step 3: Implementar el shell**

`AppShell` compone `SiteHeader`, contenido con `pb-20 md:pb-0`, `SiteFooter` y `BottomNav` dentro de `.theme-tecreview`. `productos/layout.tsx` y `comparador/layout.tsx` lo usan.

- [x] **Step 4: Implementar la página**

- Cargar productos, categorías y marcas en paralelo.
- Construir view models con `construirCatalogo`.
- Selector con búsqueda, límite de 4 y aviso accesible.
- Tabla responsive con columnas por producto y filas por característica.
- Fila resaltada si `difiere`; checkbox "Solo diferencias".
- Botón quitar por producto y "Vaciar comparador".
- Tarjeta de recomendación con motivos y aviso de que no es una calificación editorial.
- Enlaces al detalle de cada producto.

- [x] **Step 5: Ejecutar y verificar que pasan**

Run: `npx vitest run src/app/comparador/ComparadorCliente.test.tsx`
Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add src/components/shell/AppShell.tsx src/app/comparador src/app/productos/layout.tsx
git commit -F <archivo-utf8> # "feat: construir el comparador de productos"
```

---

### Task 7: Enlaces de navegación al comparador

**Files:**
- Modify: `src/components/shell/SiteHeader.tsx`
- Modify: `src/components/shell/BottomNav.tsx`
- Modify: `src/components/shell/shell.test.tsx`
- Modify: `src/components/home/CtaComparador.tsx`
- Modify: `src/components/home/home.test.tsx`

- [x] **Step 1: Escribir las pruebas que fallan**

- Header: "Comparador" es un enlace a `/comparador`; Reseñas y Blog siguen como próximamente.
- Bottom nav: "Comparador" es un enlace a `/comparador`; Perfil sigue deshabilitado.
- CTA: "Ir al comparador" es un enlace a `/comparador`.

- [x] **Step 2: Ejecutar y verificar el fallo**

Run: `npx vitest run src/components/shell/shell.test.tsx src/components/home/home.test.tsx`
Expected: FAIL porque siguen deshabilitados.

- [x] **Step 3: Implementar**

Añadir `href: "/comparador"` en header y bottom nav. Convertir el `span` del CTA en `Link`. Mantener el resto de rutas futuras sin `href`.

- [x] **Step 4: Ejecutar y verificar que pasan**

Run: `npx vitest run src/components/shell/shell.test.tsx src/components/home/home.test.tsx`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/components/shell/SiteHeader.tsx src/components/shell/BottomNav.tsx src/components/shell/shell.test.tsx src/components/home/CtaComparador.tsx src/components/home/home.test.tsx
git commit -F <archivo-utf8> # "feat: enlazar la navegación al comparador"
```

---

### Task 8: Verificación y documentación

**Files:**
- Modify: `docs/tecreview-redesign.md`
- Modify: `docs/superpowers/plans/2026-10-25-tecreview-blocks-d-e.md`

- [x] **Step 1: Actualizar la documentación**

Marcar Bloques D y E como completados, registrar rutas, componentes, decisiones (localStorage, máximo 4, recomendación informativa), criterios de aceptación y pendientes del Bloque F.

- [x] **Step 2: Ejecutar la suite completa**

Run: `npm test`
Expected: todas las pruebas pasan.

- [x] **Step 3: Ejecutar build y lint**

Run: `npm run build`
Run: `npm run lint`
Expected: ambos sin errores.

- [x] **Step 4: Comprobar rutas**

Con los servidores activos, verificar que `/`, `/productos`, `/productos/24` (primer id real), `/comparador` y `/debug/productos` responden 200.

- [x] **Step 5: Revisar el diff**

Run: `git status`
Run: `git diff`
Expected: solo archivos del plan; sin `.env`, backend ni base de datos.

- [x] **Step 6: Commit**

```bash
git add docs/tecreview-redesign.md docs/superpowers/plans/2026-10-25-tecreview-blocks-d-e.md
git commit -F <archivo-utf8> # "docs: registrar el avance de los bloques D y E"
```

---

## Pendiente después de este plan

- **Bloque F:** reseñas, blog, favoritos, perfil, responsive final, accesibilidad, retiro de `dark`, Doto y Space Grotesk, y migración visual de categorías.
