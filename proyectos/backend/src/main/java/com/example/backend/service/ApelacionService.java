package com.example.backend.service;

import com.example.backend.dto.ApelacionModeracionResponse;
import com.example.backend.dto.ApelacionResponse;
import com.example.backend.dto.CrearApelacionRequest;
import com.example.backend.dto.DecisionApelableResponse;
import com.example.backend.dto.ResolverApelacionRequest;
import com.example.backend.entity.EstadoApelacion;
import com.example.backend.entity.EstadoModeracion;
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
  public static final String MOTIVO_EVENTO_ACEPTADA = "Apelación aceptada";
  public static final String RESPUESTA_ACEPTADA_POR_DEFECTO = "Apelación aceptada: la decisión se revirtió.";
  public static final String MENSAJE_CONFLICTO_ORIGINAL = "Tú tomaste la decisión original; debe resolverla otra persona.";
  public static final String MENSAJE_CONFLICTO_PROPIA = "No puedes resolver una apelación sobre tu propia reseña.";
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

  /** Cola de moderación, de la más antigua a la más reciente. */
  @Transactional(readOnly = true)
  public List<ApelacionModeracionResponse> listarParaModeracion(EstadoApelacion estado, Jwt jwt) {
    Usuario actor = usuarioService.obtenerUsuarioDesdeJwt(jwt);
    validarPermisoModeracion(actor);
    return apelacionRepository
      .findByEstadoOrderByFechaSolicitudAsc(estado != null ? estado : EstadoApelacion.PENDIENTE)
      .stream().map(a -> toModeracion(a, actor)).toList();
  }

  /**
   * Acepta: anula la falta y, si la reseña sigue en el estado apelado, revierte
   * la decisión en esta misma transacción con los eventos existentes.
   */
  @Transactional
  public ApelacionModeracionResponse aceptar(Long idApelacion, ResolverApelacionRequest request, Jwt jwt) {
    String respuesta = request != null && request.respuesta() != null ? request.respuesta().trim() : "";
    if (respuesta.isEmpty()) {
      respuesta = RESPUESTA_ACEPTADA_POR_DEFECTO;
    }
    Usuario actor = usuarioService.obtenerUsuarioDesdeJwt(jwt);
    Apelacion apelacion = resolver(idApelacion, EstadoApelacion.ACEPTADA, respuesta, actor);

    ResenaModeracionAuditoria decision = apelacion.getDecision();
    Resena resena = decision.getResena();
    boolean activa = Boolean.TRUE.equals(resena.getEstado());
    if (activa && "RECHAZAR".equals(decision.getAccion())
        && resena.getEstadoModeracion() == EstadoModeracion.RECHAZADA) {
      // Camino que exigen los triggers de la 020: RECHAZADA -> PENDIENTE, APROBAR, PUBLICADA.
      resena.setEstadoModeracion(EstadoModeracion.PENDIENTE);
      resenaRepository.saveAndFlush(resena);
      auditoriaRepository.saveAndFlush(evento(resena, actor, "APROBAR"));
      resena.setEstadoModeracion(EstadoModeracion.PUBLICADA);
      resenaRepository.saveAndFlush(resena);
    } else if (activa && "OCULTAR".equals(decision.getAccion())
        && Boolean.TRUE.equals(resena.getOcultaPorModeracion())) {
      // Igual que ReporteResenaService.publicarResena: evento primero, luego el estado.
      auditoriaRepository.saveAndFlush(evento(resena, actor, "RESTAURAR"));
      resena.setOcultaPorModeracion(false);
      resena.setModeradaPor(null);
      resena.setFechaModeracion(null);
      resena.setMotivoModeracion(null);
      resenaRepository.saveAndFlush(resena);
    }
    // Si la reseña cambió (editada, ya restaurada o eliminada), solo se anula la falta.
    return toModeracion(apelacion, actor);
  }

  /** Rechaza: la decisión queda firme. La respuesta es obligatoria. */
  @Transactional
  public ApelacionModeracionResponse rechazar(Long idApelacion, ResolverApelacionRequest request, Jwt jwt) {
    String respuesta = request != null && request.respuesta() != null ? request.respuesta().trim() : "";
    if (respuesta.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
        "Escribe una respuesta para el autor al rechazar la apelación.");
    }
    Usuario actor = usuarioService.obtenerUsuarioDesdeJwt(jwt);
    return toModeracion(resolver(idApelacion, EstadoApelacion.RECHAZADA, respuesta, actor), actor);
  }

  private Apelacion resolver(Long idApelacion, EstadoApelacion estado, String respuesta, Usuario actor) {
    validarPermisoModeracion(actor);
    Apelacion apelacion = apelacionRepository.findByIdForUpdate(idApelacion)
      .orElseThrow(() -> new ResourceNotFoundException("Apelación no encontrada con id " + idApelacion));
    if (apelacion.getAutor().getIdUsuario().equals(actor.getIdUsuario())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, MENSAJE_CONFLICTO_PROPIA);
    }
    if (apelacion.getDecision().getModerador().getIdUsuario().equals(actor.getIdUsuario())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, MENSAJE_CONFLICTO_ORIGINAL);
    }
    if (apelacion.getEstado() != EstadoApelacion.PENDIENTE) {
      throw new ConflictException("Esta apelación ya fue resuelta.");
    }
    apelacion.setEstado(estado);
    apelacion.setModerador(actor);
    apelacion.setRespuesta(respuesta);
    apelacion.setFechaResolucion(LocalDateTime.now());
    return apelacionRepository.saveAndFlush(apelacion);
  }

  private static ResenaModeracionAuditoria evento(Resena resena, Usuario actor, String accion) {
    ResenaModeracionAuditoria e = new ResenaModeracionAuditoria();
    e.setResena(resena);
    e.setModerador(actor);
    e.setAccion(accion);
    e.setMotivo(MOTIVO_EVENTO_ACEPTADA);
    e.setComentarioRevisado(resena.getComentario());
    e.setFechaEvento(LocalDateTime.now());
    return e;
  }

  private static ApelacionModeracionResponse toModeracion(Apelacion a, Usuario actor) {
    ResenaModeracionAuditoria d = a.getDecision();
    Resena r = d.getResena();
    boolean puedeResolver = a.getEstado() == EstadoApelacion.PENDIENTE
      && !a.getAutor().getIdUsuario().equals(actor.getIdUsuario())
      && !d.getModerador().getIdUsuario().equals(actor.getIdUsuario());
    return new ApelacionModeracionResponse(
      a.getIdApelacion(), a.getEstado().name(), a.getMotivo(), a.getRespuesta(),
      a.getFechaSolicitud(), a.getFechaResolucion(),
      r.getIdResena(), r.getProducto() != null ? r.getProducto().getNombre() : null,
      d.getComentarioRevisado(), d.getAccion(), d.getMotivo(), d.getFechaEvento(),
      a.getAutor().getIdUsuario(), a.getAutor().getNombre(),
      d.getModerador().getNombre(),
      a.getModerador() != null ? a.getModerador().getNombre() : null,
      puedeResolver);
  }

  private static void validarPermisoModeracion(Usuario usuario) {
    if (!Boolean.TRUE.equals(usuario.getEstado())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Usuario inactivo o suspendido.");
    }
    boolean autorizado = usuario.getRoles() != null && usuario.getRoles().stream()
      .filter(asignacion -> Boolean.TRUE.equals(asignacion.getEstado()))
      .map(asignacion -> asignacion.getRol())
      .anyMatch(rol -> rol != null && rol.getNombre() != null
        && ("Moderador".equalsIgnoreCase(rol.getNombre())
        || "Administrador".equalsIgnoreCase(rol.getNombre())));
    if (!autorizado) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN,
        "Se requiere un rol activo de Moderador o Administrador.");
    }
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
