package com.example.backend.service;

import com.example.backend.dto.comunidad.AuditoriaModeracionComunidadResponse;
import com.example.backend.dto.comunidad.ContenidoModeradoResponse;
import com.example.backend.dto.comunidad.ElementoRevisionComunidadResponse;
import com.example.backend.dto.comunidad.ReporteModeracionComunidadResponse;
import com.example.backend.dto.comunidad.ReporteResueltoComunidadResponse;
import com.example.backend.dto.comunidad.ResolverReporteComunidadRequest;
import com.example.backend.entity.AccionModeracionComunidad;
import com.example.backend.entity.EstadoModeracion;
import com.example.backend.entity.EstadoReporte;
import com.example.backend.entity.ModeracionComunidadAuditoria;
import com.example.backend.entity.PublicacionComunidad;
import com.example.backend.entity.ReporteComunidad;
import com.example.backend.entity.ReporteComunidadHistorial;
import com.example.backend.entity.RespuestaComunidad;
import com.example.backend.entity.Usuario;
import com.example.backend.exception.ConflictException;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.repository.ModeracionComunidadAuditoriaRepository;
import com.example.backend.repository.PublicacionComunidadRepository;
import com.example.backend.repository.ReporteComunidadHistorialRepository;
import com.example.backend.repository.ReporteComunidadRepository;
import com.example.backend.repository.RespuestaComunidadRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.persistence.PersistenceContext;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Moderación de la comunidad (fase 2): cola de lo retenido por el filtro,
 * decisiones con motivo y auditoría (RN-11), y resolución de reportes con su
 * historial. Nadie decide sobre lo propio ni sobre un reporte que creó
 * (RN-16). Las mismas reglas las hacen cumplir los triggers de la 030; aquí
 * se comprueban antes para responder 403 o 409 en lugar de un error de base
 * de datos. La auditoría se guarda antes de cambiar el contenido, porque su
 * trigger valida el estado previo.
 */
@Service
public class ModeracionComunidadService {

  static final int MOTIVO_MAX = 500;
  static final int JUSTIFICACION_MAX = 2000;
  private static final List<EstadoReporte> ABIERTOS = List.of(EstadoReporte.PENDIENTE, EstadoReporte.EN_REVISION);

  private final PublicacionComunidadRepository publicacionRepository;
  private final RespuestaComunidadRepository respuestaRepository;
  private final ModeracionComunidadAuditoriaRepository auditoriaRepository;
  private final ReporteComunidadRepository reporteRepository;
  private final ReporteComunidadHistorialRepository historialRepository;
  private final UsuarioService usuarioService;
  private final PermisosComunidad permisos;
  private final AnalizadorContenido analizador;

  @PersistenceContext
  private EntityManager entityManager;

  public ModeracionComunidadService(PublicacionComunidadRepository publicacionRepository,
      RespuestaComunidadRepository respuestaRepository, ModeracionComunidadAuditoriaRepository auditoriaRepository,
      ReporteComunidadRepository reporteRepository, ReporteComunidadHistorialRepository historialRepository,
      UsuarioService usuarioService, PermisosComunidad permisos, AnalizadorContenido analizador) {
    this.publicacionRepository = publicacionRepository;
    this.respuestaRepository = respuestaRepository;
    this.auditoriaRepository = auditoriaRepository;
    this.reporteRepository = reporteRepository;
    this.historialRepository = historialRepository;
    this.usuarioService = usuarioService;
    this.permisos = permisos;
    this.analizador = analizador;
  }

  // ---------- Cola de revisión ----------

  @Transactional(readOnly = true)
  public List<ElementoRevisionComunidadResponse> colaEnRevision(Jwt jwt) {
    moderador(jwt);
    List<ElementoRevisionComunidadResponse> cola = new ArrayList<>();
    for (PublicacionComunidad p : publicacionRepository.pendientesDeRevision()) {
      ResultadoModeracion analisis = analizador.analizar(p.getTitulo() + "\n" + p.getContenido());
      cola.add(new ElementoRevisionComunidadResponse("PUBLICACION", p.getIdPublicacion(), p.getIdPublicacion(),
        p.getTitulo(), p.getContenido(), p.getAutor().getNombre(), p.getFechaCreacion(),
        analisis.riesgo().name(), analisis.motivos()));
    }
    for (RespuestaComunidad r : respuestaRepository.pendientesDeRevision()) {
      ResultadoModeracion analisis = analizador.analizar(r.getContenido());
      cola.add(new ElementoRevisionComunidadResponse("RESPUESTA", r.getIdRespuesta(),
        r.getPublicacion().getIdPublicacion(), r.getPublicacion().getTitulo(), r.getContenido(),
        r.getAutor().getNombre(), r.getFechaCreacion(), analisis.riesgo().name(), analisis.motivos()));
    }
    // Lo más grave primero (ALTO, MEDIO…); a igual riesgo, lo más antiguo.
    cola.sort(Comparator.comparing((ElementoRevisionComunidadResponse e) -> RiesgoModeracion.valueOf(e.riesgo()))
      .reversed().thenComparing(ElementoRevisionComunidadResponse::fechaCreacion));
    return cola;
  }

