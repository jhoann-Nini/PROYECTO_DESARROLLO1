package com.example.backend.service;

import com.example.backend.dto.AccionModeracionRequest;
import com.example.backend.dto.ReporteOfertaHistorialResponse;
import com.example.backend.dto.ReporteOfertaModeracionResponse;
import com.example.backend.entity.EstadoReporte;
import com.example.backend.entity.ProductoEstablecimiento;
import com.example.backend.entity.ProductoEstablecimientoId;
import com.example.backend.entity.ReporteOferta;
import com.example.backend.entity.ReporteOfertaHistorial;
import com.example.backend.entity.Usuario;
import com.example.backend.exception.ConflictException;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.repository.ProductoEstablecimientoRepository;
import com.example.backend.repository.ReporteOfertaHistorialRepository;
import com.example.backend.repository.ReporteOfertaRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Moderación de reportes de precio y enlace incorrectos (Fase 2, H-05).
 * <p>
 * Ciclo: PENDIENTE → EN_REVISION → ACEPTADO | RECHAZADO. Cada transición
 * inserta primero su evento en reporte_oferta_historial y después cambia el
 * estado, en la misma transacción; la migración 021 lo exige en PostgreSQL.
 * <p>
 * Aceptar un reporte no modifica el precio de la oferta: el moderador lo
 * corrige con las herramientas de administración existentes.
 */
@Service
public class ModeracionReportesOfertaService {

  private static final int MAX_JUSTIFICACION = 2000;

  private final ReporteOfertaRepository reporteOfertaRepository;
  private final ReporteOfertaHistorialRepository historialRepository;
  private final ProductoEstablecimientoRepository productoEstablecimientoRepository;
  private final UsuarioService usuarioService;

  public ModeracionReportesOfertaService(
    ReporteOfertaRepository reporteOfertaRepository,
    ReporteOfertaHistorialRepository historialRepository,
    ProductoEstablecimientoRepository productoEstablecimientoRepository,
    UsuarioService usuarioService) {
    this.reporteOfertaRepository = reporteOfertaRepository;
    this.historialRepository = historialRepository;
    this.productoEstablecimientoRepository = productoEstablecimientoRepository;
    this.usuarioService = usuarioService;
  }

  @Transactional(readOnly = true)
  public List<ReporteOfertaModeracionResponse> listar(EstadoReporte estado, Jwt jwt) {
    validarPermisoModeracion(usuarioService.obtenerUsuarioDesdeJwt(jwt));
    List<ReporteOferta> reportes = estado == null
      ? reporteOfertaRepository.findAllConDetalles()
      : reporteOfertaRepository.findByEstadoConDetalles(estado);
    return conHistorial(reportes);
  }

  @Transactional(readOnly = true)
  public ReporteOfertaModeracionResponse obtener(Long idReporte, Jwt jwt) {
    validarPermisoModeracion(usuarioService.obtenerUsuarioDesdeJwt(jwt));
    ReporteOferta reporte = reporteOfertaRepository.findByIdConDetalles(requerirId(idReporte))
      .orElseThrow(() -> noEncontrado(idReporte));
    return conHistorial(List.of(reporte)).get(0);
  }

  /** Toma un reporte pendiente para revisarlo. */
  @Transactional
  public ReporteOfertaModeracionResponse tomar(Long idReporte, AccionModeracionRequest request, Jwt jwt) {
    Usuario actor = usuarioService.obtenerUsuarioDesdeJwt(jwt);
    validarPermisoModeracion(actor);
    ReporteOferta reporte = bloquearParaDecidir(idReporte, actor);

    if (reporte.getEstado() != EstadoReporte.PENDIENTE) {
      throw new ConflictException("Solo se puede tomar un reporte pendiente.");
    }
    transicionar(reporte, actor, EstadoReporte.EN_REVISION, justificacionOpcional(request));
    return conHistorial(List.of(reporte)).get(0);
  }

  /** Confirma que el precio o el enlace reportado es incorrecto. */
  @Transactional
  public ReporteOfertaModeracionResponse aceptar(Long idReporte, AccionModeracionRequest request, Jwt jwt) {
    return resolver(idReporte, EstadoReporte.ACEPTADO, justificacionOpcional(request), jwt);
  }

