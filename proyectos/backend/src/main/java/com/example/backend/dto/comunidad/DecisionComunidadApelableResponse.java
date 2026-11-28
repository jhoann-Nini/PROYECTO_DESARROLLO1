package com.example.backend.dto.comunidad;

import com.example.backend.dto.ApelacionResponse;
import java.time.LocalDateTime;

/**
 * Decisión del foro sobre contenido del autor (GET /api/comunidad/apelaciones/mias).
 * {@code tipo} es PUBLICACION o RESPUESTA; {@code idPublicacion} es el hilo.
 * {@code apelacion} es null si aún no la apeló.
 */
public record DecisionComunidadApelableResponse(
    Long idAuditoria,
    String tipo,
    Long idContenido,
    Long idPublicacion,
    String titulo,
    String contenidoRevisado,
    String accion,
    String motivoDecision,
    LocalDateTime fechaDecision,
    LocalDateTime plazoHasta,
    boolean apelable,
    boolean contenidoEliminado,
    ApelacionResponse apelacion
) {}
