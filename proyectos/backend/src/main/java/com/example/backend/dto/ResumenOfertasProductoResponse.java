package com.example.backend.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Resumen público de las ofertas disponibles de un producto (Fase 4, H-04).
 * Solo cuenta ofertas disponibles, con precio mayor que cero, de tiendas
 * activas. Un producto sin ofertas no aparece en la lista.
 */
public record ResumenOfertasProductoResponse(
  Long idProducto,
  Long tiendasDisponibles,
  BigDecimal menorPrecio,
  LocalDateTime fechaActualizacionMasReciente
) {
}
