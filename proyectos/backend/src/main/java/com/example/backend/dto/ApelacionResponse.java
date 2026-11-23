package com.example.backend.dto;

import java.time.LocalDateTime;

/** Apelación tal como la ve su autor. */
public record ApelacionResponse(
    Long idApelacion,
    String estado,
    String motivo,
    String respuesta,
    LocalDateTime fechaSolicitud,
    LocalDateTime fechaResolucion
) {}
