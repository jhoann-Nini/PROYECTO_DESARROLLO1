package com.example.backend.service;

import com.example.backend.dto.comunidad.CrearReporteComunidadRequest;
import com.example.backend.dto.comunidad.ReporteComunidadResponse;
import com.example.backend.entity.PublicacionComunidad;
import com.example.backend.entity.ReporteComunidad;
import com.example.backend.entity.RespuestaComunidad;
import com.example.backend.entity.Usuario;
import com.example.backend.exception.ConflictException;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.repository.ReporteComunidadRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.util.Set;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Reportes de publicaciones y respuestas (fase 2, CA-12). Nadie reporta lo
 * suyo (RN-16); una cuenta suspendida o bloqueada no reporta (RN-15); un
 * reporte abierto por usuario y contenido; el límite de 10 por hora se
 * comparte con reseñas y ofertas. Con 3 reportes no rechazados, el trigger
 * de la 030 oculta el contenido.
 */
@Service
public class ReporteComunidadService {

  public static final Set<String> MOTIVOS = Set.of("spam", "lenguaje-ofensivo", "acoso", "falso", "otro");
  static final int DESCRIPCION_MAX = 500;
  static final String MENSAJE_DUPLICADO = "Ya reportaste este contenido y tu reporte sigue abierto.";

  private final ReporteComunidadRepository reporteRepository;
  private final PublicacionComunidadService publicacionService;
  private final RespuestaComunidadService respuestaService;
  private final UsuarioService usuarioService;
  private final PermisosComunidad permisos;
  private final LimiteReportesService limiteReportes;

  @PersistenceContext
  private EntityManager entityManager;

  public ReporteComunidadService(ReporteComunidadRepository reporteRepository,
      PublicacionComunidadService publicacionService, RespuestaComunidadService respuestaService,
      UsuarioService usuarioService, PermisosComunidad permisos, LimiteReportesService limiteReportes) {
    this.reporteRepository = reporteRepository;
    this.publicacionService = publicacionService;
    this.respuestaService = respuestaService;
    this.usuarioService = usuarioService;
    this.permisos = permisos;
    this.limiteReportes = limiteReportes;
  }

  @Transactional
  public ReporteComunidadResponse reportarPublicacion(Jwt jwt, Long id, CrearReporteComunidadRequest request) {
    Usuario usuario = usuarioService.obtenerUsuarioDesdeJwt(jwt);
    permisos.verificarPuedePublicar(usuario);
    PublicacionComunidad publicacion = publicacionService.visibleParaEscribir(id, usuario);
    verificarNoEsAutor(publicacion.getAutor(), usuario);
    ReporteComunidad reporte = nuevo(usuario, request);
    if (reporteRepository.existeAbiertoDePublicacion(usuario.getIdUsuario(), id)) {
      throw new ConflictException(MENSAJE_DUPLICADO);
    }
    reporte.setPublicacion(publicacion);
    return guardar(usuario, reporte);
  }

  @Transactional
  public ReporteComunidadResponse reportarRespuesta(Jwt jwt, Long id, CrearReporteComunidadRequest request) {
    Usuario usuario = usuarioService.obtenerUsuarioDesdeJwt(jwt);
    permisos.verificarPuedePublicar(usuario);
    RespuestaComunidad respuesta = respuestaService.visibleParaReaccionar(id, usuario);
    verificarNoEsAutor(respuesta.getAutor(), usuario);
    ReporteComunidad reporte = nuevo(usuario, request);
    if (reporteRepository.existeAbiertoDeRespuesta(usuario.getIdUsuario(), id)) {
      throw new ConflictException(MENSAJE_DUPLICADO);
    }
    reporte.setRespuesta(respuesta);
    return guardar(usuario, reporte);
  }

  private ReporteComunidadResponse guardar(Usuario usuario, ReporteComunidad reporte) {
    limiteReportes.verificarLimite(usuario);
    try {
      ReporteComunidad guardado = reporteRepository.saveAndFlush(reporte);
      entityManager.refresh(guardado);  // la fecha de creación la fija el trigger de la 030
      return new ReporteComunidadResponse(guardado.getIdReporte(), guardado.getEstado().name(),
        guardado.getMotivo(), guardado.getFechaCreacion());
    } catch (DataAccessException ex) {
      // Dos peticiones simultáneas del mismo usuario: el índice único parcial descarta la segunda.
      String mensaje = String.valueOf(ex.getMostSpecificCause().getMessage()).toLowerCase();
      if (mensaje.contains("uq_reporte_comunidad_abierto")) {
        throw new ConflictException(MENSAJE_DUPLICADO);
      }
      // Cambios entre la lectura y el INSERT que detecta el trigger de la 030.
      if (mensaje.contains("contenido eliminado") || mensaje.contains("no existe el contenido reportado")) {
        throw new ResourceNotFoundException("El contenido ya no está disponible.");
      }
      if (mensaje.contains("inactiva o suspendida")) {
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Usuario inactivo o suspendido.");
      }
      throw ex;
    }
  }

  private static ReporteComunidad nuevo(Usuario usuario, CrearReporteComunidadRequest request) {
    String motivo = request.motivo() == null ? "" : request.motivo().trim();
    if (!MOTIVOS.contains(motivo)) {
      throw ModeracionComunidad.invalido("El motivo debe ser spam, lenguaje-ofensivo, acoso, falso u otro.");
    }
    String descripcion = request.descripcion() == null || request.descripcion().isBlank()
      ? null
      : ModeracionComunidad.texto(request.descripcion(), DESCRIPCION_MAX);
    if ("otro".equals(motivo) && descripcion == null) {
      throw ModeracionComunidad.invalido("Describe el motivo del reporte.");
    }
    ReporteComunidad reporte = new ReporteComunidad();
    reporte.setUsuario(usuario);
    reporte.setMotivo(motivo);
    reporte.setDescripcion(descripcion);
    return reporte;
  }

  private static void verificarNoEsAutor(Usuario autor, Usuario usuario) {
    if (autor.getIdUsuario().equals(usuario.getIdUsuario())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No puedes reportar tu propio contenido.");
    }
  }
}
