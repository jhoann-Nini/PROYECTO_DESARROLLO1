# TEC-108 — Panel de moderación de reseñas reportadas

**Estado:** Pantalla preparada en frontend; **integración bloqueada** porque el
backend actual no implementa la API administrativa de moderación.
**Rama de trabajo:** `adrian` (cambios locales, sin push).

---

## 1. Evidencia del contrato actual

La revisión se hizo contra la documentación y los controladores del backend
presentes en el repositorio:

- `proyectos/docs/api.md` §26, «Contrato objetivo de moderación de reportes»:
  el backend implementa únicamente el registro de reportes
  (`POST /api/resenas/{idResena}/reportes`) y la consulta de los reportes
  propios (`GET /api/reportes/mis-reportes`). El propio documento indica que
  la API de asignación, revisión, transición de estados, resolución,
  escalamiento y consulta administrativa **todavía debe definirse y
  construirse**, y que no debe presentarse como existente.
- `proyectos/backend/src/main/java/com/example/backend/controller/ReporteResenaController.java`:
  solo expone `POST /api/resenas/{idResena}/reportes` y
  `GET /api/reportes/mis-reportes`.
- El resto de controladores (`ResenaController`, `ProductoController`,
  `UsuarioController`, etc.) no declara rutas `/api/moderacion/...` ni
  `/api/admin/resenas/...` para listar, ocultar, publicar o rechazar reportes.

Por lo tanto, las rutas que consume el frontend son una **propuesta de
contrato**, no endpoints operativos. Contra el backend actual las peticiones
fallarán (por ejemplo, con `404`), y el panel mostrará su estado de error.

También existe una diferencia de estados pendiente de alinear:

- Enum Java actual: `PENDIENTE`, `EN_REVISION`, `ACEPTADO`, `RECHAZADO`.
- Contrato objetivo de `proyectos/docs/api.md` §26: `PENDIENTE`,
  `EN_REVISION`, `PROCEDENTE`, `NO_PROCEDENTE`, `ESCALADO`, `CERRADO`.

El frontend usa por ahora los valores del enum Java actual. Deberán ajustarse
cuando se acuerde el contrato definitivo.

## 2. Alcance preparado en frontend

La tarea pedía una pantalla de moderación con carga, error, vacío, acciones de
administrador y pruebas. Lo implementado es una **vista preparada**:

- `src/types/moderacion.ts`: tipos y filtros de la propuesta de contrato.
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

El panel muestra un aviso visible de que la API administrativa aún no está
disponible. Las pruebas de UI y de servicios usan mocks: verifican la lógica
preparada, **no** una integración real con el backend.

### Rutas propuestas por el frontend (no confirmadas)

| Método | Ruta | Rol previsto | Estado |
|---|---|---|---|
| `GET` | `/api/moderacion/resenas/reportadas` | Moderador o Administrador activo | No implementada en backend |
| `PUT` | `/api/admin/resenas/{id}/ocultar` | Administrador activo | No implementada en backend |
| `PUT` | `/api/admin/resenas/{id}/publicar` | Administrador activo | No implementada en backend |
| `PUT` | `/api/admin/resenas/{id}/rechazar-reportes` | Administrador activo | No implementada en backend |

Filtros propuestos: `estado`, `oculta` e `idProducto`. La UI expone `estado` y
`oculta=true`; no hay paginación porque tampoco está definida.

## 3. Pruebas existentes

- `src/types/producto.test.ts`: normalización y permisos de rol.
- `src/services/api.test.ts`: rutas, query string, cuerpo opcional y validación
  de respuesta del cliente preparado.
- `src/components/moderacion/PanelModeracionModal.test.tsx`: carga, error y
  reintento, vacío, filtros, detalle, gating de rol, acciones y fallos, y aviso
  de integración pendiente.
- `src/app/perfil/PerfilCliente.test.tsx`: visibilidad del punto de entrada y
  apertura del modal.

## 4. Pendientes para cerrar TEC-108

1. Backend implementa y documenta las rutas administrativas.
2. Acordar los estados definitivos y alinear el enum Java, `api.md` y los tipos
   del frontend.
3. Confirmar permisos y reglas de conflicto de interés (Moderador vs.
   Administrador).
4. Sustituir los mocks por pruebas de integración reales.
5. Retirar el aviso de integración pendiente y cerrar la tarea.

TEC-148 (reporte de precio/enlace) no depende de este panel y sigue bloqueada
por la ausencia del contrato de TEC-147; ver `docs/reportes-precio-enlace.md`.
