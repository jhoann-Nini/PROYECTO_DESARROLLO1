package com.example.backend.dto.comunidad;

import java.time.LocalDateTime;

/** Reporte en la cola de moderación, con el contenido reportado y su estado. */
public record ReporteModeracionComunidadResponse(
    Long idReporte,
    String tipo,
    Long idContenido,
    Long idPublicacion,
    String titulo,
    String contenido,
    String autorContenido,
    String reportante,
    String motivo,
    String descripcion,
    String estado,
    LocalDateTime fechaCreacion,
    long reportesActivos,
    boolean ocultaPorReportes,
    boolean ocultaPorModeracion,
    boolean eliminada) {
}
