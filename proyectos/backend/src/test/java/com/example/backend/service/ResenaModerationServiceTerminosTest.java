package com.example.backend.service;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.example.backend.entity.CategoriaTerminoModeracion;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Términos agregados por administradores (Caso 6, lista administrable). */
class ResenaModerationServiceTerminosTest {

  private static TerminoCompilado termino(String texto, CategoriaTerminoModeracion categoria) {
    return ResenaModerationService.compilarTermino(texto, ResenaModerationService.normalizarTermino(texto), categoria);
  }

  private static ResenaModerationService con(TerminoCompilado... terminos) {
    return new ResenaModerationService(() -> List.of(terminos));
  }

  private final ResenaModerationService conImbecil = con(termino("imbécil", CategoriaTerminoModeracion.INSULTO));

  @Test
  void detectaTerminoConTildesYLeet() {
    assertEquals(RiesgoModeracion.MEDIO, conImbecil.analizar("eres un IMBÉCIL").riesgo());
    assertEquals(RiesgoModeracion.MEDIO, conImbecil.analizar("qué 1mb3cil").riesgo());
    assertEquals(RiesgoModeracion.MEDIO, conImbecil.analizar("i.m.b.e.c.i.l").riesgo());
  }

  @Test
  void detectaPluralYLetrasRepetidas() {
    assertEquals(RiesgoModeracion.MEDIO, conImbecil.analizar("son unos imbeciles").riesgo());
    assertEquals(RiesgoModeracion.MEDIO, conImbecil.analizar("imbeeeecil").riesgo());
  }

  @Test
  void detectaFraseConSeparadores() {
    ResenaModerationService servicio = con(termino("gana dinero desde casa", CategoriaTerminoModeracion.SPAM));

    assertEquals(RiesgoModeracion.MEDIO, servicio.analizar("Gana-dinero desde   casa con este truco").riesgo());
    assertEquals(RiesgoModeracion.NINGUNO, servicio.analizar("no gana dinero, pero lo uso en casa").riesgo());
  }

  @Test
  void noMarcaDentroDeOtraPalabra() {
    assertEquals(RiesgoModeracion.NINGUNO, conImbecil.analizar("qué imbecilidad de diseño").riesgo());
    ResenaModerationService conCarro = con(termino("carro", CategoriaTerminoModeracion.INSULTO));
    assertEquals(RiesgoModeracion.NINGUNO, conCarro.analizar("este celular es caro").riesgo(),
      "las letras repetidas del término no se colapsan al guardarlo");
  }

  @Test
  void terminoConCaracteresEspecialesNoRompe() {
    assertDoesNotThrow(() -> ResenaModerationService.compilarTermino("c++ (x)", "c++ (x)", CategoriaTerminoModeracion.SPAM));
    assertEquals("a b", ResenaModerationService.normalizarTermino("a.b"));
  }

  @Test
  void amenazaDaRiesgoAlto() {
    ResenaModerationService servicio = con(termino("te voy a cazar", CategoriaTerminoModeracion.AMENAZA));

    assertEquals(RiesgoModeracion.ALTO, servicio.analizar("si no me devuelven el dinero te voy a cazar").riesgo());
  }

  @Test
  void motivoIncluyeTerminoYEtiqueta() {
    ResenaModerationService servicio = con(termino("indio ignorante", CategoriaTerminoModeracion.DISCRIMINACION));

    assertEquals(List.of("Contiene «indio ignorante», de la lista de moderación (Discriminación)"),
      servicio.analizar("solo lo usaría un indio ignorante").motivos());
  }

  @Test
  void normalizarTerminoRechazaSinLetras() {
    assertNull(ResenaModerationService.normalizarTermino("$$"));
    assertNull(ResenaModerationService.normalizarTermino("1"));
    assertNull(ResenaModerationService.normalizarTermino("x"));
    assertEquals("imbecil", ResenaModerationService.normalizarTermino("  IMBÉCIL!! "));
  }

  @Test
  void estaEnListaBaseDetectaPalabrasYFrases() {
    assertTrue(ResenaModerationService.estaEnListaBase("idiota"));
    assertTrue(ResenaModerationService.estaEnListaBase("idiooota"));
    assertTrue(ResenaModerationService.estaEnListaBase("te voy a matar"));
    assertFalse(ResenaModerationService.estaEnListaBase("imbecil"));
  }

  @Test
  void fuenteQueFallaNoImpideClasificar() {
    ResenaModerationService servicio = new ResenaModerationService(() -> {
      throw new IllegalStateException("base de datos caída");
    });

    assertEquals(RiesgoModeracion.MEDIO, servicio.analizar("eres un idiota").riesgo());
    assertEquals(RiesgoModeracion.NINGUNO, servicio.analizar("excelente producto").riesgo());
  }

  @Test
  void sinTerminosAgregadosClasificaIgualQueAntes() {
    assertEquals(new ResenaModerationService().analizar("eres un imbécil"),
      new ResenaModerationService(List::of).analizar("eres un imbécil"));
  }

  @Test
  void comentarioAdversarioDeMilCaracteresNoDesbordaNiTarda() {
    // Los comentarios tienen máximo 1000 caracteres (@Size en ResenaRequest).
    ResenaModerationService servicio = con(
      termino("imbécil", CategoriaTerminoModeracion.INSULTO),
      termino("gana dinero desde casa", CategoriaTerminoModeracion.SPAM));
    String adversario = ("i.m.b.e.e.e " + "gana ").repeat(60).substring(0, 1000);

    long inicio = System.nanoTime();
    assertDoesNotThrow(() -> servicio.analizar(adversario));
    assertTrue((System.nanoTime() - inicio) / 1_000_000 < 2000, "el análisis debe tardar menos de 2 s");
  }

  @Test
  void patronesDeTerminosAguantanTextosMuyLargos() {
    // Sin repeticiones anidadas: no desbordan la pila ni con 30 000 caracteres.
    TerminoCompilado palabra = termino("imbécil", CategoriaTerminoModeracion.INSULTO);
    TerminoCompilado frase = termino("gana dinero desde casa", CategoriaTerminoModeracion.SPAM);
    String largo = ResenaModerationService.normalizar("i.m.b.e.e.e".repeat(3000) + " " + "gana ".repeat(3000));

    assertDoesNotThrow(() -> palabra.patrones().get(0).matcher(largo).find());
    assertDoesNotThrow(() -> frase.patrones().get(0).matcher(largo).find());
  }
}
