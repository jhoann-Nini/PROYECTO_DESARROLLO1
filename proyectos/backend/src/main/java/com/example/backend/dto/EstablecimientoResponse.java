package com.example.backend.dto;

import java.math.BigDecimal;

/** Respuesta pública controlada con los datos de un establecimiento. */
public record EstablecimientoResponse(
        Long idEstablecimiento,
        String nombre,
        String direccion,
        String telefono,
        String correo,
        String descripcion,
        BigDecimal latitud,
        BigDecimal longitud,
        Boolean estado
) {
}
