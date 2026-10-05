package com.example.backend.dto;

import java.math.BigDecimal;

/**
 * Datos que la API devuelve al consultar un producto.
 * Se exponen los IDs relacionados para mantener la respuesta simple.
 */
public record ProductoResponse(
        Long idProducto,
        String nombre,
        String descripcion,
        Long idCategoria,
        Long idMarca,
        String imagen,
        BigDecimal precioReferencia,
        Boolean estado
) {
}