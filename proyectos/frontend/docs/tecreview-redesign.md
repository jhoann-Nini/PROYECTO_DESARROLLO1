# TecReview — Especificación de rediseño

**Estado:** Bloques A, B, C, D, E, F, G y H completados; filtrado automático
por presupuesto y scroll a destacados en el Bloque I.
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

Modo oscuro (principal): negro neutro + kiwi. Modo claro: piedra + kiwi.

| Token semántico | Claro | Oscuro | Uso |
|---|---|---|---|
| `--color-brand-solid` | `#A3E635` | `#A3E635` | Botones y CTAs; texto `--color-on-solid` |
| `--color-on-solid` | `#18181B` | `#0A0A0A` | Texto e iconos sobre kiwi |
| `--color-brand-blue` | `#4D7C0F` | `#A3E635` | Enlaces, chips y focos (nombre legacy) |
| `--color-ink` | `#18181B` | `#F4F4F5` | Texto principal |
| `--color-canvas` | `#F5F5F4` | `#0A0A0A` | Fondo de página |
| `--color-paper` | `#FFFFFF` | `#161616` | Cards, modales y header |
| `--color-hairline` | `#E4E4E7` | `#262626` | Bordes suaves |
| `--color-subtle` | `#6E6E77` | `#A1A1AA` | Texto secundario |
| `--color-positive` | `#10B981` | `#10B981` | Disponibilidad y tags positivas |
| `--color-star` | `#F59E0B` | `#F59E0B` | Estrellas y ratings |
| `--color-inverse` | `#18181B` | `#18181B` | Overlays y bloque CTA con texto blanco |

Se conservan los nombres `--color-brand-blue` y `--color-brand-solid` para no
romper los usos existentes; solo cambian sus valores. La familia heredada
`--color-brand-primary`, `--color-brand-hover`, `--color-brand-light` y
`--color-brand-focus` se alinea a la gama lima. `--color-positive` se mantiene
en esmeralda para que “Disponible” no se confunda con el kiwi de marca.

No se inventan colores principales nuevos. Los estados hover, focus y error
se resuelven con opacidad, con `--color-ink` o con los tonos lima; si más
adelante se necesita un tono derivado, se documenta y se aprueba antes de
usarlo.

### 2.2 Tipografía

- **Inter** como única familia, con pesos 400, 500, 600 y 700.
- Se retiran Doto y Space Grotesk del diseño nuevo.
- La escala mantiene jerarquías claras; los headings usan el mismo sans-serif.

### 2.3 Radios, sombras e iconos

- Radios de 8 px a 12 px (`rounded-sm` a `rounded-lg` en el tema actual).
- Sombras suaves derivadas de `rgba(24, 24, 27, ...)` en claro y de negro en
  oscuro.
- Iconos SVG outline con trazo uniforme de 1.5 px o 2 px.
- Foco visible de 2 px con `#4D7C0F` en claro y `#A3E635` en oscuro, con offset
  de 2 px.

### 2.4 Accesibilidad de la paleta

- Sobre el kiwi `#A3E635` se usa siempre texto oscuro (`--color-on-solid`):
  `#18181B` da 11.75:1 en claro y `#0A0A0A` da 13.13:1 en oscuro. Blanco sobre
  kiwi da 1.51:1 y queda prohibido.
- Kiwi sobre negro `#0A0A0A` = 13.13:1; sobre paper `#161616` = 12.00:1.
- Enlaces `#4D7C0F` sobre blanco = 4.99:1 y sobre `#F5F5F4` = 4.58:1 (AA).
- Texto secundario `#6E6E77` sobre `#F5F5F4` = 4.63:1 y sobre blanco = 5.05:1
  (AA). Se descartó `#71717A` porque se quedaba en 4.43:1 sobre el lienzo.
- Texto principal `#F4F4F5` sobre `#0A0A0A` = 18.01:1; secundario `#A1A1AA`
  sobre `#161616` = 7.06:1.
