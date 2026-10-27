# TecReview — Bloque F: secundarias, cierre visual y modo oscuro

**Fecha:** 2026-10-26
**Rama:** `feat/tecreview-redesign`
**Estado:** completado e implementado en `feat/tecreview-redesign`.

## Objetivo

Cerrar el rediseño de TecReview con las páginas secundarias, la migración de
las vistas que aún usan el tema oscuro, el cierre de accesibilidad/responsive y
un modo oscuro real con preferencia persistente.

## Alcance

### F1 — Páginas secundarias

- `/resenas`: reseñas reales de `/api/resenas`, búsqueda, filtro por producto,
  orden y acceso a la publicación con sesión. Las estrellas se muestran solo
  desde `valoracion-stats` o rankings reales; nunca se inventan.
- `/favoritos`: persistencia local en `tecreview:favoritos`, mismo patrón que el
  comparador. Se puede quitar un producto y vaciar la lista.
- `/perfil`: sesión real de Supabase, datos de negocio de `/api/usuarios/me`,
  reseñas propias, rol, fecha de registro, acceso a favoritos/comparador y
  cierre de sesión. Sin sesión se ofrece `AuthModal`.
- `/blog`: contenido editorial estático en el repositorio. Sin autores,
  métricas ni afirmaciones inventadas. Artículos enlazados a categorías reales.

### F2 — Migración visual

- `/categorias/[slug]` al tema claro con `AppShell`, `TarjetaProducto` y tokens
  oficiales. Se retira `ProductCard` y `GeometricBackground` de la vista.
- `AuthModal`, `FichaTecnicaModal` y `AdminPanelModal` migrados a tokens
  claros. El panel admin conserva toda su funcionalidad.
- Repaso de foco, etiquetas, contraste y navegación móvil.

### F3 — Cierre

- Retirar Doto, Space Grotesk, la clase `dark` forzada y los estilos oscuros
  globales de `globals.css`.
- Devolver HTTP 404 real para `/productos/[id]` inexistente desde el servidor.
- Actualizar documentación, pruebas, build y lint.

### F4 — Modo oscuro real

- Toggle claro/oscuro en el header, persistido en `tecreview:tema` y con
  respeto inicial a `prefers-color-scheme`.
- Tokens oscuros derivados de la paleta oficial: fondo `#0F172A`, superficie
  `#1E293B`, borde `#334155`, texto `#F3F4F6`, secundario `#CBD5E1`.
- Sin destello de tema incorrecto: script previo a la hidratación.
- El modo oscuro se aplica a todas las vistas, incluidos modales.

## Datos y límites

- No se modifican backend, `.env` ni base de datos.
- Favoritos y tema son locales; se documenta que no se sincronizan entre
  dispositivos.
- Las reseñas no tienen estrellas ni “compra verificada”; no se simulan.
- El blog no crea endpoints ni un CMS.
- No se declaran ganadores ni calificaciones editoriales.

## Criterios de aceptación

- [x] Las cuatro rutas nuevas responden y tienen estados de carga, error y vacío.
- [x] Header y bottom nav enlazan a todas las rutas reales.
- [x] Favoritos persiste y se sincroniza entre pestañas.
- [x] Perfil usa datos reales y permite cerrar sesión.
- [x] Categorías y modales usan la paleta clara oficial.
- [x] `/productos/999999` responde 404 real.
- [x] El modo oscuro se activa, persiste y no rompe SSR.
- [x] `npm test`, `npm run build` y `npm run lint` pasan.
- [x] Documentación actualizada y commits locales en español.

## Resultado de verificación

- **Pruebas:** `npm test` → 385 pruebas en 39 archivos, todas pasan.
- **Tipos:** `npx tsc --noEmit` sin errores.
- **Build:** `npm run build` exitoso con Next.js 16.3.5 (Turbopack).
- **Lint:** `npm run lint` sin errores.
- **Rutas 200:** `/resenas`, `/blog`, `/favoritos`, `/perfil`, `/comparador`,
  `/categorias/moviles` y `/productos/24`.
- **Rutas 404:** `/productos/999999`, `/productos/abc` y `/ruta-inexistente`.
  Las dos UIs 404 contienen su texto y el shell.
- **Tema:** el HTML servido incluye el script `tema-inicial` antes del
  contenido; el toggle persiste en `tecreview:tema` y respeta
  `prefers-color-scheme` cuando no hay preferencia guardada.
- **Alcance:** sin cambios en backend, `.env` ni base de datos.

## Desviaciones aceptadas

1. Favoritos y tema son locales; no se sincronizan entre dispositivos ni se
   asocian a la cuenta.
2. El blog es contenido estático; no hay CMS, autores ni métricas inventadas.
3. El detalle consulta el producto dos veces: servidor para el 404 y cliente
   para renderizar. Se aceptó para no reestructurar el cliente.
4. `debug/productos` conserva el tema oscuro heredado y `auth/callback`
   conserva sus estilos `slate` con variantes `dark:`.
5. Los modales se migraron solo en lo visual, conservando lógica, textos y
   pruebas.
6. `--color-brand-blue` se aclara a `#60A5FA` en oscuro; `--color-brand-solid`
   se mantiene en `#2563EB` para botones con texto blanco.
7. Un id no numérico y un 404 de la API devuelven 404; otros errores de la API
   quedan al cliente con reintento.
8. `BotonTema` usa `dark:` solo para intercambiar los iconos de sol y luna.
9. Los tokens oscuros antiguos permanecen en `@theme` porque
   `debug/productos` y `auth/callback` aún los usan.
