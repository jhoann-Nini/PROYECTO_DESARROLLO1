package com.example.backend.service;

import com.example.backend.dto.ApelacionResponse;
import com.example.backend.dto.CrearApelacionRequest;
import com.example.backend.dto.DecisionApelableResponse;
import com.example.backend.entity.Apelacion;
import com.example.backend.entity.Resena;
import com.example.backend.entity.ResenaModeracionAuditoria;
import com.example.backend.entity.Usuario;
import com.example.backend.exception.ConflictException;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.repository.ApelacionRepository;
import com.example.backend.repository.ResenaModeracionAuditoriaRepository;
import com.example.backend.repository.ResenaRepository;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Apelaciones de decisiones de moderación (Caso 6, migración 026). El servicio
 * responde con mensajes claros; los triggers de PostgreSQL repiten las reglas.
 * Diseño en docs/superpowers/specs/2026-11-22-apelaciones-design.md.
 */
@Service
public class ApelacionService {

  public static final int PLAZO_DIAS = 15;
  private static final DateTimeFormatter FORMATO_FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy");

  private final ApelacionRepository apelacionRepository;
  private final ResenaModeracionAuditoriaRepository auditoriaRepository;
  private final ResenaRepository resenaRepository;
  private final UsuarioService usuarioService;

  public ApelacionService(
      ApelacionRepository apelacionRepository,
      ResenaModeracionAuditoriaRepository auditoriaRepository,
      ResenaRepository resenaRepository,
      UsuarioService usuarioService) {
    this.apelacionRepository = apelacionRepository;
    this.auditoriaRepository = auditoriaRepository;
    this.resenaRepository = resenaRepository;
    this.usuarioService = usuarioService;
  }

  /**
   * Apela la decisión RECHAZAR u OCULTAR más reciente de la reseña. El bloqueo
   * por reincidencia no lo impide: es la forma de impugnar esas faltas.
   */
  @Transactional
  public ApelacionResponse crear(CrearApelacionRequest request, Jwt jwt) {
    Usuario autor = usuarioService.obtenerUsuarioDesdeJwt(jwt);
    if (!Boolean.TRUE.equals(autor.getEstado())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Usuario inactivo o suspendido.");
    }
    String motivo = request.motivo() == null ? "" : request.motivo().trim();
    if (motivo.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
        "Explica por qué crees que la decisión fue un error.");
    }

    Resena resena = resenaRepository.findById(request.idResena())
      .filter(r -> Boolean.TRUE.equals(r.getEstado()))
      .orElseThrow(() -> new ResourceNotFoundException("Reseña no encontrada con id " + request.idResena()));
    if (!resena.getUsuario().getIdUsuario().equals(autor.getIdUsuario())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN,
        "Solo puedes apelar decisiones sobre tus propias reseñas.");
    }

    ResenaModeracionAuditoria decision = auditoriaRepository
      .findDecisionesApelablesDeResena(resena.getIdResena()).stream().findFirst()
      .orElseThrow(() -> new ConflictException(
        "Esta reseña no tiene una decisión de moderación que se pueda apelar."));

    if (apelacionRepository.findByDecisionIdAuditoria(decision.getIdAuditoria()).isPresent()) {
      throw new ConflictException("Ya apelaste esta decisión.");
    }
    LocalDateTime plazo = decision.getFechaEvento().plusDays(PLAZO_DIAS);
    if (LocalDateTime.now().isAfter(plazo)) {
      throw new ConflictException("El plazo de 15 días para apelar esta decisión venció el "
        + plazo.format(FORMATO_FECHA) + ".");
    }
    if ("OCULTAR".equals(decision.getAccion()) && !Boolean.TRUE.equals(resena.getOcultaPorModeracion())) {
      throw new ConflictException("La reseña ya fue restaurada; esta decisión ya no cuenta como falta.");
    }

    Apelacion apelacion = new Apelacion();
    apelacion.setDecision(decision);
    apelacion.setAutor(autor);
    apelacion.setMotivo(motivo);
    try {
      return toResponse(apelacionRepository.saveAndFlush(apelacion));
    } catch (DataIntegrityViolationException e) {
      // Dos solicitudes simultáneas sobre la misma decisión (uk_apelacion_auditoria).
      throw new ConflictException("Ya apelaste esta decisión.");
    }
  }

  /** Decisiones RECHAZAR u OCULTAR de los últimos 90 días sobre reseñas activas del autor. */
  @Transactional(readOnly = true)
  public List<DecisionApelableResponse> listarMias(Jwt jwt) {
    Usuario autor = usuarioService.obtenerUsuarioDesdeJwt(jwt);
    LocalDateTime ahora = LocalDateTime.now();
    Map<Long, Apelacion> porDecision = apelacionRepository.findByAutorIdUsuario(autor.getIdUsuario()).stream()
      .collect(Collectors.toMap(a -> a.getDecision().getIdAuditoria(), Function.identity()));

    return auditoriaRepository
      .findDecisionesDelAutorDesde(autor.getIdUsuario(), ahora.minusDays(ReincidenciaService.VENTANA_DIAS))
      .stream()
      .map(d -> {
        Apelacion apelacion = porDecision.get(d.getIdAuditoria());
        LocalDateTime plazo = d.getFechaEvento().plusDays(PLAZO_DIAS);
        boolean vigente = !"OCULTAR".equals(d.getAccion())
          || Boolean.TRUE.equals(d.getResena().getOcultaPorModeracion());
        boolean apelable = apelacion == null && !ahora.isAfter(plazo) && vigente
          && esLaMasReciente(d);
        return new DecisionApelableResponse(
          d.getIdAuditoria(),
          d.getResena().getIdResena(),
          d.getResena().getProducto() != null ? d.getResena().getProducto().getNombre() : null,
          d.getComentarioRevisado(),
          d.getAccion(),
          d.getMotivo(),
          d.getFechaEvento(),
          plazo,
          apelable,
          apelacion != null ? toResponse(apelacion) : null);
      })
      .toList();
  }

  /** Solo la decisión más reciente de cada reseña se puede apelar. */
  private boolean esLaMasReciente(ResenaModeracionAuditoria decision) {
    return auditoriaRepository.findDecisionesApelablesDeResena(decision.getResena().getIdResena())
      .stream().findFirst()
      .map(d -> d.getIdAuditoria().equals(decision.getIdAuditoria()))
      .orElse(false);
  }

  static ApelacionResponse toResponse(Apelacion a) {
    return new ApelacionResponse(
      a.getIdApelacion(),
      a.getEstado().name(),
      a.getMotivo(),
      a.getRespuesta(),
      a.getFechaSolicitud(),
      a.getFechaResolucion());
  }

}
