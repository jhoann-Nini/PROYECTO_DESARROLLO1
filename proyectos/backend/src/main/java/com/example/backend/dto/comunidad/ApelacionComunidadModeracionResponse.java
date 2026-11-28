package com.example.backend.dto.comunidad;

import java.time.LocalDateTime;

/**
 * Apelación del foro tal como la ve un moderador. {@code puedeResolver} es
 * false si quien consulta es el autor o tomó la decisión original.
 * {@code contenidoRevertido} solo se informa al resolver: true si la decisión
 * se deshizo (publicar o restaurar) y false si no (una eliminación, un
 * contenido que cambió mientras tanto o una apelación rechazada); en la
 * cola es null.
 */
public record ApelacionComunidadModeracionResponse(
    Long idApelacion,
    String estado,
    String motivoApelacion,
    String respuesta,
    LocalDateTime fechaSolicitud,
    LocalDateTime fechaResolucion,
    String tipo,
    Long idContenido,
    Long idPublicacion,
    String titulo,
    String contenidoRevisado,
    String accion,
    String motivoDecision,
    LocalDateTime fechaDecision,
    Long idAutor,
    String nombreAutor,
    String nombreModeradorOriginal,
    String nombreModeradorResolucion,
    boolean contenidoEliminado,
    boolean puedeResolver,
    Boolean contenidoRevertido
) {}
