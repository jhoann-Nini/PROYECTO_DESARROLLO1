package com.example.backend.dto.comunidad;

/** Estado del contenido tras una decisión de moderación. */
public record ContenidoModeradoResponse(
    String tipo,
    Long id,
    String estadoModeracion,
    boolean ocultaPorModeracion,
    boolean ocultaPorReportes,
    boolean eliminada) {
}
