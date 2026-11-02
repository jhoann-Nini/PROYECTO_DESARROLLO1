# TEC-104: casos de prueba y textos de la interfaz

## Alcance

Este documento reúne escenarios y textos visibles del flujo de reseñas y valoraciones de productos: consulta, búsqueda, publicación y valoración. La descripción de TEC-104 en Jira está vacía; se tomó como alcance el flujo existente de reseñas/valoraciones asociado a la historia TEC-100. Los textos se transcriben del frontend actual.

## Casos de prueba

| ID | Escenario y pasos | Resultado esperado | Cobertura automatizada actual |
| --- | --- | --- | --- |
| CP-104-01 | Abrir el detalle de un producto con valoraciones y reseñas. | Se ven el promedio, la cantidad de valoraciones y la pestaña de opiniones. | `DetalleProductoCliente.test.tsx`: muestra detalle y estadísticas. |
| CP-104-02 | Abrir opiniones de un producto sin reseñas. | Aparece el estado vacío, sin tarjetas de reseña. | `OpinionesProducto` se muestra dentro de `DetalleProductoCliente`; validar el texto en navegador. |
| CP-104-03 | En la página de reseñas, cargar reseñas y buscar por comentario, autor o producto. | La lista se filtra; si no hay coincidencias, se muestra el mensaje de filtro vacío. | `ResenasCliente.test.tsx`: lista, filtros y orden. |
| CP-104-04 | Simular fallo al cargar reseñas y pulsar «Reintentar». | Se informa el error de carga y se vuelve a solicitar la lista. | `ResenasCliente.test.tsx`: error y reintento. |
| CP-104-05 | Abrir la página de reseñas cuando la API devuelve una lista vacía. | Aparece el estado vacío de la comunidad. | `ResenasCliente.test.tsx`: estado vacío. |
| CP-104-06 | Sin sesión, intentar publicar una reseña en la comunidad o una opinión desde el detalle. | Se solicita iniciar sesión y se abre el modal de autenticación. | `ResenasCliente.test.tsx` cubre la reseña de comunidad; la opinión del detalle requiere validación manual. |
| CP-104-07 | Con sesión, enviar una reseña válida. | La reseña aparece en la lista y se confirma la publicación. | `ResenasCliente.test.tsx`: publicación exitosa. |
| CP-104-08 | Enviar una reseña vacía o sin seleccionar producto. | Se impide el envío y se indica qué campo completar. | El backend valida comentarios vacíos; comprobar los mensajes del formulario en navegador. |
| CP-104-09 | Escribir términos bloqueados y luego corregir el texto. | Aparece el aviso preventivo; desaparece cuando el comentario ya no contiene esos términos. | `ResenasCliente.test.tsx`: aviso preventivo y retiro del aviso. |
| CP-104-10 | Publicar una opinión desde el detalle con sesión y texto válido. | La opinión se agrega a la lista sin recargar la página. | `DetalleProductoCliente.test.tsx`: publicación de opinión. |
| CP-104-11 | Intentar valorar sin iniciar sesión. | Se abre el inicio de sesión y se informa que se requiere una cuenta. | `DetalleProductoCliente.test.tsx`: autenticación antes de valorar. |
| CP-104-12 | Elegir una puntuación entre 1 y 5 y guardarla. | Se confirma la valoración y se actualizan promedio y cantidad. | `DetalleProductoCliente.test.tsx`: guarda valoración y refresca estadísticas. |
| CP-104-13 | Ocultar/desactivar una valoración y consultar el promedio público. | La valoración inactiva no se incluye en el promedio ni en el conteo. | Prueba añadida en el PR #59; está pendiente de integrarse a `main`. |
| CP-104-14 | Revisar una reseña propia y una de otra persona. | Las acciones de edición/eliminación aparecen solo para la propia; «Reportar» aparece para las ajenas. | `ResenasCliente.test.tsx`: permisos de acciones y reporte. |
| CP-104-15 | Navegar por el formulario con teclado y revisar vista móvil. | Los controles tienen etiquetas, foco visible y mensajes legibles sin desbordar la pantalla. | Validación manual pendiente. |

## Textos actuales de la interfaz

### Valoraciones

| Situación | Texto |
| --- | --- |
| Etiqueta del control | `Selecciona una puntuación de 1 a 5 estrellas` |
| Sin sesión | `Debes iniciar sesión para valorar este dispositivo.` |
| Puntuación no válida | `Selecciona una puntuación entre 1 y 5 estrellas.` |
| Éxito | `Tu valoración de {n} estrella(s) fue guardada.` |
| Error inesperado | `No fue posible registrar tu valoración. Inténtalo más tarde.` |
| Acción de acceso | `Inicia sesión para valorar` |

### Reseñas y opiniones

| Situación | Texto |
| --- | --- |
| Título del formulario | `Comparte tu experiencia` |
| Campo del comentario | `Tu reseña` |
| Placeholder con sesión | `¿Qué te pareció el producto? Comparte detalles útiles…` |
| Placeholder sin sesión | `Inicia sesión para escribir tu reseña…` |
| Sin sesión | `Inicia sesión para publicar una reseña.` |
| Producto sin seleccionar | `Selecciona el producto sobre el que quieres opinar.` |
| Comentario vacío | `Escribe tu opinión antes de publicar.` |
| Aviso preventivo | `Tu reseña contiene términos que requieren revisión antes de publicarse.` |
| Lenguaje no permitido al enviar | `El comentario contiene palabras no permitidas. Mantén un lenguaje respetuoso.` |
| Enviando | `Publicando…` |
| Publicación exitosa | `Tu reseña fue publicada.` |
| Error inesperado al publicar | `No fue posible guardar tu reseña. Inténtalo de nuevo más tarde.` |
| Cargando lista | `Cargando reseñas de la comunidad…` |
| Lista vacía | `Aún no hay reseñas registradas.` |
| Sin coincidencias | `No encontramos reseñas con esos filtros.` |
| Explicación de promedio | `Promedio real de valoraciones, independiente de las reseñas.` |

### Texto de ayuda propuesto

El límite y la guía siguientes están en el PR #57, pendiente de integrarse a `main`:

> Cuenta tu experiencia con el producto. No incluyas datos personales. Máximo 1.000 caracteres.

## Archivos de referencia

- `proyectos/frontend/src/app/resenas/ResenasCliente.tsx`
- `proyectos/frontend/src/app/resenas/ResenasCliente.test.tsx`
- `proyectos/frontend/src/components/detalle/OpinionesProducto.tsx`
- `proyectos/frontend/src/components/detalle/ValoracionProducto.tsx`
- `proyectos/frontend/src/app/productos/[id]/DetalleProductoCliente.test.tsx`
- `proyectos/backend/src/test/java/com/example/backend/controller/ResenaSecurityIntegrationTest.java`
- `proyectos/backend/src/test/java/com/example/backend/controller/ValoracionSecurityIntegrationTest.java`

> Los escenarios descritos como validación manual no se marcaron como ejecutados. La tabla identifica pruebas que existen en el repositorio y señala cuando una cobertura está pendiente de integrar.
