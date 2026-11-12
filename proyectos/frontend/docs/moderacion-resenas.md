# TEC-108 — Panel de moderación de reseñas reportadas

**Estado:** Implementado en frontend contra el contrato documentado del backend.
**Rama de trabajo:** `adrian` (cambios locales, sin push).
**Dependencia de backend:** contrato de las secciones 28–29 del API
(S2-42/S2-43), verificado en `origin/main`; el código del backend no está
presente en este árbol de trabajo.

---

## 1. Alcance

La tarea pedía una pantalla de moderación con carga, error, vacío, acciones de
administrador y pruebas. El panel se implementó como modal accesible dentro de
`/perfil`, visible solo para sesiones con rol **Moderador** o **Administrador**.

No se inventaron endpoints, campos ni permisos. Todo lo que la interfaz muestra
proviene del contrato documentado; cuando el backend responda distinto, los
tipos y mensajes se ajustan en un cambio posterior.

## 2. Contrato consumido

| Método | Ruta | Rol | Uso |
|---|---|---|---|
| `GET` | `/api/moderacion/resenas/reportadas` | Moderador o Administrador activo | Lista la cola de reseñas reportadas |
| `PUT` | `/api/admin/resenas/{id}/ocultar` | Administrador activo | Oculta la reseña reportada |
| `PUT` | `/api/admin/resenas/{id}/publicar` | Administrador activo | Restaura la visibilidad |
| `PUT` | `/api/admin/resenas/{id}/rechazar-reportes` | Administrador activo | Rechaza los reportes pendientes |

Filtros opcionales documentados para la consulta: `estado` (`PENDIENTE`,
`EN_REVISION`, `ACEPTADO`, `RECHAZADO`), `oculta` (`true`/`false`) e
`idProducto` (numérico). La UI expone `estado` y `oculta=true`; el servicio
acepta también `idProducto` para futuros enlaces directos, pero el contrato no
documenta paginación y por eso no se agregó.

Campos de la reseña reportada usados: `idResena`, `idProducto`,
`nombreProducto`, `idAutor`, `nombreAutor`, `comentario`, `puntuacion`,
`fechaCreacion`, `estado`, `ocultaPorReportes`, `totalReportes`,
`reportesPendientes` y `reportes[]`. Cada reporte aporta `idReporte`,
`idUsuarioReportante`, `nombreReportante`, `motivo`, `descripcion`, `estado` y
`fechaCreacion`.

## 3. Implementación

- `src/types/moderacion.ts`: tipos del contrato y filtros.
- `src/types/producto.ts`: rol `Moderador`, `esModerador()` y `puedeModerar()`
  (Moderador o Administrador).
- `src/services/api.ts`: `obtenerResenasReportadas()`,
  `ocultarResenaReportada()`, `publicarResenaReportada()` y
  `rechazarReportesResenaReportada()`, con validación de forma de la lista.
- `src/components/moderacion/PanelModeracionModal.tsx`: diálogo con cierre por
  Escape, foco inicial, filtros, carga, error con reintento, vacío, detalle de
  reportes y acciones según rol.
- `src/app/perfil/PerfilCliente.tsx`: botón **Panel de moderación** para
  Moderador/Administrador y montaje del modal.

Comportamiento relevante:

- Un Moderador puede consultar la cola; las acciones se muestran solo a un
  Administrador. El propio panel lo explica en texto.
- Las acciones se deshabilitan mientras hay una petición en curso y actualizan
  la reseña en la lista con la respuesta del servidor.
- Los errores de acción se muestran junto a la lista sin cerrar el modal.
- El botón de rechazar reportes se deshabilita cuando no hay pendientes.

## 4. Pruebas

- `src/types/producto.test.ts`: normalización y permisos de rol.
- `src/services/api.test.ts`: rutas, query string, cuerpo opcional y validación
  de respuesta.
- `src/components/moderacion/PanelModeracionModal.test.tsx`: carga, error y
  reintento, vacío, filtros, detalle, gating de rol, acciones y fallos.
- `src/app/perfil/PerfilCliente.test.tsx`: visibilidad del punto de entrada y
  apertura del modal.

## 5. Limitaciones y pendientes

- El backend de moderación no está en este árbol; la verificación de
  integración real queda pendiente cuando backend y frontend convivan en el
  mismo entorno.
- `403` y `401` se muestran con el mensaje del `ApiError`; no hay redirección
  automática ni refresco de sesión.
- No hay paginación ni búsqueda textual porque el contrato no las documenta.
- El filtro por producto existe en el servicio pero aún no tiene control en la
  UI.
- TEC-148 (reporte de precio/enlace) no depende de este panel y sigue bloqueada
  por la ausencia del endpoint de TEC-147; ver
  `docs/reportes-precio-enlace.md`.
