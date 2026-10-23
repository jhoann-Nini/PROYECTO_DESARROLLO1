package com.example.backend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record ValoracionRequest(
        @NotNull(message = "El id del producto es obligatorio.")
        Long idProducto,

        @NotNull(message = "La puntuación es obligatoria.")
        @Min(value = 1, message = "La puntuación mínima es 1.")
        @Max(value = 5, message = "La puntuación máxima es 5.")
        Integer puntuacion
) {
}
