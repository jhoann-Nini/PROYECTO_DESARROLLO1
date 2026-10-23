package com.example.backend.dto;

import java.math.BigDecimal;
import java.util.Map;

/**
 * DTO para el ranking de productos más deseados.
 * Actualmente el sistema no registra listas de deseos ni favoritos,
 * por lo que este DTO define el contrato formal sin inventar valores ficticios.
 */
public record ProductoDeseadoResponse(
        Long idProducto,
        String nombre,
        String descripcion,
        Long idCategoria,
        Long idMarca,
        String imagen,
        BigDecimal precioReferencia,
        Map<String, Object> caracteristicas,
        Long cantidadDeseados,
        Integer posicionRanking
) {}
