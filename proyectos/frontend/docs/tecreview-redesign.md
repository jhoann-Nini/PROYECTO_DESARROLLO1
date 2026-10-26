# TecReview — Especificación de rediseño

**Estado:** Bloques A, B, C, D y E completados; pendiente el Bloque F (reseñas, blog, favoritos, perfil y cierre visual).
**Marca:** TecReview (marca única del proyecto).
**Tagline:** Compara · Analiza · Decide.
**Rama:** `feat/tecreview-redesign` (creada desde `adrian`).

---

## 1. Objetivo

Rediseñar la plataforma con un tema claro, una identidad única y seis vistas
principales: header, home, catálogo, detalle, comparador y experiencia móvil.
Se conserva la funcionalidad existente: autenticación Supabase, roles,
creación de reseñas, consumo de la API real y fallback de mocks.

El rediseño se ejecuta por bloques para no romper la aplicación a mitad de
camino. Este documento es la fuente de verdad visual y funcional.

---

## 2. Sistema de diseño oficial

### 2.1 Paleta

| Token semántico | Valor | Uso |
|---|---|---|
| `--color-brand-blue` | `#2563EB` | CTA, enlaces, acciones |
| `--color-ink` | `#0F172A` | Navbar, headings, texto principal |
| `--color-canvas` | `#F3F4F6` | Fondo de página |
| `--color-hairline` | `#E5E7EB` | Bordes suaves |
| `--color-positive` | `#10B981` | Disponibilidad y tags positivas |
| `--color-star` | `#F59E0B` | Estrellas y ratings |
| `--color-paper` | `#FFFFFF` | Cards y modales |
| `--color-subtle` | `#64748B` | Texto secundario |

No se inventan colores principales nuevos. Los estados hover, focus y error
se resuelven con opacidad, con `#0F172A` o con `#2563EB`; si más adelante se
necesita un tono derivado, se documenta y se aprueba antes de usarlo.

### 2.2 Tipografía

- **Inter** como única familia, con pesos 400, 500, 600 y 700.
- Se retiran Doto y Space Grotesk del diseño nuevo.
- La escala mantiene jerarquías claras; los headings usan el mismo sans-serif.

### 2.3 Radios, sombras e iconos

- Radios de 8 px a 12 px (`rounded-sm` a `rounded-lg` en el tema actual).
- Sombras suaves derivadas de `rgba(15, 23, 42, ...)`.
- Iconos SVG outline con trazo uniforme de 1.5 px o 2 px.
- Foco visible de 2 px con `#2563EB` y offset de 2 px.

### 2.4 Accesibilidad de la paleta

- Sobre `#10B981` se usa texto `#0F172A`; blanco sobre verde no alcanza AA.
- Las estrellas `#F59E0B` se acompañan de contorno oscuro y del valor numérico.
- `#64748B` se usa sobre blanco para texto normal; sobre `#F3F4F6` se reserva
  para textos grandes o secundarios de bajo énfasis.
- Tabs, sliders y bottom nav deben funcionar con teclado y tener etiquetas ARIA.

---

## 3. Rutas

| Ruta | Vista | Estado |
|---|---|---|
| `/` | Home editorial | Implementada en Bloque C |
| `/productos` | Catálogo con filtros | Implementada en Bloque B |
| `/productos/[id]` | Detalle de producto | Implementada en Bloque D |
| `/comparador` | Comparador | Implementada en Bloque E |
| `/resenas` | Reseñas de la comunidad | Pendiente, Bloque F |
| `/blog` | Blog editorial | Pendiente, Bloque F |
| `/favoritos` | Favoritos | Pendiente, Bloque F |
| `/perfil` | Perfil de usuario | Pendiente, Bloque F |
| `/debug/productos` | Inspector de API actual | Implementada y preservada desde el Bloque B |

El header enlaza a Inicio, Productos y Comparador; Reseñas y Blog siguen como
“Próximamente”. El bottom nav móvil enlaza a Inicio, Catálogo y Comparador;
Perfil sigue como “Próximamente”.

---

## 4. Componentes

- **Shell:** `AppShell`, `SiteHeader`, `SiteFooter`, `BottomNav`, `SearchBar`.
- **Home:** `CategoriasHome`, `DestacadosHome`, `RankingsHome`, `OfertasHome`,
  `PresupuestoHome`, `OpinionesHome`, `ResumenSesion`, `CtaComparador`.
- **Catálogo:** `CatalogoCliente`, `TarjetaProducto`, `FichaTecnicaModal`
  (conservado como ficha secundaria), `ProductCard` (categorías heredadas).
- **Detalle:** `DetalleProductoCliente`, `EspecificacionesProducto`,
  `ValoracionProducto`, `OpinionesProducto`, `BotonComparador`.
