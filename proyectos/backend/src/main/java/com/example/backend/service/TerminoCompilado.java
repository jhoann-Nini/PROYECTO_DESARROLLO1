package com.example.backend.service;

import com.example.backend.entity.CategoriaTerminoModeracion;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Término agregado por un administrador, listo para el filtro. Los patrones
 * se comparan con el texto normalizado y con leet.
 */
public record TerminoCompilado(
  String termino,
  CategoriaTerminoModeracion categoria,
  List<Pattern> patrones
) {}
