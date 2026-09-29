package com.example.backend.dto;

import java.math.BigDecimal;

/**
 * Datos que la API devuelve al consultar un producto.
 * Se exponen el nombre de categoría/marca (no el objeto completo)
 * para mantener la respuesta liviana.
 */
public record ProductoResponse(
        Long idProducto,
        String nombre,
        String descripcion,
        Long idCategoria,
        String nombreCategoria,
        Long idMarca,
        String nombreMarca,
        String imagen,
        BigDecimal precioReferencia,
        Boolean estado
) {
}
