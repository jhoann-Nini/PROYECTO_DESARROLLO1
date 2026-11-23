package com.example.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertFalse;

import com.example.backend.entity.EstadoModeracion;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * Señales de spam del Caso 6 (prioridad media): teléfonos y el mismo texto
 * en varias reseñas del mismo autor.
 */
class ResenaModerationServiceSpamTest {

  private final ResenaModerationService servicio = new ResenaModerationService();

  private static final String RESENA_LARGA =
    "Excelente equipo, la batería dura todo el día y la cámara es muy buena";

  @Test
  void informaElMotivoDeTelefono() {
    var resultado = servicio.analizar("escríbeme al 300 123 4567 y te lo vendo");

    assertEquals(RiesgoModeracion.MEDIO, resultado.riesgo());
    assertEquals(List.of(ResenaModerationService.MOTIVO_TELEFONO), resultado.motivos());
  }

  @Test
  void noConfundePreciosNiEspecificacionesConTelefonos() {
    for (String texto : List.of(
        "lo compré en $1.299.000",
        "pasó de 1.299.000 a 1.099.000",
        "1.299.000 1.500.000 y 2.000.000",
        "5000 mAh y 256 GB",
        "IMEI no aplica, modelo 2024")) {
      assertEquals(RiesgoModeracion.NINGUNO, servicio.analizar(texto).riesgo(), texto);
    }
  }

  @Test
  void retieneElMismoTextoQueOtraResenaDelAutor() {
    var resultado = servicio.analizar(RESENA_LARGA, List.of("Otra opinión distinta", RESENA_LARGA));

    assertEquals(RiesgoModeracion.MEDIO, resultado.riesgo());
    assertEquals(List.of(ResenaModerationService.MOTIVO_TEXTO_DUPLICADO), resultado.motivos());
    assertEquals(EstadoModeracion.PENDIENTE, servicio.determinarEstado(RESENA_LARGA, List.of(RESENA_LARGA)));
  }

  @Test
  void elDuplicadoIgnoraMayusculasTildesYPuntuacion() {
    String variante = "EXCELENTE equipo... la bateria dura todo el dia, y la camara es MUY buena!!";

    assertTrue(servicio.analizar(variante, List.of(RESENA_LARGA)).motivos()
      .contains(ResenaModerationService.MOTIVO_TEXTO_DUPLICADO));
  }

  @Test
  void losTextosCortosRepetidosSePublican() {
    // «Excelente producto» en varios productos es normal, no spam.
    var resultado = servicio.analizar("Excelente producto, muy recomendado", List.of("excelente producto muy recomendado"));

    assertEquals(RiesgoModeracion.NINGUNO, resultado.riesgo());
  }

  @Test
  void textosDistintosNoSonDuplicados() {
    var resultado = servicio.analizar(RESENA_LARGA,
      List.of("Excelente equipo, la batería dura todo el día y la cámara es regular"));

    assertFalse(resultado.riesgo().requiereRevision());
  }

  @Test
  void sinOtrasResenasElAnalisisEsElMismoQueAntes() {
    assertEquals(servicio.analizar(RESENA_LARGA), servicio.analizar(RESENA_LARGA, List.of()));
    assertEquals(servicio.analizar(RESENA_LARGA), servicio.analizar(RESENA_LARGA, null));
  }

  @Test
  void alEditarUnaPublicadaSeVuelveARevisarElDuplicado() {
    assertEquals(EstadoModeracion.PENDIENTE,
      servicio.estadoTrasEdicion(EstadoModeracion.PUBLICADA, RESENA_LARGA, List.of(RESENA_LARGA)));
    assertEquals(EstadoModeracion.PUBLICADA,
      servicio.estadoTrasEdicion(EstadoModeracion.PUBLICADA, RESENA_LARGA, List.of()));
  }
}
