package com.example.backend.service;

import com.example.backend.dto.CrearTerminoModeracionRequest;
import com.example.backend.dto.TerminoModeracionResponse;
import com.example.backend.entity.TerminoModeracion;
import com.example.backend.entity.Usuario;
import com.example.backend.exception.ConflictException;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.repository.TerminoModeracionRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;

/**
 * Administración de la lista de términos de moderación (Caso 6, migración
 * 027). Solo administradores; los triggers de PostgreSQL repiten las reglas.
 */
@Service
public class TerminoModeracionService {

  public static final String MENSAJE_DUPLICADO = "Ese término ya está activo en la lista.";
  public static final String MENSAJE_LISTA_BASE = "Ese término ya está en la lista base del filtro.";

  private final TerminoModeracionRepository repository;
  private final TerminosModeracionCache cache;
  private final UsuarioService usuarioService;

  public TerminoModeracionService(
      TerminoModeracionRepository repository, TerminosModeracionCache cache, UsuarioService usuarioService) {
    this.repository = repository;
    this.cache = cache;
    this.usuarioService = usuarioService;
  }

  /** {@code estado}: ACTIVOS (por defecto), INACTIVOS o TODOS. */
  @Transactional(readOnly = true)
  public List<TerminoModeracionResponse> listar(String estado, Jwt jwt) {
    administradorActivo(jwt);
    String filtro = estado == null ? "ACTIVOS" : estado.trim().toUpperCase();
    List<TerminoModeracion> terminos = switch (filtro) {
      case "ACTIVOS" -> repository.findByActivoOrderByFechaCreacionDesc(true);
      case "INACTIVOS" -> repository.findByActivoOrderByFechaCreacionDesc(false);
      case "TODOS" -> repository.findAllByOrderByFechaCreacionDesc();
      default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
        "El estado debe ser ACTIVOS, INACTIVOS o TODOS.");
    };
    return terminos.stream().map(TerminoModeracionService::toResponse).toList();
  }

  @Transactional
  public TerminoModeracionResponse crear(CrearTerminoModeracionRequest request, Jwt jwt) {
    Usuario administrador = administradorActivo(jwt);
    String termino = request.termino() == null ? "" : request.termino().trim();
    String normalizado = ResenaModerationService.normalizarTermino(termino);
    if (normalizado == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
        "El término debe tener entre 2 y 60 caracteres e incluir letras.");
    }
    if (ResenaModerationService.estaEnListaBase(normalizado)) {
      throw new ConflictException(MENSAJE_LISTA_BASE);
    }
    if (repository.existsByTerminoNormalizadoAndActivoTrue(normalizado)) {
      throw new ConflictException(MENSAJE_DUPLICADO);
    }

    TerminoModeracion nuevo = new TerminoModeracion();
    nuevo.setTermino(termino);
    nuevo.setTerminoNormalizado(normalizado);
    nuevo.setCategoria(request.categoria());
    nuevo.setCreadoPor(administrador);
    try {
      nuevo = repository.saveAndFlush(nuevo);
    } catch (DataIntegrityViolationException e) {
      // Dos altas simultáneas del mismo término (uk_termino_moderacion_activo).
      throw new ConflictException(MENSAJE_DUPLICADO);
    }
    invalidarCache();
    return toResponse(nuevo);
  }

  @Transactional
  public TerminoModeracionResponse desactivar(Long idTermino, Jwt jwt) {
    Usuario administrador = administradorActivo(jwt);
    TerminoModeracion termino = repository.findByIdForUpdate(idTermino)
      .orElseThrow(() -> new ResourceNotFoundException("Término no encontrado con id " + idTermino));
    if (!Boolean.TRUE.equals(termino.getActivo())) {
      throw new ConflictException("Ese término ya está desactivado.");
    }
    termino.setActivo(false);
    termino.setDesactivadoPor(administrador);
    termino.setFechaDesactivacion(LocalDateTime.now());
    termino = repository.saveAndFlush(termino);
    invalidarCache();
    return toResponse(termino);
  }

  /**
   * Invalida ya (las lecturas de esta transacción ven el cambio) y otra vez
   * tras el commit, por si otra petición recargó la lista antes de confirmar.
   */
  private void invalidarCache() {
    cache.invalidar();
    if (TransactionSynchronizationManager.isSynchronizationActive()) {
      TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
        @Override
        public void afterCommit() {
          cache.invalidar();
        }
      });
    }
  }

  private Usuario administradorActivo(Jwt jwt) {
    Usuario usuario = usuarioService.obtenerUsuarioDesdeJwt(jwt);
    boolean administrador = Boolean.TRUE.equals(usuario.getEstado()) && usuario.getRoles() != null
      && usuario.getRoles().stream()
        .filter(asignacion -> Boolean.TRUE.equals(asignacion.getEstado()))
        .map(asignacion -> asignacion.getRol())
        .anyMatch(rol -> rol != null && "Administrador".equalsIgnoreCase(rol.getNombre()));
    if (!administrador) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Se requiere un rol activo de Administrador.");
    }
    return usuario;
  }

  private static TerminoModeracionResponse toResponse(TerminoModeracion t) {
    return new TerminoModeracionResponse(
      t.getIdTermino(),
      t.getTermino(),
      t.getCategoria().name(),
      t.getCategoria().etiqueta(),
      Boolean.TRUE.equals(t.getActivo()),
      t.getCreadoPor() != null ? t.getCreadoPor().getNombre() : null,
      t.getFechaCreacion(),
      t.getDesactivadoPor() != null ? t.getDesactivadoPor().getNombre() : null,
      t.getFechaDesactivacion());
  }
}
