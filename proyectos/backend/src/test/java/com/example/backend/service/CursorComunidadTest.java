package com.example.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Base64;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@DisplayName("Cursor opaco de la comunidad")
class CursorComunidadTest {

  @Test
  void idaYVuelta() {
    LocalDateTime instante = LocalDateTime.of(2026, 11, 25, 10, 30, 15, 123456000);
    String cursor = CursorComunidad.codificar("actividad", instante, 42L);

    CursorComunidad.Posicion posicion = CursorComunidad.decodificar(cursor, "actividad");

    assertEquals(instante, posicion.instante());
    assertEquals(42L, posicion.id());
  }

  @Test
  void cursorManipulado400() {
    ResponseStatusException ex = assertThrows(ResponseStatusException.class,
      () -> CursorComunidad.decodificar("no-es-un-cursor", "actividad"));
    assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
  }

  @Test
  void cursorConIdNoNumerico400() {
    String cursor = Base64.getUrlEncoder().withoutPadding()
      .encodeToString("actividad|2026-11-25T10:30:15|abc".getBytes(StandardCharsets.UTF_8));
    assertThrows(ResponseStatusException.class, () -> CursorComunidad.decodificar(cursor, "actividad"));
  }

  @Test
  void cursorDeOtroOrden400() {
    String cursor = CursorComunidad.codificar("recientes", LocalDateTime.now(), 1L);
    ResponseStatusException ex = assertThrows(ResponseStatusException.class,
      () -> CursorComunidad.decodificar(cursor, "actividad"));
    assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
  }
}
