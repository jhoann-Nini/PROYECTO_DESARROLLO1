package com.example.backend.dto;

import com.example.backend.entity.EstadoReporte;
import java.time.LocalDateTime;

/** Evento del historial de un reporte de oferta. */
public record ReporteOfertaHistorialResponse(
  Long idHistorial,
  EstadoReporte estadoAnterior,
  EstadoReporte estadoNuevo,
  Long idModerador,
  String nombreModerador,
  String justificacion,
  LocalDateTime fechaEvento
) {
}
