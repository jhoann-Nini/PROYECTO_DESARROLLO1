package com.example.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;

public record ResenaRequest(
        @NotNull(message = "El id del producto es obligatorio.")
        Long idProducto,

        @NotBlank(message = "El comentario no puede estar vacío.")
        @Size(max = 1000, message = "El comentario no puede superar los 1000 caracteres.")
        String comentario,

        @Min(value = 1, message = "La puntuación mínima es 1.")
        @Max(value = 5, message = "La puntuación máxima es 5.")
        Integer puntuacion
) {
    public ResenaRequest {
        if (puntuacion == null) {
            puntuacion = 5;
        }
    }
}