- Sobre `#10B981` se usa texto oscuro (`--color-on-positive`); blanco sobre
  verde no alcanza AA y además el esmeralda se reserva para “Disponible”.
- Las estrellas `#F59E0B` se acompañan del valor numérico.
- Tabs, sliders y bottom nav deben funcionar con teclado y tener etiquetas ARIA.

### 2.5 Tema oscuro

El tema oscuro es el tema principal de TecReview y se aplica por defecto en la
primera visita. La preferencia se guarda en `localStorage` con la clave
`tecreview:tema`; el tema claro solo se activa cuando el usuario lo elige con el
toggle. Un script `beforeInteractive` aplica `html.dark` antes de la hidratación
para evitar el destello del tema incorrecto.

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--color-canvas` | `#F5F5F4` | `#0A0A0A` | Fondo de página |
| `--color-paper` | `#FFFFFF` | `#161616` | Cards, modales y header |
| `--color-ink` | `#18181B` | `#F4F4F5` | Texto principal |
| `--color-subtle` | `#6E6E77` | `#A1A1AA` | Texto secundario |
| `--color-hairline` | `#E4E4E7` | `#262626` | Bordes |
| `--color-brand-blue` | `#4D7C0F` | `#A3E635` | Enlaces, chips y focos |
| `--color-brand-solid` | `#A3E635` | `#A3E635` | Botones con texto oscuro |
| `--color-on-solid` | `#18181B` | `#0A0A0A` | Texto sobre kiwi |
| `--color-inverse` | `#18181B` | `#18181B` | Overlays y bloques con texto blanco |
| `--color-on-positive` | `#18181B` | `#18181B` | Texto sobre el verde positivo |

`--color-brand-blue` se aclara a kiwi en oscuro para conservar contraste AA
sobre las superficies oscuras. `--color-brand-solid` es kiwi en ambos temas y
siempre se acompaña de `--color-on-solid`; nunca de blanco. `--color-inverse`
también es fijo: los overlays de modales y los bloques con texto blanco no deben
invertirse en oscuro. El badge sólido verde usa `--color-on-positive` para
conservar el texto oscuro en ambos temas. El toggle vive en el header, tiene
`aria-label`, `aria-pressed` e iconos de sol/luna, y se sincroniza entre
pestañas. No sigue `prefers-color-scheme` porque el oscuro es la identidad de
marca; la elección explícita del usuario es la única que puede cambiarlo.

---

## 3. Rutas

| Ruta | Vista | Estado |
|---|---|---|
| `/` | Home editorial | Implementada en Bloque C |
| `/productos` | Catálogo con filtros | Implementada en Bloque B |
| `/productos/[id]` | Detalle de producto | Implementada en Bloque D; 404 real en F3 |
| `/comparador` | Comparador | Implementada en Bloque E |
| `/resenas` | Reseñas de la comunidad | Implementada en F1 |
| `/blog` | Blog editorial | Implementada en F1 |
| `/blog/[slug]` | Artículo editorial | Implementada en F1 |
| `/favoritos` | Favoritos | Implementada en F1 |
| `/perfil` | Perfil de usuario | Implementada en F1 |
| `/categorias/[slug]` | Categoría del catálogo | Implementada en B/D; migrada en F2 |
| `/debug/productos` | Inspector de API actual | Implementada y preservada desde el Bloque B |
| `not-found` | 404 global con shell | Implementada en F3 |

El header enlaza a Inicio, Productos, Comparador, Reseñas, Blog y Favoritos, e
incluye el toggle de tema. El bottom nav móvil enlaza a Inicio, Catálogo,
Comparador, Favoritos y Perfil. No quedan enlaces “Próximamente” en la
navegación principal.

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
- **Secundarias:** `ResenasCliente`, `FavoritosCliente`, `PerfilCliente`,
  `BotonFavorito` y las páginas de blog.
- **Tema y cierre:** `lib/tema`, `useTema`, `BotonTema`, `app/not-found.tsx` y
  `productos/[id]/not-found.tsx`.
