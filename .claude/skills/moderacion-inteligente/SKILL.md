---
name: moderacion-inteligente
description: Usar cuando en TecReview se trabaje con moderación de reseñas, el filtro automático de contenido, reseñas pendientes o en revisión, reportes de reseñas o de ofertas (precio o enlace incorrecto), colas del panel de moderación, ocultar o restaurar contenido, umbrales de auto-ocultamiento, límites de reportes por hora o historiales de decisiones de moderadores.
---

# Moderación TecReview

## Principio

La moderación de TecReview es **determinista, auditada y con doble control**: reglas
explícitas en Java, transiciones forzadas por triggers en PostgreSQL, historiales
append-only y autorización tanto en `SecurityConfig` como en el servicio. Cualquier cambio
debe conservar las cuatro propiedades.

**No hay IA ni aprendizaje automático en la moderación actual.** El filtro es una lista de
reglas (`ResenaModerationService`). Una propuesta con modelos de lenguaje o clasificadores
es una funcionalidad nueva: se presenta como propuesta con costos, privacidad y pruebas, y
espera aprobación.

## Cuándo usarla / cuándo no

| Usar | No usar |
|---|---|
| Filtro automático, cola de revisión, reportes, ocultamiento, auditoría | Asignación de roles o verificación de establecimientos (salvo impacto en moderación) |
| Diseñar un flujo nuevo de moderación (p. ej. auto-ocultar ofertas) | Solo estilos del panel sin tocar lógica |
| Revisar por qué una reseña quedó pendiente u oculta | Esquema puro → `supabase-auditor`; contrato HTTP puro → `springboot-api-auditor` |

## Modelo de dominio

Detalle de estados, tablas, endpoints y migraciones:
[references/flujos-estados-moderacion.md](references/flujos-estados-moderacion.md).

Resumen:
- **Reseña**: `estado` (borrado lógico del autor) ≠ `estado_moderacion`
  (`PUBLICADA | PENDIENTE | RECHAZADA`) ≠ `oculta_por_reportes` (automático) ≠
  `oculta_por_moderacion` (manual). No mezclar estas cuatro dimensiones.
- **Reporte de reseña / de oferta**: `PENDIENTE → EN_REVISION → ACEPTADO | RECHAZADO`;
  los estados finales no cambian.
- **Límite**: `LimiteReportesService.MAX_REPORTES_POR_HORA = 10`, compartido entre reportes
  de reseñas y de ofertas → `429`.
- **Duplicados**: un usuario solo puede tener un reporte de oferta abierto por oferta
  (índice único parcial, migración 021) → `409`.

## Procedimiento

1. **Ubicar el flujo**: reseña (filtro/revisión), reporte de reseña o reporte de oferta.
2. **Trazar la cadena completa** y citar `archivo:línea` en cada eslabón:
   controlador → servicio → repositorio → trigger/función SQL → tabla de historial →
   componente en `proyectos/frontend/src/components/moderacion/`.
3. **Comprobar invariantes** (lista en la referencia): conflicto de interés, rol activo,
   cuenta no suspendida, justificación, transición válida, evento de historial en la misma
   transacción.
4. **Proponer el cambio** indicando: archivos Java, migración SQL nueva (nunca editar una
   aplicada), DTO y endpoint, componente de UI, documentación (`proyectos/docs/api.md`, `proyectos/docs/FASE_*`,
   `frontend/docs/moderacion-resenas.md` o `reportes-precio-enlace.md`) y pruebas.
5. **Pruebas primero**: un test que demuestre el rechazo de la transición o acción indebida.
   Si depende de un trigger, H2 no lo ejecuta: hace falta un test con PostgreSQL
   (patrón `ReporteResenaPostgresIntegrationTest`, Testcontainers).

## Reglas obligatorias

- Decisiones ya aprobadas en la auditoría:
  - No cambiar el umbral de auto-ocultamiento de reseñas (3 reportes activos, migración 006; hallazgo H-07).
  - Mantener el motivo `enlace_incorrecto` hasta la Fase 3.
- No modificar ni borrar filas de historiales append-only; no editar migraciones aplicadas.
- Toda acción de moderación nueva valida rol en `SecurityConfig` **y** en el servicio.
- Un moderador no modera contenido propio ni resuelve reportes que creó o que afectan a su
  reseña.
- No ejecutar migraciones ni cambiar datos en Supabase (ver `supabase-auditor`).
- Los textos de la interfaz no deben afirmar "verificado" sin respaldo (Fase 1, H-02/H-03).

## Validaciones

Desde `proyectos/backend`:

```bash
./mvnw test -Dtest='Moderacion*,ReporteResena*,ReporteOferta*,Resena*,RevisionResenas*'
```

`ReporteResenaPostgresIntegrationTest` necesita Docker. Desde `proyectos/frontend`:

```bash
npx vitest run src/components/moderacion src/app/resenas src/components/ReportarOfertaModal.test.tsx
```

## Criterios de aceptación

- Cada transición nueva tiene un test positivo y uno de rechazo.
- Las acciones nuevas tienen pruebas de 401 y 403 y quedan registradas en el historial.
- Límites y conflictos de interés siguen cubiertos por pruebas.
- Documentación de API y de fase actualizada.

## Errores frecuentes

| Error | Corrección |
|---|---|
| Usar `estado=false` para ocultar por moderación | `estado` es el borrado lógico del autor; usar `oculta_por_moderacion` |
| Cambiar `estado` de un reporte con `save()` sin evento de historial | El trigger diferido exige el evento en la misma transacción |
| Confiar solo en los tests H2 para lógica de triggers | Añadir prueba en PostgreSQL o verificación SQL documentada |
| Describir el filtro como "IA" en la documentación o la interfaz | Es un filtro por reglas: describirlo así |
