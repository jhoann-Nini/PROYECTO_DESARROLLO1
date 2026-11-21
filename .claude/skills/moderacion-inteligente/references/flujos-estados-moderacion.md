# Flujos, estados y piezas de la moderación

Rutas Java relativas a `proyectos/backend/src/main/java/com/example/backend/`.
Migraciones en `proyectos/backend/src/main/resources/db/migration/` (copia en `proyectos/docs/sql/`).

## 1. Filtro automático de reseñas

- `service/ResenaModerationService.java`:
  - `determinarEstado(comentario)`, `estadoTrasEdicion(actual, comentario)`, `detectarMotivos`.
  - Motivos: `MOTIVO_PALABRA_NO_PERMITIDA`, `MOTIVO_ENLACE`, `MOTIVO_TEXTO_REPETIDO`.
  - Lista `PALABRAS_BLOQUEADAS` + sustituciones leet + patrón de enlaces/dominios.
- Si salta una regla, la reseña queda en `EstadoModeracion.PENDIENTE` con `motivo_moderacion`.
- Revisión humana: `controller/RevisionResenasController.java` (`/api/moderacion/resenas/en-revision`,
  aprobar/rechazar) + `service/RevisionResenasService.java`. Salir de `PENDIENTE` exige un evento
  `APROBAR` o `RECHAZAR` en `resena_moderacion_auditoria` (migración 020).
- UI: `components/moderacion/ColaRevisionAutomatica.tsx`.
- Migraciones: 012 (moderación automática), 020 (revisión y estado `RECHAZADA`).

## 2. Reportes de reseñas

- Crear: `POST /api/reportes` (y ruta anidada) → `ReporteResenaController`, `ReporteResenaService`.
- Estados: `entity/EstadoReporte.java` = `PENDIENTE, EN_REVISION, ACEPTADO, RECHAZADO`
  (CHECK `chk_reporte_resena_estado`).
- Auto-ocultamiento: trigger de la migración 006, umbral **3 reportes activos** →
  `resena.oculta_por_reportes`. **No cambiar** (decisión H-07).
- Cambio de estado: `PATCH /api/moderacion/reportes/{idReporte}/estado`;
  historial: `GET /api/moderacion/reportes/{idReporte}/historial`.
- Colas: `GET /api/moderacion/resenas/reportadas`, `/pendientes`, `GET /api/moderacion/reportes?estado=`.
- Acciones: ocultar, publicar, rechazar reporte individual, rechazar en lote
  (`ModeracionResenasController`, cuerpo `AccionModeracionRequest {motivo}`).
- Historiales: `reporte_resena_historial` (reasignaciones, 007), `reporte_resena_decision_auditoria`
  (decisiones, 010), `resena_moderacion_auditoria` (ocultar/restaurar/aprobar/rechazar, 010/020).
- Integridad multirol y auditoría: 008, 009, 011.

## 3. Reportes de ofertas

- Crear: `POST /api/reportes/ofertas` (`ReporteOfertaController`, `ReporteOfertaService`).
  Cuerpo: `idProducto`, `idEstablecimiento`, `motivo` ∈ `precio_incorrecto | enlace_incorrecto`,
  `descripcion` ≤ 2000. Respuestas: 201, 400, 401, 403, 404, 409 (abierto duplicado), 429.
- Moderación: `/api/moderacion/ofertas/reportes` (listar, `/{id}`, `/{id}/en-revision`,
  `/{id}/aceptar`, `/{id}/rechazar`) → `ModeracionReportesOfertaService`.
- Migraciones: 018 (tabla), 021 (índice único parcial, `reporte_oferta_historial` append-only,
  trigger de transiciones, columnas de origen inmutables, trigger diferido que exige evento).
- UI: `components/ReportarOfertaModal.tsx`, `components/moderacion/ColaReportesOfertas.tsx`.
- Documentación: `proyectos/docs/api.md` §31, `proyectos/frontend/docs/reportes-precio-enlace.md`.

## 4. Autorización

- Roles (texto exacto): `Usuario registrado`, `Moderador`, `Administrador`,
  `Representante de establecimiento`. Cuentas multirrol.
- `config/ModeratorAuthorizationManager.java`, `AdminAuthorizationManager.java`,
  `SecurityConfig.java` + revalidación en el servicio.
- Cuenta suspendida no modera aunque conserve asignaciones. Moderador ≠ permisos de catálogo.

## 5. Invariantes a comprobar en cualquier cambio

1. Rol activo y cuenta activa (en seguridad y en servicio).
2. Sin conflicto de interés (autor, creador del reporte).
3. Transición permitida; estados finales inmutables.
4. Evento de historial en la misma transacción.
5. Justificación cuando la acción la exige.
6. Límite de 10 reportes/hora compartido; un reporte de oferta abierto por usuario y oferta.
7. Pruebas 401/403 para cada endpoint nuevo.

## Documentación de fases

`proyectos/docs/FASE_2_AUDITORIA_Y_OCULTAMIENTO_MODERACION.md`,
`proyectos/docs/FASE_2_AUTORIZACION_REPRESENTANTE.md`,
`proyectos/frontend/docs/moderacion-resenas.md`.
