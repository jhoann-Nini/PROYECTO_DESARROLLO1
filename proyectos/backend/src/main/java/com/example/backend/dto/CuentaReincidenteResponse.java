package com.example.backend.dto;

import java.time.LocalDateTime;

/** Cuenta activa con 4 faltas o más en los últimos 90 días (Caso 6). */
public record CuentaReincidenteResponse(
    Long idUsuario,
    String nombre,
    String correo,
    long faltas,
    LocalDateTime ultimaFalta
) {}
