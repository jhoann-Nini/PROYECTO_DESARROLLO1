package com.example.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ResenaRequest(
        @NotNull(message = "El id del producto es obligatorio.")
        Long idProducto,

        @NotBlank(message = "El comentario no puede estar vacío.")
        @Size(max = 1000, message = "El comentario no puede superar los 1000 caracteres.")
        String comentario,

        @Size(max = 150, message = "El título no puede superar los 150 caracteres.")
        String titulo,

        @Size(max = 1000, message = "Las ventajas no pueden superar los 1000 caracteres.")
        String ventajas,

        @Size(max = 1000, message = "Las desventajas no pueden superar los 1000 caracteres.")
        String desventajas
) {
    public ResenaRequest(Long idProducto, String comentario) {
        this(idProducto, comentario, null, null, null);
    }
}
