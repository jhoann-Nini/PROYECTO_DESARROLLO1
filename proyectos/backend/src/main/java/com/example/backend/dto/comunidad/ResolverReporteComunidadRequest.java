package com.example.backend.dto.comunidad;

/**
 * Resolución de un reporte. Al aceptar, {@code accion} es NINGUNA, OCULTAR o
 * ELIMINAR; {@code motivo} es el de esa decisión (si falta, se usa la
 * justificación).
 */
public record ResolverReporteComunidadRequest(String justificacion, String accion, String motivo) {
}