- **Comunes:** `RatingStars`, `ProductImagePlaceholder`, `AuthModal`,
  `BotonFavorito`.

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
  máximo 4 ids en `tecreview:comparador`.
- Favoritos usa `localStorage` con la clave `tecreview:favoritos`, normaliza
  ids enteros positivos, evita duplicados y admite hasta 100 productos. Se
  sincroniza entre pestañas con `storage` y dentro de la misma pestaña con el
  evento `tecreview:favoritos:cambio`. No requiere sesión ni backend y no se
  sincroniza entre dispositivos.
- `/favoritos` cruza los ids guardados con el catálogo real, muestra los
  productos disponibles y avisa cuántos ya no aparecen; no inventa datos.
- El tema se persiste en `tecreview:tema`; tampoco se sincroniza entre
  dispositivos. La preferencia guardada tiene prioridad sobre el sistema.
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
- Reseñas: se consumen las existentes de `/api/resenas`. `/resenas` permite
  buscar, filtrar por producto y ordenar por fecha; publicar exige sesión y usa
  `crearResena`. “Compra verificada” no está modelada; se omite hasta que el
  backend la aporte.
- Las estrellas de `/resenas` salen de `obtenerMejorValorados` o de
  `valoracion-stats`; nunca se derivan de una reseña.
- Blog: cuatro artículos editoriales estáticos en `src/data/blog.ts`, sin
  autores, métricas, precios ni afirmaciones inventadas. Enlazan a categorías
  reales y no crean endpoints ni CMS.
- Perfil: usa la sesión de Supabase y `GET /api/usuarios/me`; muestra rol,
  fecha de registro, estado y las reseñas propias filtradas desde
  `/api/resenas`. Sin sesión ofrece `AuthModal`; con sesión permite cerrar
  sesión y, si corresponde, abrir el panel de administración.
- El detalle resuelve el 404 en el Server Component: consulta
  `obtenerProductoPorId`; un `ApiError` con estado 404 llama `notFound()`.
  Otros errores se dejan al cliente para no convertir una caída del backend en
  un 404 falso. El cliente vuelve a consultar el producto para renderizar; se
  aceptó esa doble consulta para no reestructurar el cliente.
- Imágenes: se usa la imagen disponible y `ProductImagePlaceholder` como
  fallback. La galería multi-imagen queda pendiente de datos reales.

---

## 6. Tema y convivencia final

1. Los tokens oficiales viven en `@theme`; `html.dark` redefine sus valores
   para el tema oscuro.
2. `.theme-tecreview` conserva el fondo y el texto del tema activo; las vistas
   nuevas usan solo tokens semánticos.
3. El tema oscuro reutiliza los mismos componentes: no hay una copia oscura de
   cada vista.
4. `--color-brand-blue` se aclara a `#60A5FA` en oscuro para enlaces, chips y
   focos; `--color-brand-solid` conserva `#2563EB` en botones con texto blanco.
5. El script `tema-inicial` se inyecta con `beforeInteractive` antes del
   contenido y el toggle del header mantiene la preferencia.
6. `BotonTema` usa `dark:` solo para intercambiar los iconos de sol/luna; no es
   un estilo de contenido.
7. `debug/productos` conserva el tema oscuro heredado y `auth/callback`
   mantiene sus clases `slate` con variantes `dark:`; ambas vistas quedan fuera
   de la migración visual.
8. No quedan Doto, Space Grotesk ni la clase `dark` forzada en el layout raíz.

La convivencia temporal de los bloques A–E se cerró sin dejar una ventana de
aplicación rota.

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
  migración de categorías y modales, 404 real, modo oscuro persistente,
  documentación y limpieza del tema viejo. Completado.

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

## 8.4 Criterios de aceptación del Bloque F

