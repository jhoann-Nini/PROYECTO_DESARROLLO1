package com.example.backend.dto;

import jakarta.validation.constraints.Size;

public record AsignacionRequest(
    @Size(max = 500, message = "El motivo no puede superar 500 caracteres")
    String motivo
) {}
