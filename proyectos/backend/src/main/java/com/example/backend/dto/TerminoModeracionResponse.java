package com.example.backend.dto;

import java.time.LocalDateTime;

/** Término de moderación tal como lo ve un administrador. */
public record TerminoModeracionResponse(
    Long idTermino,
    String termino,
    String categoria,
    String etiquetaCategoria,
    boolean activo,
    String creadoPor,
    LocalDateTime fechaCreacion,
    String desactivadoPor,
    LocalDateTime fechaDesactivacion
) {}
