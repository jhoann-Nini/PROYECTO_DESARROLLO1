package com.example.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.example.backend.dto.EstadoReincidenciaResponse;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Cálculo puro de los escalones de reincidencia (Caso 6). */
class ReincidenciaServiceTest {

  private static final LocalDateTime AHORA = LocalDateTime.of(2026, 11, 22, 12, 0);

  private static LocalDateTime haceDias(int dias) {
    return AHORA.minusDays(dias);
  }

  @Test
  void sinFaltasNivelNinguno() {
    EstadoReincidenciaResponse e = ReincidenciaService.calcular(List.of(), AHORA);

    assertEquals(0, e.faltas());
    assertEquals(NivelReincidencia.NINGUNO, e.nivel());
    assertNull(e.ultimaFalta());
    assertNull(e.revisionPreviaHasta());
    assertNull(e.bloqueoHasta());
    assertNull(e.proximaCaducidad());
    assertFalse(e.bloqueoActivo());
    assertFalse(e.revisionPreviaActiva());
  }

  @Test
  void unaFaltaEsAviso() {
    EstadoReincidenciaResponse e = ReincidenciaService.calcular(List.of(haceDias(5)), AHORA);

    assertEquals(1, e.faltas());
    assertEquals(NivelReincidencia.AVISO, e.nivel());
    assertEquals(haceDias(5).plusDays(90), e.proximaCaducidad());
    assertNull(e.revisionPreviaHasta());
    assertNull(e.bloqueoHasta());
  }

  @Test
  void dosFaltasRecientesRevisionPrevia() {
    EstadoReincidenciaResponse e = ReincidenciaService.calcular(List.of(haceDias(20), haceDias(3)), AHORA);

    assertEquals(NivelReincidencia.REVISION_PREVIA, e.nivel());
    assertEquals(haceDias(3).plusDays(30), e.revisionPreviaHasta());
    assertNull(e.bloqueoHasta());
    assertTrue(e.revisionPreviaActiva());
    assertFalse(e.bloqueoActivo());
  }

  @Test
  void dosFaltasConLaUltimaDeHace31DiasVuelveAAviso() {
    EstadoReincidenciaResponse e = ReincidenciaService.calcular(List.of(haceDias(31), haceDias(60)), AHORA);

    assertEquals(NivelReincidencia.AVISO, e.nivel());
    assertFalse(e.revisionPreviaActiva());
  }

  @Test
  void tresFaltasBloqueaSieteDiasDesdeLaUltima() {
    EstadoReincidenciaResponse e = ReincidenciaService.calcular(
      List.of(haceDias(2), haceDias(40), haceDias(10)), AHORA);

    assertEquals(NivelReincidencia.BLOQUEO, e.nivel());
    assertEquals(haceDias(2), e.ultimaFalta());
    assertEquals(haceDias(2).plusDays(7), e.bloqueoHasta());
    assertEquals(haceDias(2).plusDays(30), e.revisionPreviaHasta());
    assertTrue(e.bloqueoActivo());
  }

  @Test
  void tresFaltasConBloqueoVencidoSigueEnRevisionPrevia() {
    EstadoReincidenciaResponse e = ReincidenciaService.calcular(
      List.of(haceDias(10), haceDias(20), haceDias(30)), AHORA);

    assertEquals(NivelReincidencia.REVISION_PREVIA, e.nivel());
    assertFalse(e.bloqueoActivo());
    assertTrue(e.revisionPreviaActiva());
  }

  @Test
  void proximaCaducidadEsLaFaltaMasAntigua() {
    EstadoReincidenciaResponse e = ReincidenciaService.calcular(
      List.of(haceDias(1), haceDias(80), haceDias(45)), AHORA);

    assertEquals(haceDias(80).plusDays(90), e.proximaCaducidad());
  }
}
