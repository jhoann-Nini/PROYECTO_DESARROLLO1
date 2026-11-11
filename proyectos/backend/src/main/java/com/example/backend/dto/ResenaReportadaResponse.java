package com.example.backend.dto;

import java.time.LocalDateTime;
import java.util.List;

public record ResenaReportadaResponse(
        Long idResena,
        Long idProducto,
        String nombreProducto,
        Long idAutor,
        String nombreAutor,
        String comentario,
        Integer puntuacion,
        LocalDateTime fechaCreacion,
        Boolean estado,
        Boolean ocultaPorReportes,
        long totalReportes,
        long reportesPendientes,
        List<ReporteResenaItemResponse> reportes
) {}

