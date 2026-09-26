package com.example.backend.dto;

/**
 * Datos que la API devuelve al consultar una categoría.
 */
public record CategoriaResponse(
        Long idCategoria,
        String nombre,
        String descripcion,
        Boolean estado
) {
}
