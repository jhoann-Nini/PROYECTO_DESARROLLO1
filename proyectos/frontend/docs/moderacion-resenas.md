# TEC-108 — Panel de moderación de reseñas reportadas

**Estado:** Implementado en frontend contra la API real de moderación del
backend. La pantalla consume los endpoints `/api/moderacion/...`, aplica las
reglas de rol y ya no muestra el aviso de integración pendiente.
**Rama de trabajo:** `adrian` (cambios locales, sin push).

---

## 1. Contrato real consumido

El panel usa las rutas implementadas por el backend para Moderador y
Administrador con cuenta activa:

| Método | Ruta | Uso |
|---|---|---|
| `GET` | `/api/moderacion/resenas/reportadas` | Reseñas con reportes para revisión |
| `GET` | `/api/moderacion/resenas/pendientes` | Reseñas pendientes de moderación |
| `GET` | `/api/moderacion/reportes` | Reportes asociados a una reseña |
| `PUT` | `/api/moderacion/resenas/{idResena}/ocultar` | Oculta manualmente la reseña |
| `PUT` | `/api/moderacion/resenas/{idResena}/publicar` | Revierte la ocultación manual |
| `PUT` | `/api/moderacion/resenas/{idResena}/rechazar-reportes` | Rechaza los reportes pendientes |

El cuerpo de las tres acciones es `AccionModeracionRequest`:

```json
{ "motivo": "Texto opcional de justificación" }
```

`motivo` es opcional para el backend y admite hasta 2000 caracteres. La UI lo
exige para **ocultar** y **publicar**, y lo mantiene opcional al **rechazar
reportes**.

### Ocultación manual y reportes

La reseña expone dos banderas distintas:

- `ocultaPorReportes`: la ocultación derivada de reportes.
- `ocultaPorModeracion`: la ocultación manual aplicada por Moderación.

`publicar` restablece únicamente `ocultaPorModeracion`; no borra ni rechaza los
reportes. Por eso el panel decide entre “Ocultar” y “Publicar” usando
`ocultaPorModeracion`, no `ocultaPorReportes`.

## 2. Alcance implementado en frontend

- `src/types/moderacion.ts`: tipos de reseñas reportadas, reportes y acciones;
  incluye `ocultaPorReportes` y `ocultaPorModeracion`.
- `src/types/producto.ts`: rol `Moderador`, `esModerador()` y `puedeModerar()`
  (Moderador o Administrador).
- `src/services/api.ts`: consultas y acciones de moderación contra las rutas
  reales; validación de la forma de las listas y envío de `motivo` cuando
  corresponde.
- `src/components/moderacion/PanelModeracionModal.tsx`: diálogo con cierre por
  Escape, foco inicial, filtros, carga, error con reintento, vacío, detalle de
  reportes y acciones según rol.
- `src/app/perfil/PerfilCliente.tsx`: botón **Panel de moderación** para
  Moderador/Administrador y montaje del modal.

### Reglas de interfaz

- Solo Moderador y Administrador ven y ejecutan las acciones.
- Ocultar y publicar exigen una justificación no vacía; el botón permanece
  deshabilitado hasta que el texto sea válido.
- Rechazar reportes permite enviar un motivo opcional.
- El estado “Oculta por moderación” se muestra a partir de
  `ocultaPorModeracion`.
- Tras una acción exitosa se recarga la lista real; los errores del backend se
  muestran sin inventar un resultado.

### Filtros

La UI conserva los filtros disponibles (`estado`, `oculta=true` e
`idProducto`) y no ofrece paginación porque el contrato actual no la define.

## 3. Pruebas

- `src/components/moderacion/PanelModeracionModal.test.tsx`: 15 pruebas de
  carga, error y reintento, vacío, filtros, detalle, permisos por rol,
  justificación obligatoria, acciones y fallos.
- `src/services/api.test.ts`: rutas, query string, cuerpo de las acciones y
  validación de respuesta del cliente real.
- `src/types/producto.test.ts`: normalización y permisos multirrol.
- `src/app/perfil/PerfilCliente.test.tsx`: visibilidad del punto de entrada y
  apertura del modal.

Las pruebas del frontend usan mocks del cliente HTTP; la verificación de la
persistencia y de las reglas de autorización corresponde a las pruebas de
integración del backend.

## 4. Pendientes y límites conocidos

1. El backend no expone un historial de auditoría legible por el panel.
2. No existe un listado paginado de reseñas reportadas; la UI trabaja con la
   respuesta completa del endpoint.
3. La regla de conflicto de interés (por ejemplo, moderar una reseña propia)
   debe seguir validándose en backend; el frontend no la simula.
4. No se incluyó una prueba E2E con backend real; la integración se cubre con
   pruebas de backend y del cliente API.
5. `publicar` no limpia los reportes: si la reseña sigue oculta por reportes,
   la UI debe seguir reflejando esa condición.

TEC-148 (reporte de precio/enlace) no depende de este panel y sigue bloqueada
por la ausencia del contrato de TEC-147; ver `docs/reportes-precio-enlace.md`.
