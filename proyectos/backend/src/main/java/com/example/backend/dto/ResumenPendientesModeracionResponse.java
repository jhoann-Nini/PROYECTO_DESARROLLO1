package com.example.backend.dto;

/**
 * Trabajo pendiente de los moderadores (Caso 6). Los reportes cuentan como
 * pendientes mientras estén PENDIENTE o EN_REVISION.
 */
public record ResumenPendientesModeracionResponse(
        long revisionAutomatica,
        long reportesResenas,
        long reportesOfertas,
        long apelaciones,
        long total
) {}
