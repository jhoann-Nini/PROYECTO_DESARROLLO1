package com.example.backend.dto;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;

public record ProductoRequest(
  @NotBlank(message = "El nombre es obligatorio")
  @Size(max = 150, message = "El nombre no puede superar 150 caracteres")

  String nombre,
  String descripcion,

  @NotNull(message = "La categoria es Obligatoria")
  long idCategoria,

  @NotNull(message = "La marca es Obligatoria")
  long idMarca,

  @Size(max = 255, message = "La imagen no puede Superar 255 caracteres")
  String imagen,

  @DecimalMin(value = "0.0", message = "El precio no puede ser negativo")
  BigDecimal precioReferencia
) {
}
