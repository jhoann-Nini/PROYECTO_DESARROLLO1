package com.example.backend.dto;

/**
 * Estadísticas públicas de valoración de un producto específico.
 * Se expone en el endpoint público GET /api/productos/{idProducto}/valoracion-stats.
 */
public record ValoracionPublicaStats(
        Long idProducto,
        Double promedioPuntuacion,
        Long cantidadValoraciones
) {}
