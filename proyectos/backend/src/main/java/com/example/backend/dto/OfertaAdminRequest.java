package com.example.backend.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

/**
 * Datos de una oferta que registra un administrador (Fase 3).
 * La fecha de actualización la decide el servidor, nunca el cliente.
 */
public record OfertaAdminRequest(

  @NotNull(message = "El precio es obligatorio.")
  @DecimalMin(value = "0.01", message = "El precio debe ser mayor que cero.")
  @Digits(integer = 10, fraction = 2, message = "El precio admite hasta 10 enteros y 2 decimales.")
  BigDecimal precio,

  @NotNull(message = "La disponibilidad es obligatoria.")
  Boolean disponibilidad,

  @Size(max = 2048, message = "El enlace no puede superar 2048 caracteres.")
  @Pattern(
    regexp = "^\\s*$|^(?i)https?://\\S+$",
    message = "El enlace debe empezar por http:// o https:// y no contener espacios."
  )
  String urlOferta
) {
}
