package com.example.backend.service;

import com.example.backend.entity.EstadoModeracion;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/**
 * Filtro y validación de textos de la comunidad. Usa el mismo
 * {@link AnalizadorContenido} que las reseñas (RN-12): MEDIO o ALTO, o un
 * autor en revisión previa, queda PENDIENTE.
 */
@Component
public class ModeracionComunidad {

  public static final int TITULO_MIN = 5;
  public static final int TITULO_MAX = 150;
  public static final int PUBLICACION_MAX = 5000;
  public static final int RESPUESTA_MAX = 3000;

  private final AnalizadorContenido analizador;

  public ModeracionComunidad(AnalizadorContenido analizador) {
    this.analizador = analizador;
  }

  public EstadoModeracion estadoInicial(String texto, boolean revisionPrevia) {
    if (revisionPrevia || analizador.analizar(texto).riesgo().requiereRevision()) {
      return EstadoModeracion.PENDIENTE;
    }
    return EstadoModeracion.PUBLICADA;
  }

  /**
   * Igual que las reseñas: lo PENDIENTE sigue en revisión, lo RECHAZADO vuelve
   * a revisión y lo PUBLICADO se analiza de nuevo.
   */
  public EstadoModeracion estadoTrasEdicion(EstadoModeracion actual, String texto, boolean revisionPrevia) {
    if (actual == EstadoModeracion.PENDIENTE || actual == EstadoModeracion.RECHAZADA) {
      return EstadoModeracion.PENDIENTE;
    }
    return estadoInicial(texto, revisionPrevia);
  }

  /**
   * Caracteres que no se ven: separadores Unicode (espacio duro, espacio de
   * ancho variable) y de formato (espacio de ancho cero, BOM).
   */
  private static final java.util.regex.Pattern INVISIBLES = java.util.regex.Pattern.compile("[\\p{Z}\\p{Cf}\\s]+");

  /**
   * Título de 5 a 150 caracteres sin contar los espacios de los extremos (RN-03).
   * Se cuentan puntos de código, como {@code char_length} de PostgreSQL: un
   * emoji es un carácter, no dos.
   */
  public static String titulo(String valor) {
    String limpio = limpiar(valor);
    int largo = limpio.codePointCount(0, limpio.length());
    if (largo < TITULO_MIN || largo > TITULO_MAX || soloInvisibles(limpio)) {
      throw invalido("El título debe tener entre " + TITULO_MIN + " y " + TITULO_MAX + " caracteres.");
    }
    return limpio;
  }

  /** Texto plano visible de hasta {@code maximo} caracteres (puntos de código). */
  public static String texto(String valor, int maximo) {
    String limpio = limpiar(valor);
    if (soloInvisibles(limpio) || limpio.codePointCount(0, limpio.length()) > maximo) {
      throw invalido("El texto debe tener entre 1 y " + maximo + " caracteres.");
    }
    return limpio;
  }

  /** PostgreSQL no admite el carácter NUL en un texto: se rechaza con 400 en lugar de un 500. */
  private static String limpiar(String valor) {
    if (valor == null) {
      return "";
    }
    if (valor.indexOf('\u0000') >= 0) {
      throw invalido("El texto contiene caracteres no permitidos.");
    }
    return valor.strip();
  }

  private static boolean soloInvisibles(String texto) {
    return texto.isEmpty() || INVISIBLES.matcher(texto).matches();
  }

  static ResponseStatusException invalido(String mensaje) {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, mensaje);
  }
}
