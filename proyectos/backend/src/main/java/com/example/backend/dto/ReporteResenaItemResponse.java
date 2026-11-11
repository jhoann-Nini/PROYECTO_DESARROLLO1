package com.example.backend.dto;

import com.example.backend.entity.EstadoReporte;
import java.time.LocalDateTime;

public record ReporteResenaItemResponse(
        Long idReporte,
        Long idUsuarioReportante,
        String nombreReportante,
        String motivo,
        String descripcion,
        EstadoReporte estado,
        LocalDateTime fechaCreacion
) {}

