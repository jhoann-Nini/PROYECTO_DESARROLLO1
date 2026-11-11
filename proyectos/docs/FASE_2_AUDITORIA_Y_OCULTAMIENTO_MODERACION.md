# Fase 2 — Auditoría de decisiones y ocultamiento manual de reseñas

## Alcance

Esta entrega amplía la moderación existente sin alterar las migraciones 006 ni 007.

La migración nueva es:

- `010_auditoria_decisiones_moderacion.sql`
- Requiere que `007_moderacion_reportes` esté registrada en `schema_version`.
- No ejecuta ni modifica datos históricos.
- No debe aplicarse dos veces.

## Separación de responsabilidades

| Campo o tabla | Responsabilidad |
|---|---|
| `resena.estado` | Borrado lógico solicitado por el autor |
| `resena.oculta_por_reportes` | Ocultamiento automático calculado por reportes no rechazados |
| `resena.oculta_por_moderacion` | Ocultamiento manual decidido por Moderador o Administrador |
| `reporte_resena_historial` | Historial preexistente de reasignaciones de reportes (migración 007) |
| `reporte_resena_decision_auditoria` | Historial append-only de cambios de estado de reportes |
| `resena_moderacion_auditoria` | Historial append-only de ocultamiento y restauración manual de reseñas |

Los dos nuevos historiales no reemplazan ni reutilizan `reporte_resena_historial`.

## Reglas de autorización

- Solo cuentas activas con asignación activa de Moderador o Administrador pueden ocultar/restaurar.
- La validación se realiza en SecurityConfig y nuevamente en el servicio.
- Una cuenta suspendida no puede moderar aunque conserve asignaciones.
- Un moderador no puede moderar su propia reseña ni resolver su propio reporte.
- El rol Moderador no concede permisos de administración de catálogo, roles o establecimientos.
- La justificación es obligatoria para ocultar y restaurar manualmente una reseña.

## Endpoints

### Decisiones sobre reportes

- `GET /api/moderacion/reportes/{idReporte}/historial`
- `PATCH /api/moderacion/reportes/{idReporte}/estado?estado=EN_REVISION&observacion=...`
- `PATCH /api/moderacion/reportes/{idReporte}/estado?estado=ACEPTADO&observacion=...`
- `PATCH /api/moderacion/reportes/{idReporte}/estado?estado=RECHAZADO&observacion=...`

La observación es opcional al iniciar la revisión (`PENDIENTE → EN_REVISION`) y obligatoria al aceptar o rechazar (`EN_REVISION → ACEPTADO | RECHAZADO`). Se guarda junto con el actor, estado anterior, estado nuevo y fecha. El backend asigna responsable y fecha de inicio al comenzar la revisión, y fecha de decisión y notas al resolverla, respetando las restricciones de la migración 007. Cada transición permitida queda en `reporte_resena_decision_auditoria`; no se reutiliza la tabla `reporte_resena_historial`, que conserva su propósito original de auditar reasignaciones.

### Ocultamiento manual de reseñas

- `PATCH /api/moderacion/resenas/{idResena}/ocultamiento`
- `GET /api/moderacion/resenas/{idResena}/historial`

Ejemplo para ocultar:

```json
{
  "ocultar": true,
  "motivo": "Incumple las normas de la comunidad"
}
```

Ejemplo para restaurar:

```json
{
  "ocultar": false,
  "motivo": "Revisión completada; contenido restaurado"
}
```

## Visibilidad pública

Las consultas públicas, estadísticas y rankings excluyen reseñas cuando cualquiera de estas condiciones se cumple:

- `estado = false`
- `oculta_por_reportes = true`
- `oculta_por_moderacion = true`

Restaurar el ocultamiento manual solo cambia `oculta_por_moderacion`; no revierte el borrado lógico ni el ocultamiento automático por reportes.

## Auditoría

Los nuevos historiales registran actor y fecha y están protegidos en PostgreSQL contra UPDATE, DELETE y TRUNCATE. La escritura de la reseña y su evento de auditoría se realiza en una misma transacción del backend. Las transiciones de reportes también persisten sus campos de responsable/fechas/notas y el evento de auditoría en una única transacción. La migración 010 actualiza el trigger de transición para validar asignaciones activas en `usuario_rol`, compatible con el modelo multirrol.

## Validación pendiente

La implementación y las pruebas deben validarse localmente con Maven antes de considerar cerrada esta parte de Fase 2. La migración está preparada, pero no se ha ejecutado en Supabase ni en otra base de datos remota.