- [x] `/resenas` lista reseñas reales, permite buscar, filtrar por producto y ordenar por fecha; publicar exige sesión.
- [x] Las estrellas de `/resenas` salen de rankings o `valoracion-stats`; no se derivan de una reseña.
- [x] `/blog` y `/blog/[slug]` sirven cuatro artículos estáticos, sin autores, métricas ni datos inventados.
- [x] `/favoritos` persiste en `tecreview:favoritos`, permite quitar y vaciar, y se sincroniza dentro de la pestaña y entre pestañas.
- [x] `/favoritos` avisa de los ids guardados que ya no aparecen en el catálogo real.
- [x] `/perfil` usa la sesión de Supabase y `/api/usuarios/me`, muestra rol, fecha, estado y reseñas propias, y permite cerrar sesión.
- [x] Sin sesión, `/perfil` ofrece `AuthModal`; con rol administrador abre el panel.
- [x] Header y bottom nav enlazan a todas las rutas reales; no quedan “Próximamente”.
- [x] `/categorias/[slug]` usa `AppShell`, `TarjetaProducto` y tokens oficiales; se retiraron `ProductCard` y `GeometricBackground` de la vista.
- [x] `AuthModal`, `FichaTecnicaModal` y `AdminPanelModal` usan tokens claros y conservan su lógica y textos.
- [x] El panel admin usa azul para acciones principales, rojo solo para eliminar/errores y ámbar para editar.
- [x] `/productos/999999` y `/productos/abc` responden 404 real; el 404 global y el de producto incluyen el shell.
- [x] El modo oscuro se activa desde el header, persiste en `tecreview:tema` y respeta `prefers-color-scheme` como valor inicial.
- [x] El script `tema-inicial` se sirve antes del contenido y evita el destello; no hay errores de hidratación.
- [x] Los tokens oscuros se aplican a vistas y modales.
- [x] No se modificaron backend, `.env` ni base de datos.
- [x] `npm test`, `npm run build` y `npm run lint` pasan.
- [x] Documentación actualizada y commits locales en español.

### Desviaciones registradas del Bloque F

1. Favoritos es local y admite hasta 100 ids; no se sincroniza entre
   dispositivos ni se asocia a la cuenta.
2. El tema también es local; no se sincroniza entre dispositivos.
3. El blog es contenido estático en el repositorio. No hay CMS, autores ni
   métricas de lectura inventadas.
4. El detalle consulta el producto dos veces: una en servidor para el 404 y otra
   en cliente para renderizar. Se aceptó para no reestructurar el cliente.
5. `debug/productos` conserva el tema oscuro heredado y `auth/callback` conserva
   sus estilos `slate` con variantes `dark:`; no se migraron en F2.
6. Los modales se migraron solo en lo visual; su lógica, textos y pruebas se
   conservaron.
7. En el Bloque F `--color-brand-blue` se aclaraba a `#60A5FA` en oscuro y
   `--color-brand-solid` se mantenía en `#2563EB` para botones con texto
   blanco. El Bloque H sustituyó esa paleta por kiwi; esta nota queda como
   historial.
8. Un id no numérico y un 404 de la API devuelven 404; otros errores de la API
   quedan al cliente con su estado de error y reintento, para no ocultar una
   caída del backend.
9. `BotonTema` usa `dark:` únicamente para intercambiar los iconos de sol y luna.
10. Los tokens oscuros antiguos (`--color-surface-0`, `--color-surface-1`,
    `--color-surface-2`, `--color-line`) permanecen en `@theme` porque
    `debug/productos` y `auth/callback` aún los usan.

---

## 8.5 Criterios de aceptación del Bloque G — Home

- [x] `RankingItem` usa una fila superior (posición, miniatura, marca, título y
  métrica) y una fila inferior para precio y "Ver ficha"; la descripción se
  limita a dos líneas con `line-clamp-2`.
- [x] Las tres columnas de rankings comparten altura, `gap` y padding, y los
  pies "Ver lista completa" quedan alineados.
