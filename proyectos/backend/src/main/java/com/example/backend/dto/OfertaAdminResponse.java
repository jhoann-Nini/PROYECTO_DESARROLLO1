package com.example.backend.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Oferta tal como la ve un administrador, incluidas las no disponibles. */
public record OfertaAdminResponse(
  Long idProducto,
  String nombreProducto,
  Long idEstablecimiento,
  String nombreEstablecimiento,
  Boolean establecimientoActivo,
  Boolean establecimientoVerificado,
  BigDecimal precio,
  Boolean disponibilidad,
  String urlOferta,
  LocalDateTime fechaActualizacionPrecio,
  long reportesAbiertos
) {
}
