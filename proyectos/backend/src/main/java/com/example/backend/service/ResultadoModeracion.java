package com.example.backend.service;

import java.util.List;

/** Resultado del análisis de moderación: nivel de riesgo y motivos para el moderador. */
public record ResultadoModeracion(RiesgoModeracion riesgo, List<String> motivos) {
}