- [x] `seleccionarDestacados` devuelve como máximo 6 productos: respeta
  `posicionRanking`, elimina duplicados y productos fuera del catálogo, y cae a
  los primeros 6 cuando no hay valoraciones coincidentes.
- [x] Con búsqueda o filtro de presupuesto activos, Destacados muestra todos los
  resultados filtrados sin recortar a 6.
- [x] La cabecera y el pie de Destacados enlazan a `/productos` con CTA visible.
- [x] `CategoriasHome` usa 5 SVG inline (Todos + 4 categorías), sin emojis, con
  píldoras redondeadas, hover y foco visibles.
- [x] `npm test`, `npx tsc --noEmit`, `npm run lint` y `npm run build` pasan.

### Decisiones registradas del Bloque G

1. Los destacados usan el ranking real de mejor valorados. No se inventan
   ratings ni relevancia: si la API no devuelve valoraciones, se muestran los
   primeros 6 del catálogo.
2. El ranking conserva el comportamiento de 4 elementos + "Ver lista completa";
   solo cambia la presentación.
3. Los iconos de categoría son SVG inline en el componente. El campo `icono` de
   `lib/categorias.ts` no se modifica para no afectar a otros consumidores.

---

## 8.6 Criterios de aceptación del Bloque H — Identidad kiwi

- [x] El tema oscuro (negro neutro + kiwi) es el principal y se aplica por
  defecto en la primera visita.
- [x] El tema claro usa piedra + kiwi: canvas `#F5F5F4`, paper `#FFFFFF` e ink
  `#18181B`.
- [x] `--color-brand-solid` es kiwi `#A3E635` en ambos temas y todos los
  botones/CTAs usan `--color-on-solid`, nunca blanco.
- [x] `--color-brand-blue` conserva su nombre y pasa a `#4D7C0F` en claro y
  `#A3E635` en oscuro.
- [x] `--color-positive` sigue en esmeralda para distinguir “Disponible” del
  kiwi de marca.
- [x] El glow del slider de `FichaTecnicaModal` es kiwi.
- [x] `prefers-color-scheme` ya no decide el tema inicial; solo la preferencia
  guardada puede activar el claro.
- [x] `npm test`, `npx tsc --noEmit`, `npm run lint` y `npm run build` pasan.
- [x] Capturas reales en Edge headless de home, catálogo, detalle y modal de
  acceso en claro y oscuro.

### Decisiones registradas del Bloque H

1. Se conservan los nombres de tokens (`--color-brand-blue`,
   `--color-brand-solid`) para no tocar los usos existentes; solo cambian los
   valores.
2. El kiwi sólido siempre lleva texto oscuro: blanco sobre `#A3E635` da 1.51:1
   y falla WCAG AA.
3. El modo oscuro es el valor por defecto porque es la identidad principal; el
   claro se guarda solo cuando el usuario lo elige. No se sigue
   `prefers-color-scheme`.
4. `--color-subtle` en claro se ajustó de `#71717A` a `#6E6E77` para pasar AA
   sobre el lienzo `#F5F5F4` (4.63:1).
5. `--color-positive` se mantiene en esmeralda para que el estado “Disponible”
   no se confunda con la marca kiwi.
6. Los componentes legacy sin uso (`Header`, `ProductCard`, `DeviceListItem`,
   `GeometricBackground`) y `debug/productos` conservan sus azules heredados;
   no se migraron para no ampliar el alcance.

---

## 8.7 Criterios de aceptación del Bloque I — Filtro automático por presupuesto

- [x] El valor “Hasta: $ X COP” y el límite mostrado bajo el slider se
  actualizan en vivo mientras se arrastra (`onChange`).
- [x] `PresupuestoHome` acepta `onFinalizarAjuste?: (valor: number) => void` y lo
  invoca al terminar el ajuste por `pointerup`, `mouseup`, `touchend` o `keyup`
  con el valor actual del control (50–1500), sin romper las props existentes.
- [x] Al soltar el slider, la home activa `filtrarSoloEnPresupuesto` y desplaza
  la vista con `scrollIntoView({ behavior: "smooth", block: "start" })` hasta
  `#seccion-destacados`.
