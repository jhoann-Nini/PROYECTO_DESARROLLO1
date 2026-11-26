package com.example.backend.dto.comunidad;

/** Cuerpo de POST /api/comunidad/publicaciones. Las reglas las valida el servicio. */
public record CrearPublicacionRequest(String tipo, Long idProducto, String titulo, String contenido) {
}
