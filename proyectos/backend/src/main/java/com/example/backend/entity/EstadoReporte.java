package com.example.backend.entity;

/**
 * Estados del ciclo de vida de un reporte según las reglas de negocio de TecReview.
 * Lo usan los reportes de reseñas (CHECK chk_reporte_resena_estado) y los de
 * ofertas (CHECK chk_reporte_oferta_estado, migraciones 018 y 021).
 */
public enum EstadoReporte {
    PENDIENTE,
    EN_REVISION,
    ACEPTADO,
    RECHAZADO
}

