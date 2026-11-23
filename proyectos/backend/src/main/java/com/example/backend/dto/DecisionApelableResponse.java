package com.example.backend.dto;

import java.time.LocalDateTime;

/**
 * Decisión de moderación sobre una reseña del autor (últimos 90 días), con
 * su apelación si la hay. {@code apelable} indica si todavía puede apelarla.
 */
public record DecisionApelableResponse(
    Long idAuditoria,
    Long idResena,
    String nombreProducto,
    String comentarioRevisado,
    String accion,
    String motivoDecision,
    LocalDateTime fechaDecision,
    LocalDateTime plazoHasta,
    boolean apelable,
    ApelacionResponse apelacion
) {}
