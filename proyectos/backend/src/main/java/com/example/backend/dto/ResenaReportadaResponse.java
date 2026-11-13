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
        Boolean ocultaPorModeracion,
        long totalReportes,
        long reportesPendientes,
        List<ReporteResenaItemResponse> reportes
) {
    public ResenaReportadaResponse(
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
    ) {
        this(
                idResena,
                idProducto,
                nombreProducto,
                idAutor,
                nombreAutor,
                comentario,
                puntuacion,
                fechaCreacion,
                estado,
                ocultaPorReportes,
                false,
                totalReportes,
                reportesPendientes,
                reportes
        );
    }
}
