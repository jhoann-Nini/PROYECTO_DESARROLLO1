package com.example.backend.service;

import com.example.backend.entity.CategoriaTerminoModeracion;
import com.example.backend.entity.EstadoModeracion;
import java.util.Collection;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * Moderación automática de reseñas: decide el estado inicial y el estado tras
 * una edición. El análisis lo hace {@link AnalizadorContenido}, el motor común
 * con la comunidad (fase 0); esta clase conserva su API pública y delega.
 * <p>
 * Debe mantenerse alineado con {@code frontend/src/data/resenas.ts}; el corpus
 * compartido {@code proyectos/fixtures/moderacion/corpus-moderacion.json} lo
 * comprueba en las dos suites. El frontend solo previene; el backend es la
 * autoridad final.
 * <p>
 * Niveles (Caso 6): NINGUNO y BAJO se publican; MEDIO y ALTO quedan en
 * {@link EstadoModeracion#PENDIENTE} hasta que un moderador decida.
 */
@Service
public class ResenaModerationService {

  public static final String MOTIVO_PALABRA_NO_PERMITIDA = AnalizadorContenido.MOTIVO_PALABRA_NO_PERMITIDA;
  public static final String MOTIVO_INSULTO_DIRIGIDO = AnalizadorContenido.MOTIVO_INSULTO_DIRIGIDO;
  public static final String MOTIVO_AMENAZA = AnalizadorContenido.MOTIVO_AMENAZA;
  public static final String MOTIVO_ENLACE = AnalizadorContenido.MOTIVO_ENLACE;
  public static final String MOTIVO_TEXTO_REPETIDO = AnalizadorContenido.MOTIVO_TEXTO_REPETIDO;
  public static final String MOTIVO_TELEFONO = AnalizadorContenido.MOTIVO_TELEFONO;
  public static final String MOTIVO_TEXTO_DUPLICADO = AnalizadorContenido.MOTIVO_TEXTO_DUPLICADO;

  private final AnalizadorContenido analizador;

  /** Sin términos agregados: pruebas unitarias y corpus compartido. */
  public ResenaModerationService() {
    this(new AnalizadorContenido());
  }

  /** Con una fuente de términos agregados propia (pruebas). */
  public ResenaModerationService(FuenteTerminosModeracion terminosAgregados) {
    this(new AnalizadorContenido(terminosAgregados));
  }

  @Autowired
  public ResenaModerationService(AnalizadorContenido analizador) {
    this.analizador = analizador;
  }

  /** Analiza el comentario; los motivos solo se informan desde MEDIO. */
  public ResultadoModeracion analizar(String comentario) {
    return analizador.analizar(comentario);
  }

  /** Analiza el comentario con las otras reseñas activas del mismo autor (señal de texto duplicado). */
  public ResultadoModeracion analizar(String comentario, Collection<String> otrosComentariosDelAutor) {
    return analizador.analizar(comentario, otrosComentariosDelAutor);
  }

  /**
   * Analiza el comentario y determina su estado de moderación inicial.
   */
  public EstadoModeracion determinarEstado(String comentario) {
    return determinarEstado(comentario, List.of());
  }

  /** Igual que {@link #determinarEstado(String)}, con las otras reseñas del autor. */
  public EstadoModeracion determinarEstado(String comentario, Collection<String> otrosComentariosDelAutor) {
    return analizar(comentario, otrosComentariosDelAutor).riesgo().requiereRevision()
      ? EstadoModeracion.PENDIENTE
      : EstadoModeracion.PUBLICADA;
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
    return estadoTrasEdicion(actual, comentario, List.of());
  }

  /** Igual que {@link #estadoTrasEdicion(EstadoModeracion, String)}, con las otras reseñas del autor. */
  public EstadoModeracion estadoTrasEdicion(
      EstadoModeracion actual, String comentario, Collection<String> otrosComentariosDelAutor) {
    if (actual == EstadoModeracion.PENDIENTE || actual == EstadoModeracion.RECHAZADA) {
      return EstadoModeracion.PENDIENTE;
    }
    return determinarEstado(comentario, otrosComentariosDelAutor);
  }

  /**
   * Motivos por los que el filtro retiene el comentario, para que el
   * moderador sepa qué revisar. Lista vacía si el comentario es publicable.
   */
  public List<String> detectarMotivos(String comentario) {
    return analizar(comentario).motivos();
  }

  /** Palabras de la lista base presentes en el texto, en su forma canónica. */
  List<String> obtenerPalabrasDetectadas(String texto) {
    return analizador.obtenerPalabrasDetectadas(texto);
  }

  // Delegados estáticos: mantienen compatibles a quienes ya usaban esta clase.

  static String normalizar(String texto) {
    return AnalizadorContenido.normalizar(texto);
  }

  public static RiesgoModeracion riesgoDe(CategoriaTerminoModeracion categoria) {
    return AnalizadorContenido.riesgoDe(categoria);
  }

  public static String normalizarTermino(String termino) {
    return AnalizadorContenido.normalizarTermino(termino);
  }

  public static TerminoCompilado compilarTermino(
      String termino, String normalizado, CategoriaTerminoModeracion categoria) {
    return AnalizadorContenido.compilarTermino(termino, normalizado, categoria);
  }

  public static boolean estaEnListaBase(String normalizado) {
    return AnalizadorContenido.estaEnListaBase(normalizado);
  }
}
