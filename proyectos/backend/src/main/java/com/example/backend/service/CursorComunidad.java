package com.example.backend.service;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.Base64;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Cursor opaco de las listas de la comunidad: Base64 URL de
 * {@code orden|instante ISO|id}. Lleva el orden para que un cursor de otra
 * lista no mezcle resultados (400).
 */
public final class CursorComunidad {

  /** Posición del último elemento de la página anterior. */
  public record Posicion(LocalDateTime instante, long id) {
  }

  /** Primera página de un orden descendente: antes de cualquier fecha real. */
  public static final Posicion INICIO_DESCENDENTE = new Posicion(LocalDateTime.of(9999, 12, 31, 0, 0), Long.MAX_VALUE);

  /** Primera página de un orden ascendente. */
  public static final Posicion INICIO_ASCENDENTE = new Posicion(LocalDateTime.of(1970, 1, 1, 0, 0), 0L);

  private CursorComunidad() {
  }

  public static String codificar(String orden, LocalDateTime instante, long id) {
    String crudo = orden + "|" + instante + "|" + id;
    return Base64.getUrlEncoder().withoutPadding().encodeToString(crudo.getBytes(StandardCharsets.UTF_8));
  }

  public static Posicion decodificar(String cursor, String ordenEsperado) {
    try {
      String crudo = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8);
      String[] partes = crudo.split("\\|", -1);
      if (partes.length != 3 || !partes[0].equals(ordenEsperado)) {
        throw invalido();
      }
      return new Posicion(LocalDateTime.parse(partes[1]), Long.parseLong(partes[2]));
    } catch (IllegalArgumentException | DateTimeParseException e) {
      throw invalido();
    }
  }

  private static ResponseStatusException invalido() {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, "El cursor de paginación no es válido.");
  }
}
