package com.example.backend.service;

import com.example.backend.entity.CategoriaTerminoModeracion;
import com.example.backend.entity.EstadoModeracion;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * Filtro automático de comentarios de reseñas. Es un filtro por reglas, sin
 * IA ni aprendizaje automático.
 * <p>
 * Debe mantenerse alineado con {@code frontend/src/data/resenas.ts}: mismas
 * listas, mismas normalizaciones y mismos niveles. El corpus compartido
 * {@code proyectos/fixtures/moderacion/corpus-moderacion.json} lo comprueba en
 * las dos suites de pruebas. El frontend solo previene; este servicio es la
 * autoridad final.
 * <p>
 * Niveles (Caso 6): NINGUNO y BAJO se publican; MEDIO y ALTO quedan en
 * {@link EstadoModeracion#PENDIENTE} hasta que un moderador decida. Así las
 * palabras ambiguas sobre el producto («odio que la batería…») no cargan la
 * cola de moderación.
 */
@Service
public class ResenaModerationService {

  private static final Logger log = LoggerFactory.getLogger(ResenaModerationService.class);

  /** Términos agregados por administradores (migración 027); solo los evalúa el backend. */
  private final FuenteTerminosModeracion terminosAgregados;

  /** Sin términos agregados: pruebas unitarias y corpus compartido. */
  public ResenaModerationService() {
    this(List::of);
  }

  @Autowired
  public ResenaModerationService(FuenteTerminosModeracion terminosAgregados) {
    this.terminosAgregados = terminosAgregados;
  }

  public static final String MOTIVO_PALABRA_NO_PERMITIDA = "Contiene lenguaje no permitido";
  public static final String MOTIVO_INSULTO_DIRIGIDO = "Contiene un insulto dirigido a una persona";
  public static final String MOTIVO_AMENAZA = "Posible amenaza o acoso";
  public static final String MOTIVO_ENLACE = "Contiene un enlace o dominio web";
  public static final String MOTIVO_TEXTO_REPETIDO = "Contiene texto repetido";
  public static final String MOTIVO_TELEFONO = "Contiene un número de teléfono";
  public static final String MOTIVO_TEXTO_DUPLICADO = "Texto idéntico a otra reseña del mismo autor";

  /**
   * Una reseña con este número de palabras o más, idéntica a otra del mismo
   * autor, se trata como spam. Las cortas («Excelente producto») se repiten
   * con normalidad en varios productos.
   */
  static final int MIN_PALABRAS_DUPLICADO = 8;

  /**
   * Palabras ambiguas: en una crítica al producto se publican («este cargador
   * es una basura»); dirigidas a una persona («eres una basura») suben a MEDIO.
   * "spam", "estafa" y "fraude" se retiraron antes: describen experiencias de
   * compra legítimas.
   */
  static final List<String> PALABRAS_AMBIGUAS = List.of(
    "timo", "insulto", "odio", "tonto", "basura", "inutil", "perra", "asqueroso"
  );

  /** Insultos y vulgaridades: siempre quedan en revisión. */
  static final List<String> PALABRAS_OFENSIVAS = List.of(
    "estupido", "estupida", "idiota", "mierda", "puta", "cabron"
  );

  /** Lista completa, en el orden en que se informan. */
  static final List<String> PALABRAS_BLOQUEADAS = java.util.stream.Stream
    .concat(PALABRAS_AMBIGUAS.stream(), PALABRAS_OFENSIVAS.stream())
    .toList();

  /**
   * Expresiones de amenaza o acoso (ya normalizadas, sin tildes). Se buscan
   * como frases completas con cualquier separador entre palabras.
   */
  static final List<String> FRASES_AMENAZA = List.of(
    "te voy a matar", "voy a matarte", "te mato", "te matare", "ojala te mueras",
    "muerete", "se donde vives", "voy a ir a tu casa", "te voy a buscar",
    "te voy a encontrar", "te voy a partir la cara", "te voy a romper"
  );

  /** Sustituciones de números y símbolos por letras (leet). */
  private static final Map<Character, Character> SUSTITUCIONES_LEET = Map.ofEntries(
    Map.entry('@', 'a'), Map.entry('4', 'a'), Map.entry('$', 's'), Map.entry('5', 's'),
    Map.entry('!', 'i'), Map.entry('¡', 'i'), Map.entry('|', 'i'), Map.entry('1', 'i'),
    Map.entry('0', 'o'), Map.entry('3', 'e'), Map.entry('€', 'e'), Map.entry('7', 't'),
    Map.entry('8', 'b'), Map.entry('9', 'g')
  );

  /**
   * Letras de otros alfabetos que se ven iguales a las latinas (homoglifos).
   * Se aplican después de pasar a minúsculas.
   */
  private static final Map<Character, Character> HOMOGLIFOS = Map.ofEntries(
    // Cirílico
    Map.entry('а', 'a'), Map.entry('е', 'e'), Map.entry('о', 'o'), Map.entry('р', 'p'),
    Map.entry('с', 'c'), Map.entry('у', 'y'), Map.entry('х', 'x'), Map.entry('і', 'i'),
    Map.entry('ј', 'j'), Map.entry('ѕ', 's'), Map.entry('ԁ', 'd'), Map.entry('ӏ', 'l'),
    Map.entry('т', 't'), Map.entry('м', 'm'), Map.entry('к', 'k'), Map.entry('в', 'b'),
    // Griego
    Map.entry('α', 'a'), Map.entry('ε', 'e'), Map.entry('ο', 'o'), Map.entry('ι', 'i'),
    Map.entry('κ', 'k'), Map.entry('ν', 'v'), Map.entry('ρ', 'p'), Map.entry('τ', 't'),
    Map.entry('υ', 'u'), Map.entry('χ', 'x')
  );

  /** Antes de una palabra ambigua, la dirigen a una persona. */
  private static final String DIRIGIDO =
    "(?:^|[^a-z])(?:(?:eres|sos|son|estas|usted|ustedes|vos|tu)[^a-z]+"
      + "(?:(?:un|una|unos|unas|el|la|los|las|muy|tan|re|todo|toda)[^a-z]+){0,2}"
      + "|(?:pedazo|maldit[oa]s?)[^a-z]+(?:de[^a-z]+)?)";

  /*
   * Cada palabra tiene dos patrones: su forma escrita («perra») y su forma
   * con letras repetidas colapsadas («pera»), que se compara con el texto
   * también colapsado. Así se detecta «idiooooota» sin usar repeticiones
   * anidadas en la expresión regular, que con textos largos desbordaban la
   * pila del motor de expresiones regulares.
   */
  private static final Map<String, List<Pattern>> PATRONES_PALABRAS = new LinkedHashMap<>();
  private static final Map<String, List<Pattern>> PATRONES_DIRIGIDOS = new LinkedHashMap<>();
  private static final List<Pattern> PATRONES_AMENAZA;

  static {
    for (String palabra : PALABRAS_BLOQUEADAS) {
      List<String> nucleos = List.of(nucleo(palabra), nucleo(colapsarRepeticiones(palabra)));
      PATRONES_PALABRAS.put(palabra, nucleos.stream()
        .map(n -> Pattern.compile("(?:^|[^a-z])" + n)).toList());
      PATRONES_DIRIGIDOS.put(palabra, nucleos.stream()
        .map(n -> Pattern.compile(DIRIGIDO + n)).toList());
    }
    PATRONES_AMENAZA = FRASES_AMENAZA.stream()
      .map(frase -> Pattern.compile("(?:^|[^a-z])"
        + String.join("[^a-z]+", frase.split(" ")) + "(?![a-z])"))
      .toList();
  }

  /**
   * Entre letras se admite cualquier separador («m i e r d a», «p.u.t.a»).
   * Se aceptan plurales con «s» o «es», y los extremos deben ser límite de
   * palabra: «computadora» no activa «puta».
   */
  private static String nucleo(String palabra) {
    StringBuilder cuerpo = new StringBuilder();
    for (int i = 0; i < palabra.length(); i++) {
      if (i > 0) {
        cuerpo.append("[^a-z]*");
      }
      cuerpo.append(Pattern.quote(String.valueOf(palabra.charAt(i))));
    }
    return cuerpo + "(?:es|s)?(?![a-z])";
  }

  /**
   * Colapsa una letra repetida, aunque tenga separadores entre repeticiones:
   * «idiooooota» → «idiota», «i d i i o t a» → «i d i o t a».
   */
  static String colapsarRepeticiones(String texto) {
    StringBuilder resultado = new StringBuilder(texto.length());
    StringBuilder separadores = new StringBuilder();
    char ultimaLetra = 0;
    for (int i = 0; i < texto.length(); i++) {
      char c = texto.charAt(i);
      if (c >= 'a' && c <= 'z') {
        if (c == ultimaLetra) {
          separadores.setLength(0);
          continue;
        }
        resultado.append(separadores).append(c);
        separadores.setLength(0);
        ultimaLetra = c;
      } else {
        separadores.append(c);
      }
    }
    return resultado.append(separadores).toString();
  }

  private static final Pattern PATRON_ENLACES = Pattern.compile(
    "(?i)\\b(?:https?://|www\\.)?(?:[a-z0-9-]+\\.)+[a-z]{2,}(?:/[^\\s]*)?"
  );

  /**
   * Teléfonos: de 10 a 13 dígitos con espacios, guiones, puntos o paréntesis
   * entre ellos y un «+» opcional («+57 300 123 4567», «(601) 555-1234»).
   * No empieza después de un dígito, un «$» o un separador decimal, y no
   * termina antes de otro dígito: así «$1.299.000» y dos precios seguidos no
   * cuentan como teléfono. Celulares (10 dígitos) y fijos con indicativo
   * (601…) tienen 10 dígitos desde 2021.
   */
  private static final Pattern PATRON_TELEFONO = Pattern.compile(
    "(?<![\\d$.,])\\+?\\d(?:[\\s.\\-()]{0,2}\\d){9,12}(?![.,]?\\d)"
  );

  /** Resultado del análisis: nivel de riesgo y motivos para el moderador. */
  public record ResultadoModeracion(RiesgoModeracion riesgo, List<String> motivos) {
  }

  /**
   * Analiza el comentario. Los motivos solo se informan desde MEDIO, que es
   * lo que llega a la cola de revisión.
   */
  public ResultadoModeracion analizar(String comentario) {
    return analizar(comentario, List.of());
  }

  /**
   * Analiza el comentario teniendo en cuenta los comentarios de las otras
   * reseñas activas del mismo autor, para detectar el mismo texto publicado
   * en varios productos. El frontend no puede evaluar esta señal.
   */
  public ResultadoModeracion analizar(String comentario, Collection<String> otrosComentariosDelAutor) {
    if (comentario == null || comentario.isBlank()) {
      return new ResultadoModeracion(RiesgoModeracion.NINGUNO, List.of());
    }
    List<String> variantes = variantes(comentario);

    RiesgoModeracion riesgo = RiesgoModeracion.NINGUNO;
    List<String> motivos = new ArrayList<>();

    if (coincide(PATRONES_AMENAZA, variantes)) {
      riesgo = RiesgoModeracion.ALTO;
      motivos.add(MOTIVO_AMENAZA);
    }

    boolean ofensiva = PALABRAS_OFENSIVAS.stream()
      .anyMatch(p -> coincide(PATRONES_PALABRAS.get(p), variantes));
    boolean ambiguaDirigida = PALABRAS_AMBIGUAS.stream()
      .anyMatch(p -> coincide(PATRONES_DIRIGIDOS.get(p), variantes));
    boolean ambigua = PALABRAS_AMBIGUAS.stream()
      .anyMatch(p -> coincide(PATRONES_PALABRAS.get(p), variantes));

    if (ofensiva) {
      riesgo = max(riesgo, RiesgoModeracion.MEDIO);
      motivos.add(MOTIVO_PALABRA_NO_PERMITIDA);
    }
    if (ambiguaDirigida) {
      riesgo = max(riesgo, RiesgoModeracion.MEDIO);
      motivos.add(MOTIVO_INSULTO_DIRIGIDO);
    } else if (ambigua) {
      riesgo = max(riesgo, RiesgoModeracion.BAJO);
    }
    for (TerminoCompilado termino : terminosActivos()) {
      if (coincide(termino.patrones(), variantes.subList(0, 2))) {
        riesgo = max(riesgo, riesgoDe(termino.categoria()));
        motivos.add("Contiene «" + termino.termino() + "», de la lista de moderación ("
          + termino.categoria().etiqueta() + ")");
      }
    }
    if (PATRON_ENLACES.matcher(comentario).find()) {
      riesgo = max(riesgo, RiesgoModeracion.MEDIO);
      motivos.add(MOTIVO_ENLACE);
    }
    if (contieneTextoRepetido(comentario)) {
      riesgo = max(riesgo, RiesgoModeracion.MEDIO);
      motivos.add(MOTIVO_TEXTO_REPETIDO);
    }
    if (PATRON_TELEFONO.matcher(normalizar(comentario)).find()) {
      riesgo = max(riesgo, RiesgoModeracion.MEDIO);
      motivos.add(MOTIVO_TELEFONO);
    }
    if (duplicaOtraResena(comentario, otrosComentariosDelAutor)) {
      riesgo = max(riesgo, RiesgoModeracion.MEDIO);
      motivos.add(MOTIVO_TEXTO_DUPLICADO);
    }
    return new ResultadoModeracion(riesgo, riesgo.requiereRevision() ? List.copyOf(motivos) : List.of());
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

  /**
   * Palabras de la lista presentes en el texto, en su forma canónica.
   */
  List<String> obtenerPalabrasDetectadas(String texto) {
    if (texto == null || texto.isBlank()) {
      return List.of();
    }
    List<String> variantes = variantes(texto);
    return PALABRAS_BLOQUEADAS.stream()
      .filter(p -> coincide(PATRONES_PALABRAS.get(p), variantes))
      .toList();
  }

  /**
   * Texto normalizado, con leet, y ambos con letras repetidas colapsadas.
   * Se revisan por separado para detectar «1diota» sin perder «idiota!»,
   * donde el «!» final no forma parte de la palabra.
   */
  private static List<String> variantes(String texto) {
    String normalizado = normalizar(texto);
    String conLeet = aplicarLeet(normalizado);
    return List.of(normalizado, conLeet, colapsarRepeticiones(normalizado), colapsarRepeticiones(conLeet));
  }

  private static boolean coincide(List<Pattern> patrones, List<String> variantes) {
    for (Pattern patron : patrones) {
      for (String variante : variantes) {
        if (patron.matcher(variante).find()) {
          return true;
        }
      }
    }
    return false;
  }

  private static RiesgoModeracion max(RiesgoModeracion a, RiesgoModeracion b) {
    return a.compareTo(b) >= 0 ? a : b;
  }

  /**
   * NFKC convierte caracteres de compatibilidad («ｉｄｉｏｔａ» de ancho
   * completo); luego minúsculas, homoglifos de otros alfabetos y, por último,
   * se quitan las tildes.
   */
  static String normalizar(String texto) {
    String compatible = Normalizer.normalize(texto, Normalizer.Form.NFKC).toLowerCase(Locale.ROOT);
    StringBuilder latino = new StringBuilder(compatible.length());
    for (int i = 0; i < compatible.length(); i++) {
      char c = compatible.charAt(i);
      latino.append(HOMOGLIFOS.getOrDefault(c, c));
    }
    return Normalizer.normalize(latino, Normalizer.Form.NFD).replaceAll("\\p{M}+", "");
  }

  private static String aplicarLeet(String texto) {
    StringBuilder resultado = new StringBuilder(texto.length());
    for (int i = 0; i < texto.length(); i++) {
      char c = texto.charAt(i);
      resultado.append(SUSTITUCIONES_LEET.getOrDefault(c, c));
    }
    return resultado.toString();
  }

  /** Si la fuente falla, el filtro base sigue funcionando sin los términos agregados. */
  private List<TerminoCompilado> terminosActivos() {
    try {
      List<TerminoCompilado> activos = terminosAgregados.activos();
      return activos != null ? activos : List.of();
    } catch (RuntimeException e) {
      log.warn("No se pudieron leer los términos de moderación agregados; se usa solo la lista base.", e);
      return List.of();
    }
  }

  /** AMENAZA es riesgo alto; el resto de categorías, medio. */
  public static RiesgoModeracion riesgoDe(CategoriaTerminoModeracion categoria) {
    return categoria == CategoriaTerminoModeracion.AMENAZA ? RiesgoModeracion.ALTO : RiesgoModeracion.MEDIO;
  }

  /**
   * Forma normalizada de un término agregado: misma normalización del filtro,
   * separadores convertidos en espacios. No colapsa letras repetidas («carro»
   * no debe guardarse como «caro»). Devuelve null si queda con menos de 2 o
   * más de 60 caracteres, o sin letras.
   */
  public static String normalizarTermino(String termino) {
    if (termino == null) {
      return null;
    }
    String normalizado = normalizar(termino).replaceAll("[^\\p{L}\\p{N}]+", " ").trim();
    if (normalizado.length() < 2 || normalizado.length() > 60 || !normalizado.matches(".*\\p{L}.*")) {
      return null;
    }
    return normalizado;
  }

  /**
   * Patrón de un término agregado, comparado con el texto normalizado y con
   * leet. Cada letra puede repetirse («imbeeecil») y una letra doble del
   * término exige al menos dos («carro» no marca «caro»); se admiten
   * separadores entre letras, plural con «s» o «es» y límite de palabra. Una
   * frase une sus palabras con cualquier separador.
   * <p>
   * Los cuantificadores son secuenciales, sin repeticiones anidadas: con
   * textos largos no desbordan la pila del motor de expresiones regulares.
   */
  public static TerminoCompilado compilarTermino(
      String termino, String normalizado, CategoriaTerminoModeracion categoria) {
    String[] palabras = normalizado.trim().split("\\s+");
    StringBuilder patron = new StringBuilder("(?:^|[^a-z])");
    for (int i = 0; i < palabras.length; i++) {
      if (i > 0) {
        patron.append("[^a-z]+");
      }
      patron.append(elastica(palabras[i]));
    }
    patron.append(palabras.length == 1 ? "(?:es|s)?(?![a-z])" : "(?![a-z])");
    return new TerminoCompilado(termino, categoria, List.of(Pattern.compile(patron.toString())));
  }

  private static String elastica(String palabra) {
    StringBuilder patron = new StringBuilder();
    int i = 0;
    while (i < palabra.length()) {
      char c = palabra.charAt(i);
      int fin = i;
      while (fin < palabra.length() && palabra.charAt(fin) == c) {
        fin++;
      }
      int veces = fin - i;
      if (i > 0) {
        patron.append("[^a-z]*");
      }
      patron.append(Character.isLetterOrDigit(c) ? String.valueOf(c) : Pattern.quote(String.valueOf(c)));
      patron.append(veces == 1 ? "+" : "{" + veces + ",}");
      i = fin;
    }
    return patron.toString();
  }

  /** True si el término normalizado ya está en la lista base del código. */
  public static boolean estaEnListaBase(String normalizado) {
    if (normalizado == null) {
      return false;
    }
    if (FRASES_AMENAZA.contains(normalizado)) {
      return true;
    }
    String colapsado = colapsarRepeticiones(normalizado);
    return PALABRAS_BLOQUEADAS.stream()
      .anyMatch(p -> p.equals(normalizado) || colapsarRepeticiones(p).equals(colapsado));
  }

  /**
   * Compara el texto con las otras reseñas del autor ignorando mayúsculas,
   * tildes y puntuación. Solo cuenta desde {@link #MIN_PALABRAS_DUPLICADO}
   * palabras; textos casi iguales con cambios mínimos no se detectan.
   */
  private static boolean duplicaOtraResena(String comentario, Collection<String> otros) {
    if (otros == null || otros.isEmpty()) {
      return false;
    }
    String clave = claveComparacion(comentario);
    if (clave.isEmpty() || clave.split(" ").length < MIN_PALABRAS_DUPLICADO) {
      return false;
    }
    return otros.stream()
      .filter(otro -> otro != null && !otro.isBlank())
      .anyMatch(otro -> clave.equals(claveComparacion(otro)));
  }

  private static String claveComparacion(String texto) {
    return normalizar(texto).replaceAll("[^\\p{L}\\p{N}]+", " ").trim();
  }

  /**
   * Detecta palabras repetidas tres veces consecutivas
   * o frases repetidas dos veces consecutivas.
   */
  private boolean contieneTextoRepetido(String comentario) {
    String textoLimpio = normalizar(comentario).replaceAll("[^\\p{L}\\p{N}]+", " ").trim();
    if (textoLimpio.isEmpty()) {
      return false;
    }
    String[] palabras = textoLimpio.split("\\s+");

    // Regla 1: una palabra repetida tres veces seguidas.
    for (int i = 0; i <= palabras.length - 3; i++) {
      if (palabras[i].equals(palabras[i + 1]) && palabras[i].equals(palabras[i + 2])) {
        return true;
      }
    }

    // Regla 2: una frase de dos o más palabras repetida dos veces.
    for (int longitud = 2; longitud <= palabras.length / 2; longitud++) {
      for (int inicio = 0; inicio + (longitud * 2) <= palabras.length; inicio++) {
        boolean repetida = true;
        for (int j = 0; j < longitud; j++) {
          if (!palabras[inicio + j].equals(palabras[inicio + longitud + j])) {
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
