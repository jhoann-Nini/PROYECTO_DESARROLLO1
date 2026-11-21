
package com.example.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ReporteOfertaRequest(

  @NotNull(message = "El producto es obligatorio.")
  Long idProducto,

  @NotNull(message = "El establecimiento es obligatorio.")
  Long idEstablecimiento,

  @NotBlank(message = "El motivo es obligatorio.")
  @Pattern(
    regexp = "^(precio_incorrecto|enlace_incorrecto)$",
    message = "El motivo debe ser precio_incorrecto o enlace_incorrecto."
  )
  String motivo,

  @Size(
    max = 2000,
    message = "La descripción no puede superar los 2000 caracteres."
  )
  String descripcion
) {
}
