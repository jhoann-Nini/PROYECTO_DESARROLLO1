package com.example.backend.dto;

import java.time.LocalDateTime;

public record ResenaResponse(
        Long idResena,
        Long idProducto,
        String nombreProducto,
        Long idUsuario,
        String nombreUsuario,
        String comentario,
        String titulo,
        String ventajas,
        String desventajas,
        LocalDateTime fechaCreacion,
        Boolean estado
) {
    public ResenaResponse(
            Long idResena,
            Long idProducto,
            String nombreProducto,
            Long idUsuario,
            String nombreUsuario,
            String comentario,
            LocalDateTime fechaCreacion,
            Boolean estado
    ) {
        this(idResena, idProducto, nombreProducto, idUsuario, nombreUsuario, comentario, null, null, null, fechaCreacion, estado);
    }
}
