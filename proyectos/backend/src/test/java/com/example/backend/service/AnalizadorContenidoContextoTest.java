package com.example.backend.service;

import static org.junit.jupiter.api.Assertions.assertSame;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.util.ReflectionTestUtils;

/** En producción, reseñas y comunidad usan el mismo bean de AnalizadorContenido (con los términos agregados). */
@SpringBootTest
class AnalizadorContenidoContextoTest {

  @Autowired private AnalizadorContenido analizador;
  @Autowired private ResenaModerationService resenaModerationService;
  @Autowired private ModeracionComunidad moderacionComunidad;

  @Test
  void resenasYComunidadRecibenElMismoBean() {
    assertSame(analizador, ReflectionTestUtils.getField(resenaModerationService, "analizador"));
    assertSame(analizador, ReflectionTestUtils.getField(moderacionComunidad, "analizador"));
  }
}
