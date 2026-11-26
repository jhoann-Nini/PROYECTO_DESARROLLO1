package com.example.backend.dto.comunidad;

import java.time.LocalDateTime;

/** Decisión registrada sobre un contenido, con el texto que vio el moderador. */
public record AuditoriaModeracionComunidadResponse(
    Long idAuditoria,
    String accion,
    String motivo,
    String contenidoRevisado,
    String moderador,
    LocalDateTime fechaEvento) {
}
