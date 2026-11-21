
package com.example.backend.dto;

import com.example.backend.entity.EstadoReporte;

import java.time.LocalDateTime;

public record ReporteOfertaResponse(
  Long idReporte,
  Long idProducto,
  Long idEstablecimiento,
  String motivo,
  String descripcion,
  EstadoReporte estado,
  LocalDateTime fechaCreacion
) {
}
