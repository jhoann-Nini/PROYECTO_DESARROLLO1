
package com.example.backend.dto;

import java.math.BigDecimal;

/**
 * Respuesta pública con los datos de un establecimiento.
 * Incluye su estado de verificación administrativa.
 */
public record EstablecimientoResponse(
  Long idEstablecimiento,
  String nombre,
  String direccion,
  String telefono,
  String correo,
  String descripcion,
  BigDecimal latitud,
  BigDecimal longitud,
  Boolean estado,
  Boolean verificado
) {
}