- **Comparador:** `ComparadorCliente` con selector, tabla, diferencias y
  sugerencia derivada.
- **Comunes:** `RatingStars`, `ProductImagePlaceholder`, `AuthModal`.

Los componentes nuevos usan exclusivamente los tokens semánticos oficiales.
La nomenclatura real prioriza nombres en español; las piezas del plan que no se
crearon con nombre propio quedaron integradas en los componentes anteriores.

---

## 5. Datos

- La API real devuelve 80 productos. No hay paginación de servidor.
- `Producto` no incluye rating agregado ni cantidad de reseñas. El view model
  acepta esos valores como opcionales; si no existen, la UI muestra
  “Sin reseñas” en lugar de inventar estrellas.
- `estado` determina la disponibilidad.
- `caracteristicas` es JSON libre. El view model extrae especificaciones clave
  y devuelve `null` cuando no hay dato; no inventa valores.
- Precios: los valores menores a 10.000 se tratan como legado en USD y se
  convierten a COP con tasa 4.000. Los demás se consideran COP. Esta regla se
  centraliza en `src/data/precios.ts` y se eliminará cuando todos los datos
  estén normalizados.
- El comparador se persiste en `localStorage` y no requiere backend. Guarda
  máximo 4 ids en `tecreview:comparador`. Favoritos se definirá en el Bloque F
  con el mismo enfoque local, salvo que el backend aporte persistencia.
- El detalle consume `obtenerProductoPorId`, `obtenerCategorias`,
  `obtenerMarcas`, `obtenerValoracionStats`, `obtenerResenas`,
  `obtenerMiValoracion`, `crearValoracion` y `crearResena`.
- Las especificaciones del detalle se normalizan con `normalizarFichaProducto`.
  Si no hay datos, se muestra un estado vacío; no se rellenan specs.
- La valoración comunitaria usa el promedio y la cantidad reales de
  `/api/productos/{id}/valoracion-stats`. Las estrellas y el texto de la
  reseña son fuentes distintas: una reseña no implica una valoración.
- La sugerencia del comparador se deriva de disponibilidad, precio de
  referencia y cantidad de especificaciones registradas. No declara un ganador
  absoluto ni una calificación editorial.
- Reseñas: se consumen las existentes. “Compra verificada” no está modelada;
  se omite hasta que el backend la aporte.
- Blog: contenido estático o mock aprobado; no se inventan endpoints.
- Imágenes: se usa la imagen disponible y `ProductImagePlaceholder` como
  fallback. La galería multi-imagen queda pendiente de datos reales.

---

## 6. Estrategia de convivencia

1. Se agregan los tokens nuevos junto a los actuales, sin borrar el tema oscuro.
2. Las páginas nuevas usan `.theme-tecreview` y los tokens semánticos.
3. Las páginas viejas siguen funcionando con el tema oscuro y la clase `dark`.
4. Cuando todas las vistas estén migradas se retiran `dark`, Doto, Space
   Grotesk y los tokens antiguos.
5. Ningún componente nuevo usa clases `dark:` ni colores fuera de la paleta.

Esto permite avanzar por bloques sin una ventana de aplicación rota.

---

## 7. Fases

- **Bloque A — Fundaciones:** tokens, normalización de precios, view model,
  filtros, paginación y pruebas. Sin cambios visuales.
- **Bloque B — Shell y catálogo:** header, bottom nav, footer, catálogo real,
  tarjeta de producto y filtros.
- **Bloque C — Home:** hero, categorías, destacados, mejor valorados,
  presupuesto y CTA.
- **Bloque D — Detalle:** ruta `/productos/[id]`, especificaciones, valoración
  comunitaria, opiniones y acceso al comparador. Completado.
- **Bloque E — Comparador:** selección persistente, tabla, diferencias y
  sugerencia derivada. Completado.
- **Bloque F — Secundarias y cierre:** reseñas, blog, favoritos, perfil,
  responsive final, accesibilidad, documentación y limpieza del tema viejo.

---

## 8. Criterios de aceptación del Bloque B

- [x] El shell (header, bottom nav, footer) usa solo tokens oficiales y `.theme-tecreview`.
- [x] `/productos` muestra el catálogo real con búsqueda, filtros, chips y paginación de 12.
- [x] Las marcas y categorías se enriquecen desde `/api/marcas` y `/api/categorias`.
- [x] La tarjeta muestra disponibilidad, precio COP y “Sin reseñas” cuando no hay rating.
- [x] El inspector de API se conserva en `/debug/productos` con sus pruebas.
- [x] Las rutas aún no implementadas se muestran como “Próximamente”, sin 404.
- [x] `npm test`, `npm run build` y `npm run lint` pasan.

