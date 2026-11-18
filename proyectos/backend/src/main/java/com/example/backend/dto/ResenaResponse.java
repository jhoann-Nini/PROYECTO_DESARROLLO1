
package com.example.backend.dto;

import com.example.backend.entity.EstadoModeracion;
import java.time.LocalDateTime;

public record ResenaResponse(
  Long idResena,
  Long idProducto,
  String nombreProducto,
  Long idUsuario,
  String nombreUsuario,
  String comentario,
  Integer puntuacion,
  LocalDateTime fechaCreacion,
  Boolean estado,
  EstadoModeracion estadoModeracion
) {
}
