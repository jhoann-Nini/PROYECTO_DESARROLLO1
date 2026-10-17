package com.example.backend.dto;

import java.time.LocalDateTime;

public record ResenaResponse(
        Long idResena,
        Long idProducto,
        String nombreProducto,
        Long idUsuario,
        String nombreUsuario,
        String comentario,
        LocalDateTime fechaCreacion,
        Boolean estado
) {
}
