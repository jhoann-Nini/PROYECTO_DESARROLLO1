package com.example.backend.dto.comunidad;

import java.time.LocalDateTime;

/** Detalle de una publicación; {@code meGustaPropio} y {@code esAutor} dependen de la sesión. */
public record PublicacionDetalleResponse(
    Long idPublicacion,
    String tipo,
    Long idProducto,
    String nombreProducto,
    String titulo,
    String contenido,
    String autor,
    LocalDateTime fechaCreacion,
    LocalDateTime fechaEdicion,
    LocalDateTime fechaUltimaActividad,
    long respuestas,
    long meGusta,
    boolean meGustaPropio,
    boolean esAutor,
    String estadoModeracion,
    boolean cerrada) {
}
