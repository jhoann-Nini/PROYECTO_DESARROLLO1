package com.example.backend.dto;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Representa un producto en el ranking de ofertas destacadas,
 * incluyendo su precio de referencia, el precio del establecimiento con la mejor oferta,
 * el ahorro monetario calculado, el porcentaje de descuento y el establecimiento emisor.
 */
public record ProductoOfertaResponse(
        Long idProducto,
        String nombre,
        String descripcion,
        Long idCategoria,
        Long idMarca,
        String imagen,
        Map<String, Object> caracteristicas,
        BigDecimal precioReferencia,
        BigDecimal precioActual,
        BigDecimal ahorroMonetario,
        BigDecimal porcentajeDescuento,
        Long idEstablecimiento,
        String nombreEstablecimiento,
        Integer posicionRanking
) {}
