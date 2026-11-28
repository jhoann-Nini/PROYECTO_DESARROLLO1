package com.example.backend.service;

import com.example.backend.dto.ApelacionResponse;
import com.example.backend.dto.ResolverApelacionRequest;
import com.example.backend.dto.comunidad.ApelacionComunidadModeracionResponse;
import com.example.backend.dto.comunidad.CrearApelacionComunidadRequest;
import com.example.backend.dto.comunidad.DecisionComunidadApelableResponse;
import com.example.backend.entity.AccionModeracionComunidad;
import com.example.backend.entity.ApelacionComunidad;
import com.example.backend.entity.EstadoApelacion;
import com.example.backend.entity.EstadoModeracion;
import com.example.backend.entity.ModeracionComunidadAuditoria;
import com.example.backend.entity.PublicacionComunidad;
import com.example.backend.entity.RespuestaComunidad;
import com.example.backend.entity.Usuario;
import com.example.backend.exception.ConflictException;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.repository.ApelacionComunidadRepository;
import com.example.backend.repository.ModeracionComunidadAuditoriaRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.persistence.PersistenceContext;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Apelaciones de decisiones de moderación del foro (comunidad, fase 3,
 * CA-15; migración 031). Mismas reglas que las de reseñas (026): 15 días,
 * una por decisión, solo el autor, y la resuelve otra persona con rol activo
 * que no sea el autor ni quien decidió. Solo se apela la decisión vigente
 * más reciente del contenido.
 *
 * <p>Aceptar anula la falta y, si la decisión sigue vigente, la revierte en
 * la misma transacción: APROBAR un rechazo, RESTAURAR un ocultamiento. Una
 * eliminación no se deshace. Los triggers de la 031 repiten las reglas; aquí
 * se comprueban antes para responder 403 o 409 en lugar de un error de base
 * de datos.
 *
 * <p>Orden de bloqueo, para no interbloquearse con publicar y responder
 * (usuario y después contenido): al apelar no se bloquea nada desde Java; lo
 * hace el trigger de la 031 en ese orden, y la vigencia se comprueba después
 * de insertar. Al resolver se bloquea la apelación y después el contenido.
 */
@Service
public class ApelacionComunidadService {

  public static final int PLAZO_DIAS = 15;
  public static final String MOTIVO_REVERSION = "Apelación aceptada";
  public static final String RESPUESTA_ACEPTADA_POR_DEFECTO = "Apelación aceptada: la decisión se revirtió.";
  public static final String RESPUESTA_ACEPTADA_ELIMINACION =
    "Apelación aceptada: la falta se anuló, pero el contenido eliminado no se puede recuperar.";
  public static final String MENSAJE_CONFLICTO_PROPIA = "No puedes resolver una apelación sobre tu propio contenido.";
  static final Set<AccionModeracionComunidad> APELABLES = Set.of(AccionModeracionComunidad.RECHAZAR,
    AccionModeracionComunidad.OCULTAR, AccionModeracionComunidad.ELIMINAR_MODERADOR);
  private static final DateTimeFormatter FORMATO_FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy");

  private final ApelacionComunidadRepository apelacionRepository;
  private final ModeracionComunidadAuditoriaRepository auditoriaRepository;
  private final ModeracionComunidadService moderacionService;
  private final UsuarioService usuarioService;
  private final PermisosComunidad permisos;

  @PersistenceContext
  private EntityManager entityManager;

  public ApelacionComunidadService(ApelacionComunidadRepository apelacionRepository,
      ModeracionComunidadAuditoriaRepository auditoriaRepository, ModeracionComunidadService moderacionService,
      UsuarioService usuarioService, PermisosComunidad permisos) {
    this.apelacionRepository = apelacionRepository;
    this.auditoriaRepository = auditoriaRepository;
    this.moderacionService = moderacionService;
    this.usuarioService = usuarioService;
    this.permisos = permisos;
  }

