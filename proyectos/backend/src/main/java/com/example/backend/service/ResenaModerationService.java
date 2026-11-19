package com.example.backend.service;

import com.example.backend.entity.EstadoModeracion;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.stereotype.Service;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ResenaModerationService {

  private static final Set<String> PALABRAS_BLOQUEADAS = Set.of(
    "spam",
    "estafa",
    "timo",
    "fraude",
    "insulto",
    "odio",
    "tonto",
    "estupido",
    "estupida",
    "idiota",
    "basura",
    "inutil",
    "mierda",
    "puta",
    "perra",
    "cabron",
    "asqueroso"
  );

  private static final Pattern PATRON_ENLACES = Pattern.compile(
    "(?i)\\b(?:https?://|www\\.)?(?:[a-z0-9-]+\\.)+[a-z]{2,}(?:/[^\\s]*)?"
  );

  /**
   * Analiza el comentario y determina su estado de moderación.
   */
  public EstadoModeracion determinarEstado(String comentario) {

    if (comentario == null || comentario.isBlank()) {
      return EstadoModeracion.PUBLICADA;
    }

    if (contienePalabraBloqueada(comentario) ||
      contieneEnlace(comentario) ||
      contieneTextoRepetido(comentario)) {

      return EstadoModeracion.PENDIENTE;
    }

    return EstadoModeracion.PUBLICADA;
  }

  /**
   * Comprueba si el comentario contiene palabras bloqueadas.
   */
  private boolean contienePalabraBloqueada(String comentario) {

    String textoNormalizado = Normalizer.normalize(
        comentario,
        Normalizer.Form.NFD
      )
      .replaceAll("\\p{M}+", "")
      .toLowerCase(Locale.ROOT);

    String[] fragmentos = textoNormalizado.split("\\s+");
    List<String> tokens = new ArrayList<>();

    for (String fragmento : fragmentos) {

      String token = fragmento
        .replace("@", "a")
        .replaceAll("[^\\p{L}\\p{N}]", "");

      if (!token.isEmpty()) {
        tokens.add(token);
      }
    }

    // Revisar palabras completas y plurales.
    for (String token : tokens) {
      if (esPalabraBloqueada(token)) {
        return true;
      }
    }

    // Detectar palabras escritas separando sus letras.
    StringBuilder secuenciaLetras = new StringBuilder();

    for (String token : tokens) {

      if (token.length() == 1 &&
        Character.isLetter(token.charAt(0))) {

        secuenciaLetras.append(token);

      } else {

        if (contieneBloqueadaEnSecuencia(secuenciaLetras.toString())) {
          return true;
        }

        secuenciaLetras.setLength(0);
      }
    }

    return contieneBloqueadaEnSecuencia(secuenciaLetras.toString());
  }

  /**
   * Comprueba una palabra y sus plurales sencillos.
   */
  private boolean esPalabraBloqueada(String palabra) {

    if (PALABRAS_BLOQUEADAS.contains(palabra)) {
      return true;
    }

    if (palabra.endsWith("es") &&
      PALABRAS_BLOQUEADAS.contains(
        palabra.substring(0, palabra.length() - 2))) {
      return true;
    }

    return palabra.endsWith("s") &&
      PALABRAS_BLOQUEADAS.contains(
        palabra.substring(0, palabra.length() - 1));
  }

  /**
   * Detecta palabras bloqueadas cuando sus letras están separadas.
   */
  private boolean contieneBloqueadaEnSecuencia(String secuencia) {
    for (String palabra : PALABRAS_BLOQUEADAS) {
      if (secuencia.equals(palabra) ||
        secuencia.equals(palabra + "s") ||
        secuencia.equals(palabra + "es")) {
        return true;
      }
    }
    return false;
  }

  private boolean contieneEnlace(String comentario) {
    Matcher matcher = PATRON_ENLACES.matcher(comentario);
    return matcher.find();
  }

  /**
   * Detecta palabras repetidas tres veces consecutivas
   * o frases repetidas dos veces consecutivas.
   */
  private boolean contieneTextoRepetido(String comentario) {

    String texto = Normalizer.normalize(
        comentario,
        Normalizer.Form.NFD
      )
      .replaceAll("\\p{M}+", "")
      .toLowerCase(Locale.ROOT);

    // Convertir puntuación y separadores en espacios.
    String textoLimpio = texto.replaceAll("[^\\p{L}\\p{N}]+", " ").trim();

    if (textoLimpio.isEmpty()) {
      return false;
    }

    String[] palabras = textoLimpio.split("\\s+");

    // Regla 1: una palabra repetida tres veces seguidas.
    for (int i = 0; i <= palabras.length - 3; i++) {

      if (palabras[i].equals(palabras[i + 1]) &&
        palabras[i].equals(palabras[i + 2])) {
        return true;
      }
    }

    // Regla 2: una frase de dos o más palabras repetida dos veces.
    for (int longitud = 2; longitud <= palabras.length / 2; longitud++) {

      for (int inicio = 0;
           inicio + (longitud * 2) <= palabras.length;
           inicio++) {

        boolean repetida = true;

        for (int j = 0; j < longitud; j++) {

          if (!palabras[inicio + j]
            .equals(palabras[inicio + longitud + j])) {
            repetida = false;
            break;
          }
        }

        if (repetida) {
          return true;
        }
      }
    }

    return false;
  }
}
