# Historial de usuario — Sprint 2

**Proyecto:** TecReview (TEC)  
**Sprint:** TEC Sprint 2  
**Actualización:** 18 de noviembre de 2026  
**Fuente de alcance:** archivo de seguimiento Historial_Usuario_Sprint2.odt adjunto por el equipo.  
**Estado:** todas las historias del Sprint 2 están LISTO, según la actualización confirmada por el equipo.

## 1. Resumen

| Indicador | Resultado |
|---|---:|
| Historias de usuario | 15 |
| Subtareas registradas | 80 |
| Historias LISTO | 15 |
| Historias EN CURSO | 0 |
| Avance por historias | 100 % |

El estado de las historias se actualizó con la confirmación del equipo. El archivo original de seguimiento consignaba anteriormente 10 historias LISTO y 5 EN CURSO; esta documentación refleja el estado actualizado comunicado el 18 de noviembre de 2026.

## 2. Estado de las historias

| Clave | Historia de usuario | Área | Estado actualizado |
|---|---|---|---|
| TEC-52 / HU-S2-01 | Buscar (rediseño) | Búsqueda y catálogo | LISTO |
| TEC-53 / HU-S2-02 | Filtrar y ordenar productos (rediseño) | Búsqueda y catálogo | LISTO |
| TEC-64 / HU-S2-03 | Publicar reseña | Reseñas y calificaciones | LISTO |
| TEC-70 / HU-S2-04 | Editar y eliminar reseña | Reseñas y calificaciones | LISTO |
| TEC-74 / HU-S2-05 | Consultar reseñas y calificaciones | Reseñas y calificaciones | LISTO |
| TEC-88 / HU-S2-06 | Límite de reseñas (Rate Limiting) | Control y moderación | LISTO |
| TEC-95 / HU-S2-07 | Filtro de comentarios | Control y moderación | LISTO |
| TEC-100 / HU-S2-08 | Reportar una reseña | Control y moderación | LISTO |
| TEC-105 / HU-S2-09 | Cola de moderación | Control y moderación | LISTO |
| TEC-110 / HU-S2-10 | Comparador | Comparador | LISTO |
| TEC-116 / HU-S2-11 | Administrar tiendas y precios | Tiendas y precios | LISTO |
| TEC-125 / HU-S2-12 | Ver dónde comprar | Tiendas y precios | LISTO |
| TEC-127 / HU-S2-13 | Reportar precio o enlace incorrecto | Tiendas y precios | LISTO |
| TEC-128 / HU-S2-15 | Tienda verificada | Tiendas y precios | LISTO |
| TEC-129 / HU-S2-17 | Pruebas (Seguridad y Regresión) | Seguridad y QA | LISTO |

> Se conservan las claves HU-S2 originales del archivo del equipo. La secuencia no es continua: el historial incluye HU-S2-15 y HU-S2-17, sin renumerarlas.

## 3. Alcance funcional por bloque

### Búsqueda, filtros y catálogo

- **HU-S2-01 (TEC-52):** rediseño de búsqueda con modal accesible, gestión del foco, filtro rápido por tipo de producto, esqueletos de carga y productos más vendidos cuando el campo está vacío.
- **HU-S2-02 (TEC-53):** rediseño de filtros y ordenamiento con panel lateral o cajón móvil, rangos de precio, selección de marcas con exclusión, chips de filtros activos y tarjetas de producto mejoradas con calificación y tiendas asociadas.

### Reseñas y calificaciones

- **HU-S2-03 (TEC-64):** publicación de reseñas mediante formulario escalonado, puntuación de 1 a 5 y comentario.
- **HU-S2-04 (TEC-70):** edición y eliminación de reseñas propias, con control de propiedad en backend y respuesta 403 cuando el actor no tiene autorización.
- **HU-S2-05 (TEC-74):** consulta de reseñas y calificaciones en la ficha técnica; promedio dinámico que excluye reseñas ocultas o pendientes.

### Control y moderación

- **HU-S2-06 (TEC-88):** límite de una reseña por usuario y producto (409 Conflict) y cuota horaria (429 Too Many Requests).
- **HU-S2-07 (TEC-95):** filtro automático de comentarios para detectar enlaces y palabras restringidas; el contenido que requiere revisión queda pendiente.
- **HU-S2-08 (TEC-100):** flujo para reportar reseñas desde la plataforma.
- **HU-S2-09 (TEC-105):** cola administrativa para revisar y publicar, rechazar u ocultar reseñas reportadas o pendientes.

### Comparador

- **HU-S2-10 (TEC-110):** selección de dos productos, consulta de comparación por identificadores y presentación tabular de especificaciones y precios.

### Tiendas, precios y seguridad

- **HU-S2-11 (TEC-116):** administración de tiendas y precios asociados a productos.
- **HU-S2-12 (TEC-125):** sección «Dónde comprar» en la ficha del producto, con enlaces externos seguros mediante rel="noopener noreferrer".
- **HU-S2-13 (TEC-127):** reporte de precios o enlaces incorrectos asociados a tiendas.
- **HU-S2-15 (TEC-128):** identificación visual de tiendas verificadas mediante un sello.
- **HU-S2-17 (TEC-129):** pruebas de seguridad y regresión; incluye CORS, políticas RLS en Supabase, cabeceras seguras, auditoría de dependencias y regresión.

## 4. Criterio de interpretación del estado

El estado **LISTO** refleja el seguimiento actualizado de las historias y subtareas comunicado por el equipo. La evidencia automatizada del repositorio se documenta por separado en [Pruebas de integración](./pruebas-integracion.md). Un CI exitoso no sustituye pruebas manuales de aceptación ni demuestra por sí mismo que las políticas y migraciones estén aplicadas en cada entorno remoto.

## 5. Trazabilidad

- Seguimiento original: Historial_Usuario_Sprint2.odt (adjunto del equipo).
- Implementación y pruebas: código fuente y CI del repositorio.
- Migraciones: ../backend/src/main/resources/db/migration/.
- Documentación de API: [api.md](./api.md).
