package com.example.backend.dto;

import jakarta.validation.constraints.Size;

public record AccionModeracionRequest(
        @Size(max = 2000, message = "La justificación no puede superar 2000 caracteres.")
        String motivo
) {}

