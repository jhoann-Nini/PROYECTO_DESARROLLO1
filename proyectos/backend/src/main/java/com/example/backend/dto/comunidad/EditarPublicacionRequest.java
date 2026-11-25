package com.example.backend.dto.comunidad;

/** Cuerpo de PUT /api/comunidad/publicaciones/{id}. */
public record EditarPublicacionRequest(String titulo, String contenido) {
}
