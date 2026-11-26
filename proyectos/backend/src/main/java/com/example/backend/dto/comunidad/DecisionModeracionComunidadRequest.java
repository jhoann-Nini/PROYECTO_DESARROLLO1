package com.example.backend.dto.comunidad;

/** Cuerpo de las decisiones de moderación: el motivo es obligatorio (RN-11). */
public record DecisionModeracionComunidadRequest(String motivo) {
}
