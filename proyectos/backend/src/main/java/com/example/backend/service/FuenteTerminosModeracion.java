package com.example.backend.service;

import java.util.List;

/** Términos de moderación activos ya compilados (Caso 6, lista administrable). */
@FunctionalInterface
public interface FuenteTerminosModeracion {
  List<TerminoCompilado> activos();
}
