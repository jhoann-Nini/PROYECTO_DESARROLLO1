
package com.example.backend.dto;

import jakarta.validation.constraints.NotNull;

/**
 * Solicitud administrativa para verificar o retirar
 * la verificación de un establecimiento.
 */
public record EstablecimientoVerificacionRequest(
  @NotNull Boolean verificado
) {
}
