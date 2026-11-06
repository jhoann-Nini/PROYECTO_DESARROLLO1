package com.example.backend.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * DTO para la solicitud de reporte de una reseña.
 * Únicamente captura el motivo y la descripción opcional (obligatoria para motivo 'otro').
 * El id de la reseña se extrae de la URL y el usuario del JWT autenticado.
 */
public record ReporteResenaRequest(
        @NotBlank(message = "El motivo es obligatorio.")
        @Pattern(
                regexp = "^(spam|lenguaje-ofensivo|falso|otro)$",
                message = "El motivo debe ser uno de los siguientes: spam, lenguaje-ofensivo, falso, otro."
        )
        String motivo,

        @Size(max = 2000, message = "La descripción no puede superar los 2000 caracteres.")
        String descripcion
) {
    @AssertTrue(message = "La descripción es obligatoria cuando el motivo es 'otro'.")
    public boolean isDescripcionValida() {
        if ("otro".equalsIgnoreCase(motivo)) {
            return descripcion != null && !descripcion.trim().isEmpty();
        }
        return true;
    }
}

