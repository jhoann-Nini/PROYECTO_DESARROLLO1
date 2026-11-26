package com.example.backend.dto.comunidad;

/** Cuerpo de POST /api/comunidad/publicaciones/{id}/respuestas; sin madre es una respuesta directa. */
public record CrearRespuestaRequest(String contenido, Long idRespuestaPadre) {
}
