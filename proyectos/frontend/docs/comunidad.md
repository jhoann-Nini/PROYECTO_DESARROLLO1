# Comunidad (fase 1): páginas del foro

**Fecha:** 25 de noviembre de 2026. API: `docs/api.md` §34. Especificación: `docs/superpowers/specs/2026-11-24-comunidad-design.md`.

| Ruta | Contenido |
|---|---|
| `/comunidad` | Foro general: lista por cursor («Cargar más»), orden por actividad o más nuevas, «Nueva publicación» |
| `/comunidad/publicacion/[id]` | La publicación y su árbol: dos niveles al cargar y «Ver N respuestas» para el tercero; responder, «Me gusta», editar y eliminar lo propio |
| `/productos/[id]/comunidad` | La misma lista filtrada por producto; el detalle del producto enlaza «Comunidad (N)» |

## Componentes (`src/components/comunidad/`)

- `ListaPublicaciones`, `TarjetaPublicacion` y `FormularioPublicacion`. El formulario avisa antes de enviar si el filtro (`analizarComentario`, el mismo de las reseñas) dejará el texto en revisión.
- `HiloRespuestas` (un nivel por petición, recursivo) y `RespuestaItem`.
  - El árbol usa listas anidadas con `aria-level`.
  - «Responder» abre el formulario en línea y lo enfoca.
- `FormularioRespuesta` y `BotonMeGusta`. El «Me gusta» es optimista: se revierte si el servidor lo rechaza.
- `ContenidoNoVisible`: «Esta respuesta fue eliminada», «no está disponible» o «está en revisión». La respuesta conserva su lugar y sus hijas.
- `TextoPlano`: solo texto con saltos de línea; los enlaces no se convierten en vínculos.
- `usePaginacionCursor` (`src/hooks/`): primera página, «Cargar más» y reinicio al cambiar el orden.

## Estados

- **Cargando:** `role="status"` con `aria-busy`.
- **Vacío y error:** `EstadoVacio`; el error ofrece «Reintentar».
- **`401`:** abre `AuthModal`.
- **`403`, `409` y `429`:** muestran el mensaje del servidor (suspensión, bloqueo con fecha, hilo cerrado o cuota).
- **`404`:** «Esta publicación no existe o ya no está disponible».

Los límites de texto (`LIMITES_COMUNIDAD`) coinciden con el backend: título de 5 a 150 caracteres, publicación hasta 5000 y respuesta hasta 3000.
