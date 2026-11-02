package com.example.backend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResenaUpdateRequest(
        Long idProducto,

        @NotBlank(message = "El comentario no puede estar vacío.")
        @Size(max = 1000, message = "El comentario no puede superar los 1000 caracteres.")
        String comentario,

        @Min(value = 1, message = "La puntuación mínima es 1.")
        @Max(value = 5, message = "La puntuación máxima es 5.")
        Integer puntuacion,

        @Size(max = 150, message = "El título no puede superar los 150 caracteres.")
        String titulo,

        @Size(max = 1000, message = "Las ventajas no pueden superar los 1000 caracteres.")
        String ventajas,

        @Size(max = 1000, message = "Las desventajas no pueden superar los 1000 caracteres.")
        String desventajas
) {
    public ResenaUpdateRequest(String comentario, Integer puntuacion, String titulo, String ventajas, String desventajas) {
        this(null, comentario, puntuacion, titulo, ventajas, desventajas);
    }

    public ResenaUpdateRequest(String comentario, String titulo, String ventajas, String desventajas) {
        this(null, comentario, null, titulo, ventajas, desventajas);
    }

    public ResenaUpdateRequest(String comentario, Integer puntuacion) {
        this(null, comentario, puntuacion, null, null, null);
    }

    public ResenaUpdateRequest(String comentario) {
        this(null, comentario, null, null, null, null);
    }
}
