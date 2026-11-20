
package com.example.backend.dto;

import java.math.BigDecimal;

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
  Boolean disponibilidad
) {
}
