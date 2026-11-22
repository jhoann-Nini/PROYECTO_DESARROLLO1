package com.example.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.example.backend.entity.EstadoModeracion;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Caso 6: el filtro clasifica igual que el corpus compartido con el frontend
 * (proyectos/fixtures/moderacion/corpus-moderacion.json). Si este archivo
 * cambia, también lo comprueba resenas.corpus.test.ts.
 */
@DisplayName("Moderación automática: corpus compartido con el frontend")
class ResenaModerationServiceCorpusTest {

  private static final Path CORPUS = Path.of("..", "fixtures", "moderacion", "corpus-moderacion.json");

  private final ResenaModerationService servicio = new ResenaModerationService();

  static Stream<Arguments> casos() throws Exception {
    JsonNode raiz = new ObjectMapper().readTree(Files.readString(CORPUS));
    List<Arguments> argumentos = new ArrayList<>();
    for (JsonNode caso : raiz.path("casos")) {
      argumentos.add(Arguments.of(caso.path("texto").asString(), caso.path("riesgo").asString()));
    }
    return argumentos.stream();
  }

  @ParameterizedTest(name = "[{1}] {0}")
  @MethodSource("casos")
  void clasificaSegunElCorpus(String texto, String riesgoEsperado) {
    RiesgoModeracion riesgo = servicio.analizar(texto).riesgo();
    assertEquals(RiesgoModeracion.valueOf(riesgoEsperado.toUpperCase()), riesgo, texto);

    EstadoModeracion estadoEsperado = riesgo == RiesgoModeracion.MEDIO || riesgo == RiesgoModeracion.ALTO
      ? EstadoModeracion.PENDIENTE
      : EstadoModeracion.PUBLICADA;
    assertEquals(estadoEsperado, servicio.determinarEstado(texto), texto);
  }
}
