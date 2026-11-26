package com.example.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.example.backend.entity.CategoriaTerminoModeracion;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Comunidad, fase 0 (CA-01): el motor extraído a {@link AnalizadorContenido}
 * clasifica exactamente igual que {@link ResenaModerationService}, con y sin
 * otras reseñas del autor y con términos agregados.
 */
@DisplayName("AnalizadorContenido: mismo resultado que ResenaModerationService")
class AnalizadorContenidoTest {

  private static final Path CORPUS = Path.of("..", "fixtures", "moderacion", "corpus-moderacion.json");

  /** Todos los textos del corpus compartido, casos y limitaciones conocidas. */
  static Stream<Arguments> textos() throws Exception {
    JsonNode raiz = new ObjectMapper().readTree(Files.readString(CORPUS));
    List<Arguments> argumentos = new ArrayList<>();
    for (JsonNode caso : raiz.path("casos")) {
      argumentos.add(Arguments.of(caso.path("texto").asString()));
    }
    for (JsonNode caso : raiz.path("limitacionesConocidas")) {
      argumentos.add(Arguments.of(caso.path("texto").asString()));
    }
    return argumentos.stream();
  }

  private static final List<String> OTROS_DEL_AUTOR = List.of(
    "Excelente equipo, la batería dura todo el día y la cámara es muy buena",
    "eres un idiota");

  @ParameterizedTest(name = "{0}")
  @MethodSource("textos")
  void clasificaIgualQueResenaModerationService(String texto) {
    ResenaModerationService servicio = new ResenaModerationService();
    AnalizadorContenido analizador = new AnalizadorContenido();

    assertEquals(servicio.analizar(texto), analizador.analizar(texto), texto);
    assertEquals(servicio.analizar(texto, OTROS_DEL_AUTOR), analizador.analizar(texto, OTROS_DEL_AUTOR), texto);
  }

  @Test
  void conTerminosAgregadosClasificaIgual() {
    FuenteTerminosModeracion fuente = () -> List.of(
      AnalizadorContenido.compilarTermino("imbécil", AnalizadorContenido.normalizarTermino("imbécil"),
        CategoriaTerminoModeracion.INSULTO));
    String texto = "el vendedor es un 1mb3cil";

    assertEquals(new ResenaModerationService(fuente).analizar(texto), new AnalizadorContenido(fuente).analizar(texto));
  }

  @Test
  void elTextoDuplicadoCuentaIgual() {
    String largo = "Excelente equipo, la batería dura todo el día y la cámara es muy buena";

    assertEquals(new ResenaModerationService().analizar(largo, List.of(largo)),
      new AnalizadorContenido().analizar(largo, List.of(largo)));
  }
}
