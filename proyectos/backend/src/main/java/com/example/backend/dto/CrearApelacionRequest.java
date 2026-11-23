package com.example.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Solicitud de apelación: la reseña y por qué la decisión fue un error. */
public record CrearApelacionRequest(
    @NotNull(message = "El id de la reseña es obligatorio.")
    Long idResena,
    @NotBlank(message = "Explica por qué crees que la decisión fue un error.")
    @Size(max = 1000, message = "El motivo no puede superar los 1000 caracteres.")
    String motivo
) {}
