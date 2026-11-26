package com.example.backend.dto.comunidad;

import java.time.LocalDateTime;

/** Reporte recién creado. */
public record ReporteComunidadResponse(Long idReporte, String estado, String motivo, LocalDateTime fechaCreacion) {
}
