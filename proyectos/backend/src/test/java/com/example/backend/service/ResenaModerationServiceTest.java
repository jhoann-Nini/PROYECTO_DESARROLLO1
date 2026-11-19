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
    assertEstado("ESTAFA", EstadoModeracion.PENDIENTE);
    assertEstado("estáfa", EstadoModeracion.PENDIENTE);
    assertEstado("est@fa", EstadoModeracion.PENDIENTE);
    assertEstado("ESTU-PIDO", EstadoModeracion.PENDIENTE);
    assertEstado("e s t a f a", EstadoModeracion.PENDIENTE);
    assertEstado("mierda!", EstadoModeracion.PENDIENTE);
    assertEstado("estafas", EstadoModeracion.PENDIENTE);
    assertEstado("idiotas", EstadoModeracion.PENDIENTE);
    assertEstado("i d i o t a", EstadoModeracion.PENDIENTE);
  }

  @Test
  void noDebeDetectarPalabrasComoParteDeOtras() {
    assertEstado("computadora", EstadoModeracion.PUBLICADA);
    assertEstado("último modelo", EstadoModeracion.PUBLICADA);
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
