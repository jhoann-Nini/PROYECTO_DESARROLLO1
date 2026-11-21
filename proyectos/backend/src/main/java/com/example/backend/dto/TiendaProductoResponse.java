
package com.example.backend.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Datos de una tienda que ofrece un producto.
 * Ticket: TEC-134.
 */
public record TiendaProductoResponse(
  Long idEstablecimiento,
  String nombre,
  String direccion,
  String telefono,
  String correo,
  BigDecimal latitud,
  BigDecimal longitud,
  BigDecimal precio,
  Boolean disponibilidad,
  // Fase 3 (migración 022 y TEC-151): campos añadidos al final, sin romper el contrato.
  Boolean verificado,
  String urlOferta,
  LocalDateTime fechaActualizacionPrecio
) {
}