### Desviaciones registradas del Bloque B

1. El header no incluye buscador global: la búsqueda vive en el catálogo hasta
   que exista una ruta de búsqueda unificada.
2. “Ver detalle” abría `FichaTecnicaModal`; el Bloque D reemplazó ese
   disparador por la ruta `/productos/[id]`.
3. Las etiquetas de categoría se alinearon con la API: `Móviles`,
   `Laptops / PCs`, `Tablets`, `Auriculares`.
4. El disparador de detalle de la tarjeta es un botón accesible (imagen y
   “Ver detalle”), no la tarjeta completa, para evitar controles anidados.

---

## 8.1 Criterios de aceptación del Bloque C

- [x] La home usa `.theme-tecreview`, el shell del Bloque B y la paleta oficial.
- [x] El hero incluye búsqueda, categorías navegables, presupuesto y ofertas.
- [x] El presupuesto es un filtro explícito: por defecto no oculta productos.
- [x] La búsqueda prevalece sobre el presupuesto y permite localizar productos
      que lo superan.
- [x] Los productos sin precio se conservan y muestran “Consultar
      disponibilidad”; al activar el filtro de presupuesto quedan fuera.
- [x] Los rankings de valorados, comentados y deseados tienen estados de carga,
      error, vacío y reintento; no se inventan datos.
- [x] Las opiniones conservan el listado, el filtro, el formulario, el aviso de
      login y la publicación real.
- [x] La sesión se muestra en el header con rol, administración y cierre de
      sesión; el error de sesión permite reintentar.
- [x] El comparador se anuncia como “Próximamente” sin `href`.
- [x] `npm test`, `npm run build` y `npm run lint` pasan.
- [x] `/`, `/productos` y `/debug/productos` responden 200.

### Desviaciones registradas del Bloque C

1. El filtro de categoría de la home se retiró: las categorías navegan a sus
   páginas dedicadas y el botón “Todos” limpia búsqueda y presupuesto.
2. Los rankings dejaron de filtrarse por categoría y el presupuesto solo se
   aplica cuando el usuario lo activa. Los productos de ranking sin precio se
   conservan.
3. `RankingItem` distingue la métrica de “deseos” de las reseñas para no
   etiquetar los favoritos como comentarios.
4. La ficha técnica se abría en `FichaTecnicaModal`; el Bloque D la sustituyó
   por la ruta `/productos/[id]` en home, catálogo y categorías.
5. El slot de sesión del header se usa solo en la home; el resto de vistas
   conserva el header sin acciones por ahora.

---

## 8.2 Criterios de aceptación del Bloque D

- [x] `/productos/[id]` resuelve `params` como `Promise`, valida el id y entrega el cliente.
- [x] El detalle muestra nombre, marca, categoría, descripción, precio de referencia y disponibilidad reales.
- [x] Las especificaciones se normalizan con `normalizarFichaProducto`; sin datos se muestra un vacío limpio.
- [x] El promedio y la cantidad de valoraciones se leen de la API real; sin datos se muestra “Sin valoraciones todavía”.
- [x] Las opiniones se listan y se publican con `crearResena`; el formulario conserva el filtro de lenguaje no permitido.
- [x] Valorar exige sesión y abre `AuthModal`; con sesión usa `crearValoracion` y refresca las estadísticas.
- [x] El botón del comparador agrega y quita el producto, respetando el máximo de 4.
- [x] La home, el catálogo y las categorías navegan a `/productos/[id]`; `FichaTecnicaModal` deja de ser el detalle principal.
- [x] `npm test`, `npm run build` y `npm run lint` pasan.
- [x] `/productos/24` (primer id real del catálogo) responde 200.

### Desviaciones registradas del Bloque D

1. No se implementó galería multi-imagen ni panel de compra porque la API solo
   expone una imagen y un precio de referencia; no se inventaron tiendas, stock
   ni precios.
2. El detalle no muestra una “ficha de laboratorio” ni una calificación
   editorial: no existe esa fuente de datos.
3. El 404 de un id inexistente se renderiza en cliente con el estado “Producto
   no encontrado”; el HTTP sigue siendo 200 porque el producto se consulta en el
   cliente. Queda pendiente evaluar `notFound()` en servidor.
4. La página de categorías conserva el tema oscuro y `ProductCard` heredado;
   solo su disparador de detalle navega a la ruta nueva. Su migración visual
   queda para el Bloque F.
5. `FichaTecnicaModal` se conserva con sus pruebas y puede abrirse desde otros
   flujos, pero ya no es el detalle principal de home, catálogo ni categorías.
