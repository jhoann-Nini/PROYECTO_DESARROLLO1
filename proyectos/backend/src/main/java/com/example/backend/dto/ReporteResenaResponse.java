package com.example.backend.dto;

import com.example.backend.entity.EstadoReporte;
import java.time.LocalDateTime;

/**
 * DTO para la respuesta de un reporte de reseña.
 * Expone exclusivamente los datos seguros del reporte sin filtrar información
 * interna ni objetos de entidad completos.
 */
public record ReporteResenaResponse(
        Long idReporte,
        Long idResena,
        String motivo,
        String descripcion,
        EstadoReporte estado,
        LocalDateTime fechaCreacion
) {
}

