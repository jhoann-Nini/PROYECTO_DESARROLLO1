package com.example.backend.dto.comunidad;

import java.time.LocalDateTime;

/**
 * Respuesta en el árbol, vista por quien pide.
 * <ul>
 *   <li>{@code estadoVisible}: VISIBLE si puede leer el texto; si no, ELIMINADA,
 *       OCULTA o EN_REVISION, y entonces {@code contenido} y {@code autor} son nulos.
 *       Conserva su lugar y sus hijas (RN-10).</li>
 *   <li>{@code enRespuestaA}: nombre del autor citado por una hermana de nivel 2.</li>
 *   <li>{@code estadoModeracion}: solo para el autor y los moderadores.</li>
 * </ul>
 */
public record RespuestaResponse(
    Long idRespuesta,
    Long idRespuestaPadre,
    int profundidad,
    String contenido,
    String autor,
    String enRespuestaA,
    String estadoVisible,
    String estadoModeracion,
    long respuestasHijas,
    long meGusta,
    boolean meGustaPropio,
    boolean esAutor,
    LocalDateTime fechaCreacion,
    LocalDateTime fechaEdicion) {
}