  // ---------- Decisiones sobre el contenido ----------

  @Transactional
  public ContenidoModeradoResponse decidirPublicacion(Jwt jwt, Long id, AccionModeracionComunidad accion, String motivo) {
    Usuario moderador = moderador(jwt);
    PublicacionComunidad p = publicacionRepository.findById(id)
      .orElseThrow(() -> new ResourceNotFoundException("Publicación no encontrada con id " + id));
    aplicar(moderador, p, null, accion, texto(motivo, MOTIVO_MAX, "El motivo"));
    return estado(p);
  }

  @Transactional
  public ContenidoModeradoResponse decidirRespuesta(Jwt jwt, Long id, AccionModeracionComunidad accion, String motivo) {
    Usuario moderador = moderador(jwt);
    RespuestaComunidad r = respuestaRepository.findById(id)
      .orElseThrow(() -> new ResourceNotFoundException("Respuesta no encontrada con id " + id));
    aplicar(moderador, null, r, accion, texto(motivo, MOTIVO_MAX, "El motivo"));
    return estado(r);
  }

  @Transactional(readOnly = true)
  public List<AuditoriaModeracionComunidadResponse> historialPublicacion(Jwt jwt, Long id) {
    moderador(jwt);
    return auditoriaRepository.findByPublicacionIdPublicacionOrderByFechaEventoDesc(id).stream().map(this::auditoria).toList();
  }

  @Transactional(readOnly = true)
  public List<AuditoriaModeracionComunidadResponse> historialRespuesta(Jwt jwt, Long id) {
    moderador(jwt);
    return auditoriaRepository.findByRespuestaIdRespuestaOrderByFechaEventoDesc(id).stream().map(this::auditoria).toList();
  }

  /**
   * Aplica una decisión sobre una publicación o una respuesta (solo una no
   * nula). Comprueba lo mismo que el trigger de la 030 y guarda la auditoría
   * antes del cambio.
   */
  private void aplicar(Usuario moderador, PublicacionComunidad p, RespuestaComunidad r,
      AccionModeracionComunidad accion, String motivo) {
    // Releer con bloqueo: si otra decisión llegó antes, se valida contra su resultado (409, no 500).
    entityManager.refresh(p != null ? p : r, LockModeType.PESSIMISTIC_WRITE);
    Usuario autor = p != null ? p.getAutor() : r.getAutor();
    if (autor.getIdUsuario().equals(moderador.getIdUsuario())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No puedes moderar tu propio contenido.");
    }
    EstadoModeracion estado = p != null ? p.getEstadoModeracion() : r.getEstadoModeracion();
    boolean oculta = p != null ? p.isOcultaPorModeracion() : r.isOcultaPorModeracion();
    boolean eliminada = p != null ? p.isEliminada() : r.isEliminada();
    boolean valida = switch (accion) {
      case APROBAR, RECHAZAR -> estado == EstadoModeracion.PENDIENTE && !eliminada;
      case OCULTAR -> !oculta && !eliminada;
      case RESTAURAR -> oculta;
      case ELIMINAR_MODERADOR -> !eliminada;
      case CERRAR, REABRIR -> false; // Fase 4.
    };
    if (!valida) {
      throw new ConflictException("La acción no corresponde al estado actual del contenido.");
    }

    String revisado = p != null ? p.getTitulo() + "\n\n" + p.getContenido() : r.getContenido();
    try {
      auditoriaRepository.saveAndFlush(new ModeracionComunidadAuditoria(p, r, moderador, accion, motivo, revisado));
    } catch (DataAccessException ex) {
      throw new ConflictException("Otra decisión cambió el contenido mientras tanto. Recarga la cola.");
    }

    switch (accion) {
      case APROBAR -> cambiarEstado(p, r, EstadoModeracion.PUBLICADA);
      case RECHAZAR -> cambiarEstado(p, r, EstadoModeracion.RECHAZADA);
      case OCULTAR, RESTAURAR -> {
        boolean ocultar = accion == AccionModeracionComunidad.OCULTAR;
        if (p != null) p.setOcultaPorModeracion(ocultar); else r.setOcultaPorModeracion(ocultar);
      }
      case ELIMINAR_MODERADOR -> {
        if (p != null) {
          p.setEliminada(true);
          p.setFechaEliminacion(PublicacionComunidad.ahora());
          p.setEliminadaPor(moderador);
        } else {
          r.setEliminada(true);
          r.setFechaEliminacion(PublicacionComunidad.ahora());
          r.setEliminadaPor(moderador);
        }
      }
      default -> throw new IllegalStateException("Acción no soportada: " + accion);
    }
    if (p != null) publicacionRepository.flush(); else respuestaRepository.flush();
  }

