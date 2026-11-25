package com.example.backend.dto.comunidad;

import java.time.LocalDateTime;

/**
 * Publicación en una lista. {@code estadoModeracion} solo se informa al autor
 * y a los moderadores; para los demás es nulo.
 */
public record PublicacionResumenResponse(
    Long idPublicacion,
    String tipo,
    Long idProducto,
    String nombreProducto,
    String titulo,
    String extracto,
    String autor,
    LocalDateTime fechaCreacion,
    LocalDateTime fechaUltimaActividad,
    long respuestas,
    long meGusta,
    String estadoModeracion,
    boolean cerrada) {
}