6. Las estrellas y las reseñas son fuentes distintas; publicar una reseña no
   crea automáticamente una valoración.

---

## 8.3 Criterios de aceptación del Bloque E

- [x] `/comparador` usa `AppShell`, `.theme-tecreview` y la paleta oficial.
- [x] La selección se persiste en `localStorage` (`tecreview:comparador`), se hidrata sin romper SSR y se sincroniza entre pestañas.
- [x] Se admiten máximo 4 productos; no se duplican ids y se avisa del límite.
- [x] El selector busca por nombre, marca y categoría sobre el catálogo real.
- [x] La tabla muestra precio, disponibilidad, marca, categoría y especificaciones; los datos ausentes se muestran como “Sin dato”.
- [x] Las filas con valores distintos se marcan y el checkbox “Solo diferencias” oculta las iguales.
- [x] Se puede quitar un producto y vaciar el comparador.
- [x] La sugerencia se deriva de disponibilidad, precio y cantidad de especificaciones; no declara un ganador absoluto.
- [x] Header, bottom nav y CTA de la home enlazan a `/comparador`.
- [x] `npm test`, `npm run build` y `npm run lint` pasan.
- [x] `/comparador` responde 200.

### Desviaciones registradas del Bloque E

1. La recomendación no usa ratings ni reseñas porque el listado no trae un
   rating agregado; mezclarlos habría exigido consultas por producto y una regla
   editorial no acordada.
2. Si hay empate técnico o ningún producto disponible, la sugerencia devuelve
   `idProducto: null` y un mensaje explícito en lugar de inventar un ganador.
3. La tabla usa desplazamiento horizontal en pantallas pequeñas; no se
   comprimen las columnas hasta volverlas ilegibles.
4. El comparador se limita a 4 productos para mantener la tabla legible y el
   estado persistente simple.

---

## 9. Criterios de aceptación del Bloque A

- [x] Los ocho tokens oficiales existen en `globals.css` con los valores exactos.
- [x] `.theme-tecreview` activa fondo claro, texto oscuro y `color-scheme: light`.
- [x] `normalizarPrecioCOP` y `formatearCOP` usan la misma regla.
- [x] `crearProductoViewModel` mapea identidad, categoría, marca, precio,
  disponibilidad, imagen, specs, rating y características.
- [x] Los datos ausentes quedan en `null` o `0`; no se inventan.
- [x] `prepararCatalogo`, `filtrarProductos`, `paginar`, `construirChips` y
  `hayFiltrosActivos` tienen pruebas unitarias.
- [x] `npm test` pasa completo.
- [x] `npm run build` pasa.
- [x] Ninguna página existente cambia de comportamiento en este bloque.

---

## 10. Decisiones abiertas

1. Rating agregado: el detalle ya usa `valoracion-stats`; el listado sigue sin
   rating agregado. Evaluar un endpoint batch para las tarjetas.
2. “Compra verificada”: omitir hasta que exista en el modelo.
3. Galería: una imagen + placeholders hasta tener varias por producto.
4. Blog: contenido estático aprobado o vista omitida.
5. Perfil: datos reales de Supabase y alcance de edición.
6. Estados hover/error: variantes derivadas de la paleta, previa aprobación.
7. Filtros de “alta cámara” y “alto rendimiento”: heurísticas documentadas y
   ajustables con datos reales.
8. 404 del detalle: evaluar `notFound()` en el Server Component para devolver
   un estado HTTP 404 real sin duplicar la consulta del producto.

---

## 11. Estado de verificación

- **2026-10-25:** Bloque A completado en `feat/tecreview-redesign`.
  `npm test`: 232 pruebas en 18 archivos; `npm run build` exitoso.
- **2026-10-25:** Bloque B completado.
  `npm test`: 262 pruebas en 23 archivos; `npm run build` y `npm run lint`
  exitosos; `/productos` y `/debug/productos` responden 200 en el servidor de
  desarrollo.
- **2026-10-25:** Bloque C completado en `feat/tecreview-redesign`.
  `npm test`: 288 pruebas en 25 archivos; `npm run build` y `npm run lint`
  exitosos; `/`, `/productos` y `/debug/productos` responden 200 en el servidor
  de desarrollo.
- **2026-10-25:** Bloques D y E completados en `feat/tecreview-redesign`.
  `npm test`: 331 pruebas en 29 archivos; `npm run build` y `npm run lint`
  exitosos; `/`, `/productos`, `/productos/24`, `/comparador` y
  `/debug/productos` responden 200 en el servidor de desarrollo. Un id
  inexistente muestra el estado “Producto no encontrado” en cliente, con HTTP
  200 (ver desviación D.3).
- Sin cambios en backend, `.env` ni base de datos.
