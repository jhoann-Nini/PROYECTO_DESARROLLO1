package com.example.backend.entity;

/** Decisiones de moderación de la comunidad (migración 030). CERRAR y REABRIR son de la fase 4. */
public enum AccionModeracionComunidad {
    APROBAR,
    RECHAZAR,
    OCULTAR,
    RESTAURAR,
    ELIMINAR_MODERADOR,
    CERRAR,
    REABRIR
}