  private static void cambiarEstado(PublicacionComunidad p, RespuestaComunidad r, EstadoModeracion nuevo) {
    if (p != null) p.setEstadoModeracion(nuevo); else r.setEstadoModeracion(nuevo);
  }

  // ---------- Reportes ----------

  @Transactional(readOnly = true)
  public List<ReporteModeracionComunidadResponse> reportes(Jwt jwt, String estado) {
    moderador(jwt);
    List<EstadoReporte> estados;
    if (estado == null || estado.isBlank()) {
      estados = ABIERTOS;
    } else {
      try {
        estados = List.of(EstadoReporte.valueOf(estado.trim()));
      } catch (IllegalArgumentException e) {
        throw ModeracionComunidad.invalido("Estado de reporte desconocido.");
      }
    }
    return reporteRepository.findByEstadoInOrderByFechaCreacionAsc(estados).stream().map(this::reporte).toList();
  }

  @Transactional
  public ReporteResueltoComunidadResponse ponerEnRevision(Jwt jwt, Long idReporte, ResolverReporteComunidadRequest request) {
    Usuario moderador = moderador(jwt);
    ReporteComunidad reporte = reporteResoluble(idReporte, moderador);
    String justificacion = texto(request.justificacion(), JUSTIFICACION_MAX, "La justificación");
    if (reporte.getEstado() != EstadoReporte.PENDIENTE) {
      throw new ConflictException("El reporte no está pendiente.");
    }
    mover(reporte, moderador, EstadoReporte.EN_REVISION, justificacion);
    return new ReporteResueltoComunidadResponse(reporte.getIdReporte(), reporte.getEstado().name());
  }

  @Transactional
  public ReporteResueltoComunidadResponse rechazar(Jwt jwt, Long idReporte, ResolverReporteComunidadRequest request) {
    return resolver(jwt, idReporte, request, EstadoReporte.RECHAZADO);
  }

  @Transactional
  public ReporteResueltoComunidadResponse aceptar(Jwt jwt, Long idReporte, ResolverReporteComunidadRequest request) {
    return resolver(jwt, idReporte, request, EstadoReporte.ACEPTADO);
  }

  private ReporteResueltoComunidadResponse resolver(Jwt jwt, Long idReporte, ResolverReporteComunidadRequest request,
      EstadoReporte destino) {
    Usuario moderador = moderador(jwt);
    ReporteComunidad reporte = reporteResoluble(idReporte, moderador);
    String justificacion = texto(request.justificacion(), JUSTIFICACION_MAX, "La justificación");
    AccionModeracionComunidad accion = accionAlAceptar(destino, request.accion());
    if (reporte.getEstado() != EstadoReporte.PENDIENTE && reporte.getEstado() != EstadoReporte.EN_REVISION) {
      throw new ConflictException("El reporte ya está resuelto.");
    }
    if (reporte.getEstado() == EstadoReporte.PENDIENTE) {
      mover(reporte, moderador, EstadoReporte.EN_REVISION, justificacion);
    }
    mover(reporte, moderador, destino, justificacion);
    if (accion != null) {
      String motivo = request.motivo() == null || request.motivo().isBlank() ? justificacion : request.motivo();
      aplicar(moderador, reporte.getPublicacion(), reporte.getRespuesta(), accion,
        texto(motivo, MOTIVO_MAX, "El motivo"));
    }
    return new ReporteResueltoComunidadResponse(reporte.getIdReporte(), reporte.getEstado().name());
  }

  private static AccionModeracionComunidad accionAlAceptar(EstadoReporte destino, String accion) {
    if (destino != EstadoReporte.ACEPTADO || accion == null || accion.isBlank() || "NINGUNA".equals(accion)) {
      return null;
    }
    return switch (accion) {
      case "OCULTAR" -> AccionModeracionComunidad.OCULTAR;
      case "ELIMINAR" -> AccionModeracionComunidad.ELIMINAR_MODERADOR;
      default -> throw ModeracionComunidad.invalido("La acción debe ser NINGUNA, OCULTAR o ELIMINAR.");
    };
  }

