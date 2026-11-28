package com.example.backend.dto.comunidad;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Cuerpo de POST /api/comunidad/apelaciones: la decisión apelada y por qué fue un error. */
public record CrearApelacionComunidadRequest(
    @NotNull(message = "El id de la decisión es obligatorio.")
    Long idAuditoria,
    @NotBlank(message = "Explica por qué crees que la decisión fue un error.")
    @Size(max = 1000, message = "El motivo no puede superar los 1000 caracteres.")
    String motivo
) {}
