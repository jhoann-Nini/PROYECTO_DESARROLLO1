# Cierre de la auditoría técnica de TecReview

**Fecha:** 21 de noviembre de 2026. **Rama de trabajo:** `nini`.

La auditoría del 20 de noviembre de 2026 revisó las observaciones del profesor y produjo los hallazgos H-01 a H-16, agrupados en cinco fases. Este documento resume qué se resolvió, dónde está documentado y qué queda abierto.

## Migraciones de la auditoría

| Migración | Contenido | Estado en Supabase |
|---|---|---|
| 020 | Revisión humana de reseñas retenidas por el filtro automático | Aplicada |
| 021 | Moderación de reportes de ofertas con historial append-only; registra 017 y 018 | Aplicada |
| 022 | Enlace y fecha de actualización de las ofertas | Aplicada |
| 023 | Revocar privilegios de la API pública (`anon`, `authenticated`, `PUBLIC`) | **Pendiente de aplicar** |
| 024 | Texto revisado en la auditoría y suspensión de cuentas (Caso 6) | **Pendiente de aplicar** |

Con `ddl-auto=validate`, el backend no arranca si falta una migración que usan sus entidades. La 023 no cambia la estructura: el backend funciona con o sin ella. **La 024 sí:** hay que aplicarla antes de desplegar el backend del Caso 6.

El Caso 6 (moderación inteligente y antibots) se documenta aparte en `caso6-moderacion-antibots.md`.

## Hallazgos

| Hallazgo | Fase | Resolución | Documentación |
|---|---|---|---|
| H-01 Reseñas retenidas sin salida | 1 | Cola «Revisión automática», aprobar o rechazar con auditoría | `api.md` §30, `moderacion-resenas.md` |
| H-02 «Productos verificados» | 1 | «Productos registrados en el catálogo» | — |
| H-03 Verificación sin respaldo | 1 y 3 | Textos corregidos; sello de tienda desde `establecimiento.verificado`; `verificado_por` real en fichas | `api.md` §18.6 y §32 |
| H-04 «Disponible» = producto activo | 3 y 4 | Disponibilidad desde las ofertas en detalle, tarjetas y comparador | `api.md` §32.5 |
| H-05 Reportes de ofertas incompletos | 2 | Moderación, historial, un reporte abierto por oferta | `api.md` §31 |
| H-06 Dos fuentes de ofertas, sin enlace | 3 | `producto_establecimiento` como única fuente; `url_oferta` | `api.md` §32, `carga-ofertas.md` |
| H-07 Abuso de reportes de reseñas | 2 | Límite de 10 reportes por hora (reseñas y ofertas). El umbral de auto-ocultamiento **no se cambió**, por decisión del equipo | `api.md` §31 |
| H-08 Reportar desde el detalle | 1 | Botón «Reportar» en reseñas ajenas | — |
| H-09 Filtro distinto en frontend y backend | 1 | Listas y detección alineadas | `moderacion-resenas.md` |
| H-10 Ganador engañoso en el comparador | 4 | Insignias por criterio con dato y fuente; sin ganador global | `comparador-filas-por-categoria.md` |
| H-11 «Sin dato» como diferencia | 4 | Filas «Datos incompletos»; «8 GB» = «8gb» | `comparador-filas-por-categoria.md` |
| H-12 Producto no registrado | 4 | Búsqueda por nombre, marca y categoría; aviso de catálogo, alternativas y aviso para búsquedas genéricas | `presupuesto-catalogo-general.md` |
| H-13 Documentación desactualizada | 2 a 5 | Endpoints documentados; TEC-149 → TEC-105 en la cola de reseñas; TEC-116 y TEC-128 corregidas | `historial-usuario-sprint-2.md` |
| H-14 Base de datos y RLS | 2 y 5 | `schema_version` completo; RLS sin políticas confirmado como intencional; migración 023 | `modelo-datos.md` |
| H-15 `ValoracionService.crearOActualizar` | 5 | Eliminado (era inalcanzable y borraba comentarios) | — |
| H-16 Autoría de reseñas por nombre | 5 | La interfaz decide la autoría solo por id | — |

Dos puntos de la auditoría resultaron **falsos positivos** al revisarlos: las migraciones 001 y 016 sí registran su versión, y el cierre forzado de la JVM en Surefire no se reproduce.

## Abierto

- **Cargar ofertas reales** en «Ofertas por tienda» siguiendo `carga-ofertas.md`. Sin ellas, todos los productos muestran «Sin tiendas registradas».
- **Aplicar la 023** en Supabase y ejecutar `docs/sql/tests/023_verificacion_privilegios.sql`.
- **Privilegios por defecto de `supabase_admin`** en public: siguen otorgando permisos a `anon` en objetos que se creen desde el panel de Supabase. Solo se pueden cambiar con ese rol.
- **Límites en memoria:** el límite general de peticiones vive en la memoria de cada instancia; con varias réplicas no se comparte.
- **Modelo de ofertas:** una sola publicación por producto y sitio, y sin campo de moneda (todo se interpreta en COP).
- **Compra no verificable:** TecReview identifica al usuario registrado que publica una reseña, pero no puede demostrar la compra. Los textos ya no lo afirman.
