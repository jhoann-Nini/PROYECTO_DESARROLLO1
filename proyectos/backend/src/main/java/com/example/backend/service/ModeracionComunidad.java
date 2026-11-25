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

  /** Título de 5 a 150 caracteres sin contar los espacios de los extremos (RN-03). */
  public static String titulo(String valor) {
    String limpio = valor == null ? "" : valor.strip();
    if (limpio.length() < TITULO_MIN || limpio.length() > TITULO_MAX) {
      throw invalido("El título debe tener entre " + TITULO_MIN + " y " + TITULO_MAX + " caracteres.");
    }
    return limpio;
  }

  /** Texto plano no vacío de hasta {@code maximo} caracteres. */
  public static String texto(String valor, int maximo) {
    String limpio = valor == null ? "" : valor.strip();
    if (limpio.isEmpty() || limpio.length() > maximo) {
      throw invalido("El texto debe tener entre 1 y " + maximo + " caracteres.");
    }
    return limpio;
  }

  static ResponseStatusException invalido(String mensaje) {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, mensaje);
  }
}