  /** Cada paso guarda su historial y se escribe antes del siguiente: el trigger valida el estado anterior. */
  private void mover(ReporteComunidad reporte, Usuario moderador, EstadoReporte nuevo, String justificacion) {
    try {
      historialRepository.saveAndFlush(new ReporteComunidadHistorial(reporte, moderador, nuevo, justificacion));
    } catch (DataAccessException ex) {
      throw new ConflictException("Otra persona resolvió el reporte mientras tanto. Recarga la cola.");
    }
    reporte.setEstado(nuevo);
    reporteRepository.saveAndFlush(reporte);
  }

  private ReporteComunidad reporteResoluble(Long idReporte, Usuario moderador) {
    ReporteComunidad reporte = reporteRepository.findById(idReporte)
      .orElseThrow(() -> new ResourceNotFoundException("Reporte no encontrado con id " + idReporte));
    // Releer con bloqueo: dos moderadores a la vez sobre el mismo reporte se ponen en fila.
    entityManager.refresh(reporte, LockModeType.PESSIMISTIC_WRITE);
    if (reporte.getUsuario().getIdUsuario().equals(moderador.getIdUsuario())
        || reporte.autorDelContenido().getIdUsuario().equals(moderador.getIdUsuario())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN,
        "No puedes resolver un reporte que creaste ni uno sobre tu propio contenido.");
    }
    return reporte;
  }

  private ReporteModeracionComunidadResponse reporte(ReporteComunidad r) {
    PublicacionComunidad p = r.getPublicacion();
    RespuestaComunidad rc = r.getRespuesta();
    boolean esPublicacion = p != null;
    PublicacionComunidad publicacionDeContexto = esPublicacion ? p : rc.getPublicacion();
    long activos = esPublicacion
      ? reporteRepository.contarActivosDePublicacion(p.getIdPublicacion())
      : reporteRepository.contarActivosDeRespuesta(rc.getIdRespuesta());
    return new ReporteModeracionComunidadResponse(r.getIdReporte(),
      esPublicacion ? "PUBLICACION" : "RESPUESTA",
      esPublicacion ? p.getIdPublicacion() : rc.getIdRespuesta(),
      publicacionDeContexto.getIdPublicacion(), publicacionDeContexto.getTitulo(),
      esPublicacion ? p.getContenido() : rc.getContenido(),
      r.autorDelContenido().getNombre(), r.getUsuario().getNombre(), r.getMotivo(), r.getDescripcion(),
      r.getEstado().name(), r.getFechaCreacion(), activos,
      esPublicacion ? p.isOcultaPorReportes() : rc.isOcultaPorReportes(),
      esPublicacion ? p.isOcultaPorModeracion() : rc.isOcultaPorModeracion(),
      esPublicacion ? p.isEliminada() : rc.isEliminada());
  }

  // ---------- Contador del panel ----------

  @Transactional(readOnly = true)
  public long contarEnRevision() {
    return publicacionRepository.contarPendientesDeRevision() + respuestaRepository.contarPendientesDeRevision();
  }

  @Transactional(readOnly = true)
  public long contarReportesAbiertos() {
    return reporteRepository.countByEstadoIn(ABIERTOS);
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

  private static String texto(String valor, int maximo, String campo) {
    try {
      return ModeracionComunidad.texto(valor, maximo);
    } catch (ResponseStatusException e) {
      throw ModeracionComunidad.invalido(campo + " es obligatorio y tiene hasta " + maximo + " caracteres.");
    }
  }

  private ContenidoModeradoResponse estado(PublicacionComunidad p) {
    return new ContenidoModeradoResponse("PUBLICACION", p.getIdPublicacion(), p.getEstadoModeracion().name(),
      p.isOcultaPorModeracion(), p.isOcultaPorReportes(), p.isEliminada());
  }

  private ContenidoModeradoResponse estado(RespuestaComunidad r) {
    return new ContenidoModeradoResponse("RESPUESTA", r.getIdRespuesta(), r.getEstadoModeracion().name(),
      r.isOcultaPorModeracion(), r.isOcultaPorReportes(), r.isEliminada());
  }

  private AuditoriaModeracionComunidadResponse auditoria(ModeracionComunidadAuditoria a) {
    return new AuditoriaModeracionComunidadResponse(a.getIdAuditoria(), a.getAccion().name(), a.getMotivo(),
      a.getContenidoRevisado(), a.getModerador().getNombre(), a.getFechaEvento());
  }
}
