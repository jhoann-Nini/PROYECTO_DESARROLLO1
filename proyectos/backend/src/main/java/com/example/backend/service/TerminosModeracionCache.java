package com.example.backend.service;

import com.example.backend.entity.TerminoModeracion;
import com.example.backend.repository.TerminoModeracionRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Términos de moderación activos, ya compilados (Caso 6, migración 027).
 * Se recargan después de cada alta o desactivación ({@link #invalidar()}) y,
 * por si hubiera varias instancias, cuando la carga tiene más de 5 minutos.
 * Si la base de datos falla, se conserva la última carga: el filtro nunca se
 * queda sin la lista base ni lanza un error al publicar.
 */
@Component
public class TerminosModeracionCache implements FuenteTerminosModeracion {

  static final Duration VIGENCIA = Duration.ofMinutes(5);
  private static final Logger log = LoggerFactory.getLogger(TerminosModeracionCache.class);

  private record Carga(List<TerminoCompilado> terminos, Instant momento) {}

  private final TerminoModeracionRepository repository;
  private volatile Carga carga;
  private volatile boolean invalidada = true;

  public TerminosModeracionCache(TerminoModeracionRepository repository) {
    this.repository = repository;
  }

  @Override
  public List<TerminoCompilado> activos() {
    Carga actual = carga;
    if (invalidada || actual == null || actual.momento().plus(VIGENCIA).isBefore(Instant.now())) {
      actual = recargar();
    }
    return actual != null ? actual.terminos() : List.of();
  }

  /** La próxima lectura recarga desde la base de datos. */
  public void invalidar() {
    invalidada = true;
  }

  private synchronized Carga recargar() {
    try {
      List<TerminoCompilado> terminos = repository.findByActivoTrue().stream()
        .map(TerminosModeracionCache::compilar)
        .toList();
      carga = new Carga(terminos, Instant.now());
      invalidada = false;
    } catch (RuntimeException e) {
      log.warn("No se pudieron recargar los términos de moderación; se conserva la última carga.", e);
    }
    return carga;
  }

  private static TerminoCompilado compilar(TerminoModeracion t) {
    return ResenaModerationService.compilarTermino(t.getTermino(), t.getTerminoNormalizado(), t.getCategoria());
  }
}
