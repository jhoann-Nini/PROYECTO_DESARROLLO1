package com.example.backend.dto;

import java.time.LocalDateTime;

public record ValoracionResponse(
        Long idValoracion,
        Long idProducto,
        String nombreProducto,
        Long idUsuario,
        String nombreUsuario,
        Integer puntuacion,
        LocalDateTime fechaCreacion,
        Boolean estado
) {
}
