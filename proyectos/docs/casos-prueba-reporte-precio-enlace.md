# TEC-150: textos y casos de prueba para reportar precio o enlace incorrecto

## Alcance

Este documento prepara los mensajes y escenarios de validación para la historia **TEC-127: HU-S2-13 — Reportar precio o enlace incorrecto**. El formulario debe estar asociado a una oferta concreta del producto para que el equipo pueda identificar la tienda y el precio que se reportan.

La descripción de TEC-150 está vacía. Por eso, los textos y reglas que siguen son una propuesta coherente con la historia y deben contrastarse con el contrato que definan TEC-147 (endpoint), TEC-148 (botón) y TEC-149 (cola de administración). Los casos son escenarios propuestos; no se presentan como pruebas ejecutadas ni automatizadas.

## Textos propuestos para la interfaz

| Elemento o situación | Texto |
| --- | --- |
| Acción junto a una oferta | `Reportar precio o enlace incorrecto` |
| Título del diálogo | `Reportar un problema con esta oferta` |
| Ayuda inicial | `Ayúdanos a mantener actualizada la información de {producto} en {tienda}.` |
| Pregunta del grupo de opciones | `¿Qué problema encontraste?` |
| Motivo: precio | `El precio no coincide` |
| Motivo: enlace | `El enlace no funciona` |
| Motivo general | `Otro problema` |
| Etiqueta del detalle | `Detalles adicionales (opcional)` |
| Placeholder del detalle | `Cuéntanos qué encontraste. No incluyas datos personales.` |
| Validación sin motivo | `Selecciona un problema para continuar.` |
| Envío en curso | `Enviando…` |
| Confirmación | `Gracias. Recibimos tu reporte y lo revisaremos.` |
| Error de envío | `No pudimos enviar el reporte. Inténtalo de nuevo.` |
| Cerrar sin enviar | `Cancelar` |
| Enviar | `Enviar reporte` |

### Decisiones por confirmar con TEC-147/TEC-148

- Si reportar requiere iniciar sesión. Si se requiere, texto sugerido: `Inicia sesión para reportar esta oferta.`
- Los valores internos admitidos para los motivos y si `Otro problema` exige detalle.
- Qué respuesta de la API representa un reporte duplicado y qué mensaje verá la persona.
- Confirmar que el payload identifica la oferta (producto, establecimiento y precio observado) sin confiar en datos editables del navegador.

## Casos de prueba propuestos

| ID | Escenario y pasos | Resultado esperado | Estado de cobertura |
| --- | --- | --- | --- |
| CP-150-01 | Abrir el detalle de un producto con ofertas y localizar la acción de reporte en una oferta. | La acción queda asociada visualmente a esa oferta y no a otra tienda. | Pendiente: depende de TEC-148. |
| CP-150-02 | Abrir el formulario de reporte desde una oferta. | El formulario identifica el producto y la tienda correctos; muestra las opciones de problema y los botones para cancelar y enviar. | Pendiente: depende de TEC-148. |
| CP-150-03 | Enviar sin elegir un motivo. | No se envía la solicitud y aparece `Selecciona un problema para continuar.` | Pendiente: depende de TEC-148. |
| CP-150-04 | Elegir `El precio no coincide` y enviar. | Se envía un reporte ligado a la oferta seleccionada; aparece confirmación solo tras una respuesta exitosa de la API. | Pendiente: depende de TEC-147 y TEC-148. |
| CP-150-05 | Elegir `El enlace no funciona` y enviar. | Se envía el motivo de enlace con el identificador de la oferta correcta y se confirma el resultado aceptado. | Pendiente: depende de TEC-147 y TEC-148. |
| CP-150-06 | Elegir `Otro problema` y completar el detalle. | Se conserva el texto y se envía según las reglas acordadas para el endpoint. | Pendiente: contrato de TEC-147 por definir. |
| CP-150-07 | Simular un error de red o una respuesta de error del endpoint. | No se muestra éxito; aparece `No pudimos enviar el reporte. Inténtalo de nuevo.` y se conservan los datos para reintentar. | Pendiente: depende de TEC-147 y TEC-148. |
| CP-150-08 | Enviar un reporte y pulsar varias veces el botón durante la espera. | El botón indica `Enviando…` y no crea solicitudes duplicadas desde el mismo envío. | Pendiente: depende de TEC-148. |
| CP-150-09 | Abrir y cancelar el formulario, o cerrarlo con Escape. | El diálogo se cierra sin enviar datos y el foco regresa a la acción que lo abrió. | Pendiente: depende de TEC-148. |
| CP-150-10 | Reintentar un reporte tras un rechazo del servidor. | Se muestra el error; al corregir o reintentar, solo se confirma cuando el endpoint responde correctamente. | Pendiente: depende de TEC-147 y TEC-148. |
| CP-150-11 | Consultar la cola administrativa después de crear un reporte. | El reporte aceptado aparece con producto, tienda, motivo y estado inicial definidos por TEC-147/TEC-149. | Pendiente: depende de TEC-147 y TEC-149. |
| CP-150-12 | Usar el formulario con teclado y en una pantalla estrecha. | Etiquetas legibles, foco visible, diálogo operable con teclado y sin desbordamiento horizontal. | Pendiente: validación manual después de TEC-148. |

## Relación con el código actual

- El frontend ya presenta ofertas por establecimiento (`ProductoOferta`) y detalles de tienda (`TiendaPrecio`), pero no se encontró una acción de reporte de precio/enlace en esos componentes.
- Existe un flujo de reportes para reseñas; sirve como referencia de accesibilidad y manejo de estados, pero su endpoint y motivos no se deben asumir como contrato para reportar ofertas.
- La documentación de la API contempla `POST /api/resenas/{idResena}/reportes` para reseñas. Esa ruta no es el endpoint de TEC-127.
- No se ejecutaron pruebas para TEC-150: este entregable es una especificación documental de textos y escenarios. La automatización y validación manual quedan pendientes de que TEC-147 y TEC-148 estén implementadas.

## Referencias

- Historia Jira: TEC-127 — HU-S2-13, Reportar precio o enlace incorrecto.
- Subtareas relacionadas: TEC-147 endpoint, TEC-148 botón de reporte y TEC-149 cola administrativa.
- Modelo frontend de ofertas: `proyectos/frontend/src/types/producto.ts` (`ProductoOferta`, `TiendaPrecio`).
- Flujo existente de referencia (reportes de reseñas): `proyectos/frontend/src/app/resenas/ReportarResenaModal.tsx`.
