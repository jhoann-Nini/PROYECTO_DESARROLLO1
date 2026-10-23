package com.example.backend.dto;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Representa un producto en el ranking alternativo de mayor interacción de la comunidad,
 * ordenado por la cantidad real de reseñas y comentarios publicados.
 */
public record ProductoMasComentadoResponse(
        Long idProducto,
        String nombre,
        String descripcion,
        Long idCategoria,
        Long idMarca,
        String imagen,
        BigDecimal precioReferencia,
        Map<String, Object> caracteristicas,
        Long cantidadResenas,
        Integer posicionRanking
) {}
