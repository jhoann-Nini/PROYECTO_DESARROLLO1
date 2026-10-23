package com.example.backend.dto;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Representa un producto en el ranking de los mejor valorados,
 * incluyendo su promedio de puntuación real, cantidad de valoraciones y posición en el ranking.
 */
public record ProductoMejorValoradoResponse(
        Long idProducto,
        String nombre,
        String descripcion,
        Long idCategoria,
        Long idMarca,
        String imagen,
        BigDecimal precioReferencia,
        Map<String, Object> caracteristicas,
        Double promedioPuntuacion,
        Long cantidadValoraciones,
        Integer posicionRanking
) {}
