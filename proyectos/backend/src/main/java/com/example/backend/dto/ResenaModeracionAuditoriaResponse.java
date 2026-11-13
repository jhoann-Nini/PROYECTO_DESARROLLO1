package com.example.backend.dto;

import java.time.LocalDateTime;

public record ResenaModeracionAuditoriaResponse(
        Long idAuditoria,
        Long idResena,
        Long idModerador,
        String nombreModerador,
        String accion,
        String motivo,
        LocalDateTime fechaEvento
) {
}
