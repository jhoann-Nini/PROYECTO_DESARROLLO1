package com.example.backend.dto;

import com.example.backend.service.NivelReincidencia;
import java.time.LocalDateTime;

/**
 * Estado de reincidencia de un usuario, calculado a partir del historial de
 * moderación. Las fechas son nulas cuando no aplican.
 */
public record EstadoReincidenciaResponse(
    int faltas,
    NivelReincidencia nivel,
    LocalDateTime ultimaFalta,
    LocalDateTime revisionPreviaHasta,
    LocalDateTime bloqueoHasta,
    LocalDateTime proximaCaducidad
) {

  /** No es un getter de Jackson (sin prefijo get/is): no aparece en el JSON. */
  public boolean bloqueoActivo() {
    return nivel == NivelReincidencia.BLOQUEO;
  }

  /** Vigente también durante un bloqueo, que es más restrictivo. */
  public boolean revisionPreviaActiva() {
    return nivel == NivelReincidencia.REVISION_PREVIA || nivel == NivelReincidencia.BLOQUEO;
  }
}
