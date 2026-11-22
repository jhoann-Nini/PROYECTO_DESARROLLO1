package com.example.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Suspender (activo = false) o reactivar una cuenta. El motivo queda auditado. */
public record CambioEstadoCuentaRequest(
  @NotNull(message = "Indica si la cuenta queda activa o suspendida.")
  Boolean activo,

  @NotBlank(message = "El motivo es obligatorio.")
  @Size(max = 2000, message = "El motivo no puede superar 2000 caracteres.")
  String motivo
) {
}
