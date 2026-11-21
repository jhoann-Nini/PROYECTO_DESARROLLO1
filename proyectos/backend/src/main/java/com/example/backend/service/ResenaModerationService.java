package com.example.backend.service;

import com.example.backend.entity.EstadoModeracion;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

/**
 * Filtro automático de comentarios de reseñas.
 * <p>
 * Debe mantenerse alineado con {@code frontend/src/data/resenas.ts}: misma lista
 * de palabras, mismas sustituciones leet y misma regla de coincidencia. El
 * frontend solo previene; este servicio es la autoridad final.
 * <p>
 * Un comentario detectado no se rechaza: queda en {@link EstadoModeracion#PENDIENTE}
 * hasta que un moderador lo apruebe o lo rechace.
 */
@Service
public class ResenaModerationService {

  public static final String MOTIVO_PALABRA_NO_PERMITIDA = "Contiene lenguaje no permitido";
  public static final String MOTIVO_ENLACE = "Contiene un enlace o dominio web";
  public static final String MOTIVO_TEXTO_REPETIDO = "Contiene texto repetido";

  /**
   * "spam", "estafa" y "fraude" se retiraron: describen experiencias de compra
   * legítimas ("la tienda fue una estafa") y no son lenguaje ofensivo.
   */
  static final List<String> PALABRAS_BLOQUEADAS = List.of(
    "timo",
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

  private static final Map<Character, Character> SUSTITUCIONES_LEET = Map.of(
    '@', 'a',
    '$', 's',
    '!', 'i',
    '0', 'o',
    '1', 'i',
    '3', 'e',
    '4', 'a',
    '€', 'e'
  );

  /**
   * Cada término se busca como palabra completa. Entre sus letras se admite
   * cualquier separador ("m i e r d a", "ESTU-PIDO", "p.u.t.a"), pero los
   * extremos deben ser límites de palabra: "computadora" no activa "puta".
   */
  private static final List<Pattern> PATRONES_PALABRAS = PALABRAS_BLOQUEADAS.stream()
    .map(palabra -> {
      StringBuilder cuerpo = new StringBuilder();
      for (int i = 0; i < palabra.length(); i++) {
        if (i > 0) {
          cuerpo.append("[^a-z]*");
        }
        cuerpo.append(Pattern.quote(String.valueOf(palabra.charAt(i))));
      }
      return Pattern.compile("(?:^|[^a-z])" + cuerpo + "(?:es|s)?(?![a-z])");
    })
    .toList();

  private static final Pattern PATRON_ENLACES = Pattern.compile(
    "(?i)\\b(?:https?://|www\\.)?(?:[a-z0-9-]+\\.)+[a-z]{2,}(?:/[^\\s]*)?"
  );

  /**
   * Analiza el comentario y determina su estado de moderación inicial.
   */
  public EstadoModeracion determinarEstado(String comentario) {
    return detectarMotivos(comentario).isEmpty()
      ? EstadoModeracion.PUBLICADA
      : EstadoModeracion.PENDIENTE;
  }

  /**
   * Estado que corresponde cuando el autor edita su reseña.
   * <ul>
   *   <li>PENDIENTE se conserva: la revisión manual sigue abierta.</li>
   *   <li>RECHAZADA vuelve a PENDIENTE: el texto nuevo requiere otra revisión
   *       humana y no se publica solo por haber cambiado.</li>
   *   <li>PUBLICADA se vuelve a analizar.</li>
   * </ul>
   */
  public EstadoModeracion estadoTrasEdicion(EstadoModeracion actual, String comentario) {
    if (actual == EstadoModeracion.PENDIENTE || actual == EstadoModeracion.RECHAZADA) {
      return EstadoModeracion.PENDIENTE;
    }
    return determinarEstado(comentario);
  }

  /**
   * Devuelve los motivos por los que el filtro retiene el comentario, para que
   * el moderador sepa qué revisar. Lista vacía si el comentario es publicable.
   */
  public List<String> detectarMotivos(String comentario) {
    List<String> motivos = new ArrayList<>();
    if (comentario == null || comentario.isBlank()) {
      return motivos;
    }
    if (!obtenerPalabrasDetectadas(comentario).isEmpty()) {
      motivos.add(MOTIVO_PALABRA_NO_PERMITIDA);
    }
    if (contieneEnlace(comentario)) {
      motivos.add(MOTIVO_ENLACE);
    }
    if (contieneTextoRepetido(comentario)) {
      motivos.add(MOTIVO_TEXTO_REPETIDO);
    }
    return motivos;
  }

  /**
   * Palabras bloqueadas presentes en el texto, en su forma canónica.
   * Se revisa el texto normalizado tal cual y también con sustituciones leet:
   * así se detecta "1diota" sin perder "idiota!" (donde "!" no es una letra).
   */
  List<String> obtenerPalabrasDetectadas(String texto) {
    String normalizado = normalizar(texto);
    if (normalizado.isBlank()) {
      return List.of();
    }
    String conLeet = aplicarLeet(normalizado);

    List<String> detectadas = new ArrayList<>();
    for (int i = 0; i < PALABRAS_BLOQUEADAS.size(); i++) {
      Pattern patron = PATRONES_PALABRAS.get(i);
      if (patron.matcher(normalizado).find() || patron.matcher(conLeet).find()) {
        detectadas.add(PALABRAS_BLOQUEADAS.get(i));
      }
    }
    return detectadas;
  }

  private static String normalizar(String texto) {
    return Normalizer.normalize(texto, Normalizer.Form.NFD)
      .replaceAll("\\p{M}+", "")
      .toLowerCase(Locale.ROOT);
  }

  private static String aplicarLeet(String texto) {
    StringBuilder resultado = new StringBuilder(texto.length());
    for (int i = 0; i < texto.length(); i++) {
      char c = texto.charAt(i);
      resultado.append(SUSTITUCIONES_LEET.getOrDefault(c, c));
    }
    return resultado.toString();
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

    String texto = normalizar(comentario);

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
