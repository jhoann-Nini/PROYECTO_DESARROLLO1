package com.example.backend.dto.comunidad;

import java.time.LocalDateTime;
import java.util.List;

/** Contenido retenido por el filtro, con el riesgo y los motivos calculados al leer. */
public record ElementoRevisionComunidadResponse(
    String tipo,
    Long id,
    Long idPublicacion,
    String titulo,
    String contenido,
    String autor,
    LocalDateTime fechaCreacion,
    String riesgo,
    List<String> motivos) {
}
