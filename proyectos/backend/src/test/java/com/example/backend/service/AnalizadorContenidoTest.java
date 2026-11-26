package com.example.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.stream.Stream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * El motor común de moderación (reseñas y comunidad) contra valores fijos:
 * el riesgo esperado de cada caso del corpus compartido y motivos concretos.
 * Reemplaza la comparación con ResenaModerationService de la fase 0, que
 * delegaba en el mismo código y no podía fallar.
 */
@DisplayName("AnalizadorContenido: valores esperados")
class AnalizadorContenidoTest {

  private static final Path CORPUS = Path.of("..", "fixtures", "moderacion", "corpus-moderacion.json");
  private final AnalizadorContenido analizador = new AnalizadorContenido();

  static Stream<Arguments> casos() throws Exception {
    JsonNode raiz = new ObjectMapper().readTree(Files.readString(CORPUS));
    List<Arguments> argumentos = new ArrayList<>();
    for (JsonNode caso : raiz.path("casos")) {
      argumentos.add(Arguments.of(caso.path("texto").asString(), caso.path("riesgo").asString()));
    }
    return argumentos.stream();
  }

  @ParameterizedTest(name = "{0} → {1}")
  @MethodSource("casos")
  void clasificaComoEsperaElCorpus(String texto, String riesgo) {
    assertEquals(riesgo, analizador.analizar(texto).riesgo().name().toLowerCase(Locale.ROOT), texto);
  }

  @Test
  void amenazaEsAltoConSuMotivo() {
    ResultadoModeracion r = analizador.analizar("te voy a matar");
    assertEquals(RiesgoModeracion.ALTO, r.riesgo());
    assertTrue(r.motivos().contains(AnalizadorContenido.MOTIVO_AMENAZA), r.motivos().toString());
  }

  @Test
  void enlaceEsMedioConSuMotivo() {
    ResultadoModeracion r = analizador.analizar("compra barato en www.ofertas-falsas.com");
    assertEquals(RiesgoModeracion.MEDIO, r.riesgo());
    assertTrue(r.motivos().contains(AnalizadorContenido.MOTIVO_ENLACE), r.motivos().toString());
  }

  @Test
  void textoDuplicadoDelAutorEsMedio() {
    String largo = "Excelente equipo, la batería dura todo el día y la cámara es muy buena";
    ResultadoModeracion r = analizador.analizar(largo, List.of(largo));
    assertTrue(r.motivos().contains(AnalizadorContenido.MOTIVO_TEXTO_DUPLICADO), r.motivos().toString());
  }

  @Test
  void textoNormalNoTieneMotivos() {
    ResultadoModeracion r = analizador.analizar("La batería dura todo el día");
    assertEquals(RiesgoModeracion.NINGUNO, r.riesgo());
    assertTrue(r.motivos().isEmpty());
  }
}