  /** Descarta el reporte. La justificación es obligatoria. */
  @Transactional
  public ReporteOfertaModeracionResponse rechazar(Long idReporte, AccionModeracionRequest request, Jwt jwt) {
    String justificacion = justificacionOpcional(request);
    if (justificacion == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
        "La justificación es obligatoria para rechazar un reporte.");
    }
    return resolver(idReporte, EstadoReporte.RECHAZADO, justificacion, jwt);
  }

  /**
   * Cierra un reporte. Si sigue PENDIENTE, primero lo pasa a EN_REVISION en
   * la misma transacción, con su propio evento, para no saltarse estados.
   */
  private ReporteOfertaModeracionResponse resolver(
    Long idReporte, EstadoReporte estadoFinal, String justificacion, Jwt jwt) {
    Usuario actor = usuarioService.obtenerUsuarioDesdeJwt(jwt);
    validarPermisoModeracion(actor);
    ReporteOferta reporte = bloquearParaDecidir(idReporte, actor);

    if (reporte.getEstado() == EstadoReporte.ACEPTADO || reporte.getEstado() == EstadoReporte.RECHAZADO) {
      throw new ConflictException("El reporte ya fue resuelto.");
    }
    if (reporte.getEstado() == EstadoReporte.PENDIENTE) {
      transicionar(reporte, actor, EstadoReporte.EN_REVISION, null);
    }
    transicionar(reporte, actor, estadoFinal, justificacion);
    return conHistorial(List.of(reporte)).get(0);
  }

  private ReporteOferta bloquearParaDecidir(Long idReporte, Usuario actor) {
    ReporteOferta reporte = reporteOfertaRepository.findByIdForUpdate(requerirId(idReporte))
      .orElseThrow(() -> noEncontrado(idReporte));
    if (reporte.getUsuario().getIdUsuario().equals(actor.getIdUsuario())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN,
        "No puedes resolver un reporte creado por ti.");
    }
    return reporte;
  }

  private void transicionar(
    ReporteOferta reporte, Usuario actor, EstadoReporte estadoNuevo, String justificacion) {
    LocalDateTime ahora = LocalDateTime.now();

    // Evento primero, mientras el reporte conserva el estado anterior.
    ReporteOfertaHistorial evento = new ReporteOfertaHistorial();
    evento.setReporte(reporte);
    evento.setModerador(actor);
    evento.setEstadoAnterior(reporte.getEstado());
    evento.setEstadoNuevo(estadoNuevo);
    evento.setJustificacion(justificacion);
    evento.setFechaEvento(ahora);
    historialRepository.saveAndFlush(evento);

    reporte.setEstado(estadoNuevo);
    reporte.setFechaActualizacion(ahora);
    reporteOfertaRepository.saveAndFlush(reporte);
  }

  private List<ReporteOfertaModeracionResponse> conHistorial(List<ReporteOferta> reportes) {
    if (reportes.isEmpty()) {
      return List.of();
    }
    Map<Long, List<ReporteOfertaHistorialResponse>> historialPorReporte = historialRepository
      .findByReportesConModerador(reportes.stream().map(ReporteOferta::getIdReporte).toList())
      .stream()
      .collect(Collectors.groupingBy(
        h -> h.getReporte().getIdReporte(),
        Collectors.mapping(this::toHistorialResponse, Collectors.toList())));

    return reportes.stream()
      .map(r -> toResponse(r, historialPorReporte.getOrDefault(r.getIdReporte(), List.of())))
      .toList();
  }

  private ReporteOfertaModeracionResponse toResponse(
    ReporteOferta r, List<ReporteOfertaHistorialResponse> historial) {
    ProductoEstablecimiento oferta = productoEstablecimientoRepository
      .findById(new ProductoEstablecimientoId(
        r.getProducto().getIdProducto(), r.getEstablecimiento().getIdEstablecimiento()))
      .orElse(null);
    return new ReporteOfertaModeracionResponse(
      r.getIdReporte(),
      r.getProducto().getIdProducto(),
      r.getProducto().getNombre(),
      r.getEstablecimiento().getIdEstablecimiento(),
      r.getEstablecimiento().getNombre(),
      oferta != null ? oferta.getPrecio() : null,
      oferta != null ? oferta.getDisponibilidad() : null,
      r.getUsuario().getIdUsuario(),
      r.getUsuario().getNombre(),
      r.getMotivo(),
      r.getDescripcion(),
      r.getEstado(),
      r.getFechaCreacion(),
      r.getFechaActualizacion(),
      historial);
  }

  private ReporteOfertaHistorialResponse toHistorialResponse(ReporteOfertaHistorial h) {
    return new ReporteOfertaHistorialResponse(
      h.getIdHistorial(),
      h.getEstadoAnterior(),
      h.getEstadoNuevo(),
      h.getModerador().getIdUsuario(),
      h.getModerador().getNombre(),
      h.getJustificacion(),
      h.getFechaEvento());
  }

  private static String justificacionOpcional(AccionModeracionRequest request) {
    if (request == null || request.motivo() == null || request.motivo().isBlank()) {
      return null;
    }
    String justificacion = request.motivo().trim();
    if (justificacion.length() > MAX_JUSTIFICACION) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
        "La justificación no puede superar 2000 caracteres.");
    }
    return justificacion;
  }

  private static Long requerirId(Long idReporte) {
    if (idReporte == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El ID del reporte es obligatorio.");
    }
    return idReporte;
  }

  private static ResourceNotFoundException noEncontrado(Long idReporte) {
    return new ResourceNotFoundException("Reporte de oferta no encontrado con id " + idReporte);
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
}
