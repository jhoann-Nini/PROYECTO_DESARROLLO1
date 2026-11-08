package com.example.backend.entity;

/**
 * Estados del ciclo de vida de un reporte de reseña según las reglas de negocio de TecReview.
 * Corresponde a la restricción CHECK chk_reporte_resena_estado en PostgreSQL.
 */
public enum EstadoReporte {
    PENDIENTE,
    EN_REVISION,
    ACEPTADO,
    RECHAZADO
}

