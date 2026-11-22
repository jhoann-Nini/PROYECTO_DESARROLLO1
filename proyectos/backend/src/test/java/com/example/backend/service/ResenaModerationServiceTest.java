package com.example.backend.service;

import com.example.backend.entity.EstadoModeracion;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ResenaModerationServiceTest {

  private ResenaModerationService moderationService;

  @BeforeEach
  void setUp() {
    moderationService = new ResenaModerationService();
  }

  @Test
  void debePublicarComentarioNormal() {
    assertEstado("Este producto es excelente",
      EstadoModeracion.PUBLICADA);
  }

  @Test
  void debeDetectarPalabrasBloqueadas() {
    assertEstado("IDIOTA", EstadoModeracion.PENDIENTE);
    // Caso 6: «inútil» es ambigua; solo se retiene si va dirigida a una persona.
    assertEstado("inútil", EstadoModeracion.PUBLICADA);
    assertEstado("eres un inútil", EstadoModeracion.PENDIENTE);
    assertEstado("ESTU-PIDO", EstadoModeracion.PENDIENTE);
    assertEstado("m i e r d a", EstadoModeracion.PENDIENTE);
    assertEstado("p.u.t.a experiencia", EstadoModeracion.PENDIENTE);
    assertEstado("idiotas", EstadoModeracion.PENDIENTE);
    assertEstado("i d i o t a", EstadoModeracion.PENDIENTE);
  }

  @Test
  void debeDetectarEvasionesLeetComoElFrontend() {
    assertEstado("1diota", EstadoModeracion.PENDIENTE);
    assertEstado("m13rda de servicio", EstadoModeracion.PENDIENTE);
    assertEstado("cabr0n", EstadoModeracion.PENDIENTE);
    // Caso 6: palabras ambiguas con leet se detectan, pero solo se retienen dirigidas.
    assertRiesgo("qué t1mo de tienda", RiesgoModeracion.BAJO);
    assertRiesgo("b@sura", RiesgoModeracion.BAJO);
    assertEstado("eres una b@sura", EstadoModeracion.PENDIENTE);
  }

  @Test
  void lasAmenazasTienenRiesgoAltoYMotivoPropio() {
    ResenaModerationService.ResultadoModeracion resultado =
      moderationService.analizar("te voy a matar si no me devuelves el dinero");
    assertEquals(RiesgoModeracion.ALTO, resultado.riesgo());
    assertEquals(java.util.List.of(ResenaModerationService.MOTIVO_AMENAZA), resultado.motivos());
  }

  @Test
  void elRiesgoBajoNoInformaMotivosParaLaCola() {
    assertEquals(java.util.List.of(), moderationService.detectarMotivos("odio que la batería dure tan poco"));
    assertEquals(java.util.List.of(ResenaModerationService.MOTIVO_INSULTO_DIRIGIDO),
      moderationService.detectarMotivos("eres un inútil"));
  }

  @Test
  void noSeCuelgaConTextosAdversariosLargos() {
    String adversario = "i" + "!".repeat(5000) + "x " + "i ".repeat(2000) + "d".repeat(3000);
    long inicio = System.nanoTime();
    moderationService.analizar(adversario);
    long milisegundos = (System.nanoTime() - inicio) / 1_000_000;
    org.junit.jupiter.api.Assertions.assertTrue(milisegundos < 2000, "tardó " + milisegundos + " ms");
  }

  @Test
  void debeDetectarPalabrasSeguidasDeSignos() {
    // "!" también es una sustitución leet; la palabra no debe perderse por ello.
    assertEstado("mierda!", EstadoModeracion.PENDIENTE);
    assertEstado("¡idiota!", EstadoModeracion.PENDIENTE);
  }

  @Test
  void noDebeRetenerCriticasLegitimasDeCompra() {
    // spam, estafa y fraude se retiraron de la lista: describen experiencias reales.
    assertEstado("La tienda fue una estafa, nunca llegó el pedido", EstadoModeracion.PUBLICADA);
    assertEstado("Me parece un fraude el precio", EstadoModeracion.PUBLICADA);
    assertEstado("Recibo mucho spam de la marca", EstadoModeracion.PUBLICADA);
  }

  @Test
  void debeExplicarLosMotivosDeRetencion() {
    assertEquals(
      java.util.List.of(ResenaModerationService.MOTIVO_PALABRA_NO_PERMITIDA,
        ResenaModerationService.MOTIVO_ENLACE),
      moderationService.detectarMotivos("idiota, mira www.ejemplo.com"));
    assertEquals(java.util.List.of(), moderationService.detectarMotivos("Excelente batería"));
  }

  @Test
  void estadoTrasEdicionNoPublicaSinRevision() {
    assertEquals(EstadoModeracion.PENDIENTE,
      moderationService.estadoTrasEdicion(EstadoModeracion.PENDIENTE, "Texto limpio"));
    assertEquals(EstadoModeracion.PENDIENTE,
      moderationService.estadoTrasEdicion(EstadoModeracion.RECHAZADA, "Texto limpio"));
    assertEquals(EstadoModeracion.PUBLICADA,
      moderationService.estadoTrasEdicion(EstadoModeracion.PUBLICADA, "Texto limpio"));
    assertEquals(EstadoModeracion.PENDIENTE,
      moderationService.estadoTrasEdicion(EstadoModeracion.PUBLICADA, "eres un idiota"));
  }

  @Test
  void noDebeDetectarPalabrasComoParteDeOtras() {
    assertEstado("computadora", EstadoModeracion.PUBLICADA);
    assertEstado("último modelo", EstadoModeracion.PUBLICADA);
    assertEstado("estimulante", EstadoModeracion.PUBLICADA);
    assertEstado("sodio", EstadoModeracion.PUBLICADA);
    assertEstado("Tiene 4 GB y 128 GB, carga en 30 min", EstadoModeracion.PUBLICADA);
  }

  @Test
  void debeDetectarEnlaces() {
    assertEstado("https://ejemplo.com",
      EstadoModeracion.PENDIENTE);
    assertEstado("http://ejemplo.com",
      EstadoModeracion.PENDIENTE);
    assertEstado("www.ejemplo.com",
      EstadoModeracion.PENDIENTE);
    assertEstado("Visita ejemplo.com",
      EstadoModeracion.PENDIENTE);
    assertEstado("Consulta en tienda.ejemplo.com/productos",
      EstadoModeracion.PENDIENTE);
  }

  @Test
  void debeDetectarPalabraRepetidaTresVeces() {
    assertEstado("bueno bueno bueno",
      EstadoModeracion.PENDIENTE);

    assertEstado("bueno, bueno, bueno",
      EstadoModeracion.PENDIENTE);
  }

  @Test
  void debeDetectarFraseRepetidaDosVeces() {
    assertEstado("muy buen producto muy buen producto",
      EstadoModeracion.PENDIENTE);

    assertEstado("muy bueno, muy bueno",
      EstadoModeracion.PENDIENTE);
  }

  @Test
  void noDebeDetectarRepeticionesQueNoCumplenLaRegla() {
    assertEstado("bueno bueno",
      EstadoModeracion.PUBLICADA);

    assertEstado("muy buen producto funciona correctamente",
      EstadoModeracion.PUBLICADA);
  }

  @Test
  void debePublicarComentariosVaciosONulos() {
    assertEstado(null, EstadoModeracion.PUBLICADA);
    assertEstado("", EstadoModeracion.PUBLICADA);
    assertEstado("   ", EstadoModeracion.PUBLICADA);
  }

  private void assertRiesgo(String comentario, RiesgoModeracion esperado) {
    assertEquals(esperado, moderationService.analizar(comentario).riesgo(), "Riesgo inesperado para: " + comentario);
  }

  private void assertEstado(
    String comentario,
    EstadoModeracion esperado) {

    assertEquals(
      esperado,
      moderationService.determinarEstado(comentario),
      "Resultado inesperado para: " + comentario
    );
  }
}
