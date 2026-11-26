package com.example.backend.dto.comunidad;

/** Cuerpo de POST /api/comunidad/{publicaciones|respuestas}/{id}/reportes. */
public record CrearReporteComunidadRequest(String motivo, String descripcion) {
}
