package com.example.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.backend.entity.CategoriaTerminoModeracion;
import com.example.backend.entity.TerminoModeracion;
import com.example.backend.repository.TerminoModeracionRepository;
import java.util.List;
import org.junit.jupiter.api.Test;

class TerminosModeracionCacheTest {

  private static TerminoModeracion termino(String texto) {
    TerminoModeracion t = new TerminoModeracion();
    t.setTermino(texto);
    t.setTerminoNormalizado(ResenaModerationService.normalizarTermino(texto));
    t.setCategoria(CategoriaTerminoModeracion.INSULTO);
    return t;
  }

  @Test
  void cargaUnaVezYReutiliza() {
    TerminoModeracionRepository repo = mock(TerminoModeracionRepository.class);
    when(repo.findByActivoTrue()).thenReturn(List.of(termino("imbécil")));
    TerminosModeracionCache cache = new TerminosModeracionCache(repo);

    assertEquals(1, cache.activos().size());
    assertEquals(1, cache.activos().size());
    verify(repo, times(1)).findByActivoTrue();
  }

  @Test
  void invalidarFuerzaRecargar() {
    TerminoModeracionRepository repo = mock(TerminoModeracionRepository.class);
    when(repo.findByActivoTrue()).thenReturn(List.of(termino("imbécil")), List.of());
    TerminosModeracionCache cache = new TerminosModeracionCache(repo);

    assertEquals(1, cache.activos().size());
    cache.invalidar();
    assertEquals(0, cache.activos().size());
  }

  @Test
  void siLaBaseFallaConservaLaUltimaCarga() {
    TerminoModeracionRepository repo = mock(TerminoModeracionRepository.class);
    when(repo.findByActivoTrue())
      .thenReturn(List.of(termino("imbécil")))
      .thenThrow(new IllegalStateException("base caída"));
    TerminosModeracionCache cache = new TerminosModeracionCache(repo);

    assertEquals(1, cache.activos().size());
    cache.invalidar();
    assertEquals(1, cache.activos().size());
  }

  @Test
  void siLaPrimeraCargaFallaDevuelveListaVacia() {
    TerminoModeracionRepository repo = mock(TerminoModeracionRepository.class);
    when(repo.findByActivoTrue()).thenThrow(new IllegalStateException("base caída"));

    assertEquals(0, new TerminosModeracionCache(repo).activos().size());
  }
}
