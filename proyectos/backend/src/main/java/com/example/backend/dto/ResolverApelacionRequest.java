package com.example.backend.dto;

import jakarta.validation.constraints.Size;

/** Respuesta del moderador: opcional al aceptar, obligatoria al rechazar. */
public record ResolverApelacionRequest(
    @Size(max = 1000, message = "La respuesta no puede superar los 1000 caracteres.")
    String respuesta
) {}
