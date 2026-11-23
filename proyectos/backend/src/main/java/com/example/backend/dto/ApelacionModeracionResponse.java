package com.example.backend.dto;

import java.time.LocalDateTime;

/**
 * Apelación tal como la ve un moderador. {@code puedeResolver} es false si
 * quien consulta tomó la decisión original o es el autor.
 */
public record ApelacionModeracionResponse(
    Long idApelacion,
    String estado,
    String motivoApelacion,
    String respuesta,
    LocalDateTime fechaSolicitud,
    LocalDateTime fechaResolucion,
    Long idResena,
    String nombreProducto,
    String comentarioRevisado,
    String accion,
    String motivoDecision,
    LocalDateTime fechaDecision,
    Long idAutor,
    String nombreAutor,
    String nombreModeradorOriginal,
    String nombreModeradorResolucion,
    boolean puedeResolver
) {}
