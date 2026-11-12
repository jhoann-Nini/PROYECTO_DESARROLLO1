# TEC-148 — Reporte de precio o enlace incorrecto

**Estado:** Bloqueada. No implementada.
**Rama de trabajo:** `adrian` (sin cambios de código para esta tarea).
**Dependencia:** TEC-147 debe exponer y documentar el endpoint de reportes de
precio/enlace.

---

## 1. Verificación realizada

Se revisó el frontend actual en busca de un contrato o endpoint de reportes de
precio o enlace:

- `src/services/api.ts` solo contiene el reporte de **reseñas**
  (`POST /api/resenas/{idResena}/reportes`) y las rutas de moderación de
  reseñas (`/api/moderacion/...` y `/api/admin/resenas/...`).
- No existen tipos, formularios ni llamadas relacionadas con precios, tiendas o
  enlaces reportados.
- El contrato de moderación documentado cubre únicamente reseñas y sus
  reportes; no incluye un recurso de reportes de precio/enlace.

Por lo tanto, no hay una ruta real contra la cual construir el botón, el
formulario o la persistencia sin inventar contrato. La tarea no se marca como
completada.

## 2. Qué falta antes de implementar

TEC-147 debe definir y documentar, como mínimo:

1. Ruta y método para crear el reporte (por ejemplo, producto, tienda y enlace
   afectados).
2. Autenticación requerida y permisos por rol.
3. Cuerpo de la petición: identificador de la oferta o enlace, motivo y
   descripción.
4. Respuesta exitosa y códigos de error esperados (`400`, `401`, `403`, `404`,
   `409`, `429`).
5. Reglas de duplicados, límites por usuario y estado inicial del reporte.
6. Contrato de consulta para moderación, si el equipo decide revisar estos
   reportes desde el panel de moderación.

## 3. Propuesta de implementación futura

Cuando exista el contrato:

- Agregar tipos en un módulo dedicado (por ejemplo,
  `src/types/reportesOferta.ts`) sin mezclarlos con los reportes de reseñas.
- Añadir la llamada autenticada en `src/services/api.ts` y sus pruebas de ruta,
  cuerpo y errores.
- Incorporar el botón **Reportar precio o enlace** en la ficha de producto o en
  la tarjeta de tienda, con etiqueta accesible y texto de contexto.
- Mostrar confirmación, error recuperable y estado de envío; no ocultar el
  botón como única señal de éxito.
- Cubrir envío exitoso, error de red, error de validación y duplicado.
- Si el backend lo permite, enlazar los reportes con el panel de moderación
  mediante una pestaña o filtro separado.

## 4. Decisión

No se simula persistencia ni se crea una ruta ficticia. La tarea permanece
bloqueada hasta que TEC-147 entregue el contrato real.
