package com.example.backend.dto;

/**
 * Datos que la API devuelve al consultar una marca.
 */
public record MarcaResponse(
        Long idMarca,
        String nombre,
        String descripcion,
        Boolean estado
) {
}
