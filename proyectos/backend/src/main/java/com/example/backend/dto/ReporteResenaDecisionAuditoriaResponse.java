package com.example.backend.dto;

import java.time.LocalDateTime;

public record ReporteResenaDecisionAuditoriaResponse(
        Long idAuditoria,
        Long idReporte,
        Long idModerador,
        String nombreModerador,
        String estadoAnterior,
        String estadoNuevo,
        String observacion,
        LocalDateTime fechaEvento
) {
}
