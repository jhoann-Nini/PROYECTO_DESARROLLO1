package com.example.backend.dto;

import com.example.backend.entity.EstadoReporte;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Reporte de oferta tal como lo ve un moderador: incluye el precio y la
 * disponibilidad actuales de la oferta para contrastarlos con el reporte.
 */
public record ReporteOfertaModeracionResponse(
  Long idReporte,
  Long idProducto,
  String nombreProducto,
  Long idEstablecimiento,
  String nombreEstablecimiento,
  BigDecimal precioActual,
  Boolean disponibilidadActual,
  Long idUsuario,
  String nombreUsuario,
  String motivo,
  String descripcion,
  EstadoReporte estado,
  LocalDateTime fechaCreacion,
  LocalDateTime fechaActualizacion,
  List<ReporteOfertaHistorialResponse> historial
) {
}
