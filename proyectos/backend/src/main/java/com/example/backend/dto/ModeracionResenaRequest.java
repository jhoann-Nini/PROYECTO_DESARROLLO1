package com.example.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ModeracionResenaRequest(
        @NotNull(message = "Debes indicar si deseas ocultar o restaurar la reseña.")
        Boolean ocultar,
        @NotBlank(message = "La justificación es obligatoria.")
        @Size(max = 2000, message = "La justificación no puede superar 2000 caracteres.")
        String motivo
) {
}