- [x] `DestacadosHome` expone el ancla en su `<section>`, usa `scroll-mt-16` para
  compensar el header fijo y mantiene el nombre accesible con
  `aria-labelledby`.
- [x] Con el filtro activo, Destacados lista todos los productos cuyo precio es
  menor o igual al límite y muestra un badge con el presupuesto aplicado.
- [x] `npm test`, `npx tsc --noEmit` y `npm run lint` pasan.

### Decisiones registradas del Bloque I

1. El callback recibe el valor del slider (50–1500), no el valor convertido a
   COP. La página lo ignora porque `limitePresupuestoCOP` ya se deriva del estado
   `presupuestoMax`; así el componente no duplica la regla de normalización.
2. El botón explícito “Filtrar por presupuesto” se conserva. El filtrado al
   soltar el slider es una comodidad adicional, no un reemplazo del control
   manual.
3. El `id` del ancla se movió del `<h2>` al `<section>` y el título usa
   `seccion-destacados-titulo`. `scroll-mt-16` evita que el header fijo tape el
   inicio de la sección.
4. El badge usa `limitePresupuestoCOP` (valor ya normalizado) en lugar de
   `presupuestoMax` para no mostrar una cifra ambigua.

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
4. Blog: contenido estático aprobado e implementado; no se prevé un CMS a
   corto plazo.
5. Perfil: datos reales de Supabase implementados; la edición de perfil no está
   incluida.
6. Estados hover/error: resueltos con opacidad y la paleta oficial; cualquier
   tono nuevo requiere aprobación.
7. Filtros de “alta cámara” y “alto rendimiento”: heurísticas documentadas y
   ajustables con datos reales.
8. 404 del detalle: resuelto con `notFound()` en el Server Component. La doble
   consulta del producto queda como deuda técnica aceptada.

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
- **2026-10-26:** Bloque F completado en `feat/tecreview-redesign`.
  `npm test`: 385 pruebas en 39 archivos; `npm run build` y `npm run lint`
  exitosos. Rutas verificadas en el servidor de desarrollo:
  `/resenas`, `/blog`, `/favoritos`, `/perfil`, `/comparador` y
  `/categorias/moviles` responden 200; `/productos/24` responde 200;
  `/productos/999999`, `/productos/abc` y `/ruta-inexistente` responden 404.
  Las dos UIs 404 contienen su texto y el shell. El HTML servido incluye el
  script `tema-inicial` antes del contenido.
- **2026-10-26:** Bloque G completado en `feat/tecreview-redesign`.
  `npm test`: 395 pruebas en 40 archivos; `npx tsc --noEmit`, `npm run lint` y
  `npm run build` exitosos. Destacados queda limitado a 6 productos (o a todos
  los resultados si hay filtros activos), los rankings usan una ficha compacta
  y las categorías usan SVG inline.
- **2026-10-26:** Bloque H completado en `feat/tecreview-redesign`.
  `npm test`: 394 pruebas en 40 archivos; `npx tsc --noEmit`, `npm run lint` y
  `npm run build` exitosos. El tema oscuro (negro neutro + kiwi) es el valor
  por defecto; el claro (piedra + kiwi) se guarda solo si el usuario lo elige.
  Capturas reales en Edge headless de home, catálogo, detalle y modal de acceso
  en ambos temas; una visita nueva arranca con `html.dark` y
  `color-scheme: dark` sin preferencia guardada.
- **2026-10-26:** Bloque I completado en `feat/tecreview-redesign`.
  `npm test`: 397 pruebas en 40 archivos; `npx tsc --noEmit`, `npm run lint` y
  `npm run build` exitosos. Al soltar el slider se activa el filtro de
  presupuesto y la vista se desplaza suavemente a `#seccion-destacados`, que
  muestra el presupuesto aplicado.
- Sin cambios en backend, `.env` ni base de datos.