  // ---------- Autor ----------

  /**
   * Apela una decisión del foro. El bloqueo por reincidencia no lo impide:
   * es la forma de impugnar esas faltas.
   */
  @Transactional
  public ApelacionResponse crear(CrearApelacionComunidadRequest request, Jwt jwt) {
    Usuario autor = usuarioService.obtenerUsuarioDesdeJwt(jwt);
    permisos.verificarPuedeEscribir(autor);
    String motivo = request.motivo() == null ? "" : request.motivo().trim();
    if (motivo.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
        "Explica por qué crees que la decisión fue un error.");
    }

    ModeracionComunidadAuditoria decision = auditoriaRepository.findById(request.idAuditoria())
      .orElseThrow(() -> new ResourceNotFoundException("Decisión no encontrada con id " + request.idAuditoria()));
    if (!autorDe(decision).getIdUsuario().equals(autor.getIdUsuario())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN,
        "Solo puedes apelar decisiones sobre tu propio contenido.");
    }
    if (!APELABLES.contains(decision.getAccion())) {
      throw new ConflictException("Solo se apelan decisiones de rechazar, ocultar o eliminar.");
    }
    if (apelacionRepository.findByDecisionIdAuditoria(decision.getIdAuditoria()).isPresent()) {
      throw new ConflictException("Ya apelaste esta decisión.");
    }
    LocalDateTime plazo = plazo(decision);
    if (PublicacionComunidad.ahora().isAfter(plazo)) {
      throw new ConflictException("El plazo de " + PLAZO_DIAS + " días para apelar esta decisión venció el "
        + plazo.format(FORMATO_FECHA) + ".");
    }

    ApelacionComunidad apelacion;
    try {
      apelacion = apelacionRepository.saveAndFlush(new ApelacionComunidad(decision, autor, motivo));
    } catch (DataAccessException ex) {
      if (ModeracionComunidadService.esRechazoDeTrigger(ex)) {
        throw new ConflictException("Esta decisión ya no se puede apelar. Recarga la página.");
      }
      if (ex instanceof DataIntegrityViolationException) {
        // Dos solicitudes simultáneas sobre la misma decisión (uk_apelacion_comunidad_auditoria).
        throw new ConflictException("Ya apelaste esta decisión.");
      }
      throw ex;
    }

    // Después de insertar: el trigger ya esperó, con bloqueo, a cualquier
    // cambio en curso del contenido, así que esta lectura ve su resultado.
    entityManager.refresh(contenido(decision));
    String noVigente = motivoNoApelable(decision);
    if (noVigente != null) {
      throw new ConflictException(noVigente);
    }
    return toResponse(apelacion);
  }

  /** Decisiones apelables (y las ya apeladas) de los últimos 90 días sobre contenido del autor. */
  @Transactional(readOnly = true)
  public List<DecisionComunidadApelableResponse> listarMias(Jwt jwt) {
    Usuario autor = usuarioService.obtenerUsuarioDesdeJwt(jwt);
    LocalDateTime ahora = PublicacionComunidad.ahora();
    Map<Long, ApelacionComunidad> porDecision = apelacionRepository.findByAutorIdUsuario(autor.getIdUsuario())
      .stream().collect(Collectors.toMap(a -> a.getDecision().getIdAuditoria(), Function.identity()));
    List<ModeracionComunidadAuditoria> decisiones = auditoriaRepository.findDecisionesDelAutorDesde(
      autor.getIdUsuario(), APELABLES, ahora.minusDays(ReincidenciaService.VENTANA_DIAS));

    // Más reciente por contenido: la lista viene ordenada por id descendente
    // y cualquier decisión posterior a una de la ventana también está en ella.
    Map<String, Long> ultimaPorContenido = new HashMap<>();
    decisiones.forEach(d -> ultimaPorContenido.putIfAbsent(clave(d), d.getIdAuditoria()));

    return decisiones.stream().map(d -> {
      ApelacionComunidad apelacion = porDecision.get(d.getIdAuditoria());
      LocalDateTime plazo = plazo(d);
      boolean apelable = apelacion == null && !ahora.isAfter(plazo)
        && d.getIdAuditoria().equals(ultimaPorContenido.get(clave(d)))
        && vigente(d) && !eliminadaPorSuAutor(d);
      PublicacionComunidad hilo = hilo(d);
      return new DecisionComunidadApelableResponse(d.getIdAuditoria(), tipo(d), idContenido(d),
        hilo.getIdPublicacion(), hilo.getTitulo(), d.getContenidoRevisado(), d.getAccion().name(), d.getMotivo(),
        d.getFechaEvento(), plazo, apelable, eliminado(d),
        apelacion != null ? toResponse(apelacion) : null);
    }).toList();
  }

  // ---------- Moderación ----------

  /** Cola de moderación, de la más antigua a la más reciente; por defecto, las PENDIENTE. */
  @Transactional(readOnly = true)
  public List<ApelacionComunidadModeracionResponse> listarParaModeracion(EstadoApelacion estado, Jwt jwt) {
    Usuario actor = moderador(jwt);
    return apelacionRepository.colaPorEstado(estado != null ? estado : EstadoApelacion.PENDIENTE).stream()
      .map(a -> toModeracion(a, actor, null)).toList();
  }

  /**
   * Acepta: anula la falta y, si la decisión sigue vigente, la revierte en
   * esta misma transacción. La apelación se guarda antes que la reversión:
   * el trigger de la 031 busca la apelación aceptada en esta transacción.
   */
  @Transactional
  public ApelacionComunidadModeracionResponse aceptar(Long idApelacion, ResolverApelacionRequest request, Jwt jwt) {
    Usuario actor = moderador(jwt);
    ApelacionComunidad apelacion = resoluble(idApelacion, actor);
    ModeracionComunidadAuditoria decision = apelacion.getDecision();
    // Releer con bloqueo, después de la apelación: se decide con el estado real del contenido.
    entityManager.refresh(contenido(decision), LockModeType.PESSIMISTIC_WRITE);
    AccionModeracionComunidad reversion = reversion(decision);

    String respuesta = textoRespuesta(request);
    if (respuesta.isEmpty()) {
      respuesta = decision.getAccion() == AccionModeracionComunidad.ELIMINAR_MODERADOR
        ? RESPUESTA_ACEPTADA_ELIMINACION : RESPUESTA_ACEPTADA_POR_DEFECTO;
    }
    guardarResolucion(apelacion, EstadoApelacion.ACEPTADA, actor, respuesta);
    if (reversion != null) {
      moderacionService.revertirPorApelacion(actor, decision.getPublicacion(), decision.getRespuesta(), reversion);
    }
    // Si el contenido cambió (editado, ya restaurado, eliminado), solo se anula la falta.
    return toModeracion(apelacion, actor, reversion != null);
  }

  /** Rechaza: la decisión queda firme. La respuesta es obligatoria. */
  @Transactional
  public ApelacionComunidadModeracionResponse rechazar(Long idApelacion, ResolverApelacionRequest request, Jwt jwt) {
    String respuesta = textoRespuesta(request);
    if (respuesta.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
        "Escribe una respuesta para el autor al rechazar la apelación.");
    }
    Usuario actor = moderador(jwt);
    ApelacionComunidad apelacion = resoluble(idApelacion, actor);
    guardarResolucion(apelacion, EstadoApelacion.RECHAZADA, actor, respuesta);
    return toModeracion(apelacion, actor, false);
  }

  @Transactional(readOnly = true)
  public long contarPendientes() {
    return apelacionRepository.countByEstado(EstadoApelacion.PENDIENTE);
  }

  // ---------- Reglas ----------

  /** Bloquea la apelación y comprueba quién la resuelve y que siga pendiente. */
  private ApelacionComunidad resoluble(Long idApelacion, Usuario actor) {
    ApelacionComunidad apelacion = apelacionRepository.findByIdForUpdate(idApelacion)
      .orElseThrow(() -> new ResourceNotFoundException("Apelación no encontrada con id " + idApelacion));
    if (apelacion.getAutor().getIdUsuario().equals(actor.getIdUsuario())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, MENSAJE_CONFLICTO_PROPIA);
    }
    if (apelacion.getDecision().getModerador().getIdUsuario().equals(actor.getIdUsuario())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, ApelacionService.MENSAJE_CONFLICTO_ORIGINAL);
    }
    if (apelacion.getEstado() != EstadoApelacion.PENDIENTE) {
      throw new ConflictException("Esta apelación ya fue resuelta.");
    }
    return apelacion;
  }

  private void guardarResolucion(ApelacionComunidad apelacion, EstadoApelacion estado, Usuario actor,
      String respuesta) {
    apelacion.resolver(estado, actor, respuesta);
    try {
      apelacionRepository.saveAndFlush(apelacion);
    } catch (DataAccessException ex) {
      if (!ModeracionComunidadService.esRechazoDeTrigger(ex)) throw ex;
      throw new ConflictException("Otra persona resolvió la apelación mientras tanto. Recarga la cola.");
    }
  }

  /**
   * Acción que deshace la decisión, o null si ya no se puede deshacer: el
   * contenido está eliminado, cambió de estado o hubo una decisión igual
   * posterior (no se deshace la de otra persona).
   */
  private AccionModeracionComunidad reversion(ModeracionComunidadAuditoria d) {
    if (eliminado(d) || !d.getIdAuditoria().equals(ultima(d, Set.of(d.getAccion())))) {
      return null;
    }
    return switch (d.getAccion()) {
      case RECHAZAR -> estadoModeracion(d) == EstadoModeracion.RECHAZADA ? AccionModeracionComunidad.APROBAR : null;
      case OCULTAR -> ocultaPorModeracion(d) ? AccionModeracionComunidad.RESTAURAR : null;
      default -> null;
    };
  }

  /** null si la decisión se puede apelar; si no, el mensaje para el autor. */
  private String motivoNoApelable(ModeracionComunidadAuditoria d) {
    if (eliminadaPorSuAutor(d)) {
      return "Eliminaste este contenido; la decisión ya no se puede apelar.";
    }
    if (!vigente(d)) {
      return "El contenido ya fue restaurado; esta decisión ya no cuenta como falta.";
    }
    if (!d.getIdAuditoria().equals(ultima(d, APELABLES))) {
      return "Hay una decisión más reciente sobre este contenido: apela esa.";
    }
    return null;
  }

  /** Un ocultamiento deja de estar vigente si el contenido ya no está oculto. */
  private static boolean vigente(ModeracionComunidadAuditoria d) {
    return d.getAccion() != AccionModeracionComunidad.OCULTAR || ocultaPorModeracion(d);
  }

  private Long ultima(ModeracionComunidadAuditoria d, Set<AccionModeracionComunidad> acciones) {
    return d.getPublicacion() != null
      ? auditoriaRepository.ultimaDePublicacion(d.getPublicacion().getIdPublicacion(), acciones)
      : auditoriaRepository.ultimaDeRespuesta(d.getRespuesta().getIdRespuesta(), acciones);
  }

  private static LocalDateTime plazo(ModeracionComunidadAuditoria d) {
    return d.getFechaEvento().plusDays(PLAZO_DIAS);
  }

  // ---------- Contenido de la decisión (publicación o respuesta) ----------

  private static Object contenido(ModeracionComunidadAuditoria d) {
    return d.getPublicacion() != null ? d.getPublicacion() : d.getRespuesta();
  }

  private static Usuario autorDe(ModeracionComunidadAuditoria d) {
    return d.getPublicacion() != null ? d.getPublicacion().getAutor() : d.getRespuesta().getAutor();
  }

  private static boolean eliminado(ModeracionComunidadAuditoria d) {
    return d.getPublicacion() != null ? d.getPublicacion().isEliminada() : d.getRespuesta().isEliminada();
  }

  private static boolean eliminadaPorSuAutor(ModeracionComunidadAuditoria d) {
    Usuario por = d.getPublicacion() != null ? d.getPublicacion().getEliminadaPor() : d.getRespuesta().getEliminadaPor();
    return eliminado(d) && por != null && por.getIdUsuario().equals(autorDe(d).getIdUsuario());
  }

  private static boolean ocultaPorModeracion(ModeracionComunidadAuditoria d) {
    return d.getPublicacion() != null ? d.getPublicacion().isOcultaPorModeracion()
      : d.getRespuesta().isOcultaPorModeracion();
  }

  private static EstadoModeracion estadoModeracion(ModeracionComunidadAuditoria d) {
    return d.getPublicacion() != null ? d.getPublicacion().getEstadoModeracion()
      : d.getRespuesta().getEstadoModeracion();
  }

  private static PublicacionComunidad hilo(ModeracionComunidadAuditoria d) {
    return d.getPublicacion() != null ? d.getPublicacion() : d.getRespuesta().getPublicacion();
  }

  private static String tipo(ModeracionComunidadAuditoria d) {
    return d.getPublicacion() != null ? "PUBLICACION" : "RESPUESTA";
  }

  private static Long idContenido(ModeracionComunidadAuditoria d) {
    RespuestaComunidad r = d.getRespuesta();
    return d.getPublicacion() != null ? d.getPublicacion().getIdPublicacion() : r.getIdRespuesta();
  }

  private static String clave(ModeracionComunidadAuditoria d) {
    return tipo(d) + ":" + idContenido(d);
  }

  // ---------- Ayudas ----------

  /** Moderador o administrador con cuenta activa (también lo exige SecurityConfig). */
  private Usuario moderador(Jwt jwt) {
    Usuario usuario = usuarioService.obtenerUsuarioDesdeJwt(jwt);
    permisos.verificarPuedeEscribir(usuario);
    if (!permisos.esModerador(usuario)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Se requiere rol de moderación.");
    }
    return usuario;
  }

  private static String textoRespuesta(ResolverApelacionRequest request) {
    return request != null && request.respuesta() != null ? request.respuesta().trim() : "";
  }

  private static ApelacionComunidadModeracionResponse toModeracion(ApelacionComunidad a, Usuario actor,
      Boolean contenidoRevertido) {
    ModeracionComunidadAuditoria d = a.getDecision();
    PublicacionComunidad hilo = hilo(d);
    boolean puedeResolver = a.getEstado() == EstadoApelacion.PENDIENTE
      && !a.getAutor().getIdUsuario().equals(actor.getIdUsuario())
      && !d.getModerador().getIdUsuario().equals(actor.getIdUsuario());
    return new ApelacionComunidadModeracionResponse(a.getIdApelacion(), a.getEstado().name(), a.getMotivo(),
      a.getRespuesta(), a.getFechaSolicitud(), a.getFechaResolucion(), tipo(d), idContenido(d),
      hilo.getIdPublicacion(), hilo.getTitulo(), d.getContenidoRevisado(), d.getAccion().name(), d.getMotivo(),
      d.getFechaEvento(), a.getAutor().getIdUsuario(), a.getAutor().getNombre(), d.getModerador().getNombre(),
      a.getModerador() != null ? a.getModerador().getNombre() : null, eliminado(d), puedeResolver,
      contenidoRevertido);
  }

  private static ApelacionResponse toResponse(ApelacionComunidad a) {
    return new ApelacionResponse(a.getIdApelacion(), a.getEstado().name(), a.getMotivo(), a.getRespuesta(),
      a.getFechaSolicitud(), a.getFechaResolucion());
  }
}
