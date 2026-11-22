package com.example.backend.dto;

import com.example.backend.entity.EstadoModeracion;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Reseña retenida por el filtro automático, tal como la ve un moderador.
 * {@code motivosDeteccion} explica por qué el filtro la retuvo; se recalcula
 * sobre el comentario actual, no se almacena.
 */
public record ResenaEnRevisionResponse(
        Long idResena,
        Long idProducto,
        String nombreProducto,
        Long idUsuario,
        String nombreUsuario,
        String comentario,
        Integer puntuacion,
        LocalDateTime fechaCreacion,
        EstadoModeracion estadoModeracion,
        Boolean ocultaPorModeracion,
        Boolean ocultaPorReportes,
        List<String> motivosDeteccion,
        // Caso 6: MEDIO o ALTO. ALTO (posible amenaza o acoso) va primero en la cola.
        String riesgo
) {}
