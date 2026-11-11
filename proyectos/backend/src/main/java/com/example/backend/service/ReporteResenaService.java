package com.example.backend.service;

import com.example.backend.dto.ReporteResenaRequest;
import com.example.backend.dto.ReporteResenaResponse;
import com.example.backend.dto.ReporteResenaDecisionAuditoriaResponse;
import com.example.backend.entity.EstadoReporte;
import com.example.backend.entity.ReporteResena;
import com.example.backend.entity.ReporteResenaDecisionAuditoria;
import com.example.backend.entity.Resena;
import com.example.backend.entity.Usuario;
import com.example.backend.exception.ConflictException;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.repository.ReporteResenaRepository;
import com.example.backend.repository.ReporteResenaDecisionAuditoriaRepository;
import com.example.backend.repository.ResenaRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Servicio de negocio para la gestión de reportes sobre reseñas.
 * Implementa las reglas de validación de negocio, integridad de autorreporte,
 * prevención de reportes duplicados y persistencia en public.reporte_resena.
 */
@Service
public class ReporteResenaService {

    private static final Set<String> MOTIVOS_VALIDOS = Set.of(
            "spam",
            "lenguaje-ofensivo",
            "falso",
            "otro"
    );

    private final ReporteResenaRepository reporteResenaRepository;
    private final ResenaRepository resenaRepository;
    private final UsuarioService usuarioService;
    private final ReporteResenaDecisionAuditoriaRepository decisionAuditoriaRepository;

    public ReporteResenaService(
            ReporteResenaRepository reporteResenaRepository,
            ResenaRepository resenaRepository,
            UsuarioService usuarioService,
            ReporteResenaDecisionAuditoriaRepository decisionAuditoriaRepository) {
        this.reporteResenaRepository = reporteResenaRepository;
        this.resenaRepository = resenaRepository;
        this.usuarioService = usuarioService;
        this.decisionAuditoriaRepository = decisionAuditoriaRepository;
    }

    /**
     * Registra un nuevo reporte sobre una reseña específica por parte del usuario autenticado.
     */
    @Transactional
    public ReporteResenaResponse crearReporte(Long idResena, ReporteResenaRequest request, Jwt jwt) {
        if (idResena == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El ID de la reseña es obligatorio.");
        }

        // 1. Obtener usuario autenticado desde el JWT (Zero-Trust, ignorando cualquier idUsuario del cliente)
        Usuario usuario = usuarioService.obtenerUsuarioDesdeJwt(jwt);
        validarUsuarioActivo(usuario);

        // 2. Validar motivo y descripción
        validarMotivoYDescripcion(request);

        // 3. Verificar existencia de la reseña
        Resena resena = resenaRepository.findById(idResena)
                .orElseThrow(() -> new ResourceNotFoundException("Reseña no encontrada con id " + idResena));

        // 4. No permitir reportar reseñas eliminadas lógicamente (contrato: recurso no encontrado)
        if (!Boolean.TRUE.equals(resena.getEstado())) {
            throw new ResourceNotFoundException("Reseña no encontrada con id " + idResena);
        }

        // 5. No permitir autorreporte (HTTP 403 Forbidden)
        if (resena.getUsuario().getIdUsuario().equals(usuario.getIdUsuario())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No puedes reportar tu propia reseña.");
        }

        // 6. Prevenir reportes duplicados a nivel de aplicación (HTTP 409 Conflict)
        if (reporteResenaRepository.existsByUsuarioIdUsuarioAndResenaIdResena(usuario.getIdUsuario(), resena.getIdResena())) {
            throw new ConflictException("Ya has reportado esta reseña previamente.");
        }

        // 7. Instanciar entidad con estado inicial PENDIENTE
        ReporteResena reporte = new ReporteResena();
        reporte.setResena(resena);
        reporte.setUsuario(usuario);
        reporte.setMotivo(request.motivo().trim());
        reporte.setDescripcion(request.descripcion() != null ? request.descripcion().trim() : null);
        reporte.setEstado(EstadoReporte.PENDIENTE);
        reporte.setFechaCreacion(LocalDateTime.now());
        reporte.setFechaActualizacion(LocalDateTime.now());

        // 8. Persistencia y garantía transaccional final frente a concurrencia
        try {
            ReporteResena guardado = reporteResenaRepository.saveAndFlush(reporte);
            return toResponse(guardado);
        } catch (DataIntegrityViolationException ex) {
            if (isUniqueConstraintViolation(ex)) {
                throw new ConflictException("Ya has reportado esta reseña previamente.");
            }
            throw ex;
        }
    }

    /**
     * Consulta los reportes realizados exclusivamente por el usuario autenticado.
     */
    @Transactional(readOnly = true)
    public List<ReporteResenaResponse> listarMisReportes(Jwt jwt) {
        Usuario usuario = usuarioService.obtenerUsuarioDesdeJwt(jwt);
        validarUsuarioActivo(usuario);

        List<ReporteResena> reportes = reporteResenaRepository
                .findByUsuarioIdUsuarioOrderByFechaCreacionDesc(usuario.getIdUsuario());

        return reportes.stream()
                .map(this::toResponse)
                .toList();
    }


    /**
     * Consulta la bandeja de reportes para moderadores y administradores activos.
     * El usuario reportante y la reseña se cargan para evitar consultas diferidas al serializar.
     */
    @Transactional(readOnly = true)
    public List<ReporteResenaResponse> listarBandejaModeracion(EstadoReporte estado, Jwt jwt) {
        Usuario actor = usuarioService.obtenerUsuarioDesdeJwt(jwt);
        validarPermisoModeracion(actor);
        if (estado == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El estado del reporte es obligatorio.");
        }
        return reporteResenaRepository.findByEstadoOrderByFechaCreacionAsc(estado)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    /**
     * Cambia el estado de un reporte siguiendo el flujo permitido:
     * PENDIENTE -> EN_REVISION -> ACEPTADO | RECHAZADO.
     * No permite que un moderador resuelva un reporte que él mismo creó.
     */
    @Transactional
    public ReporteResenaResponse actualizarEstadoModeracion(Long idReporte, EstadoReporte nuevoEstado, Jwt jwt) {
        return actualizarEstadoModeracion(idReporte, nuevoEstado, null, jwt);
    }

    @Transactional
    public ReporteResenaResponse actualizarEstadoModeracion(
            Long idReporte, EstadoReporte nuevoEstado, String observacion, Jwt jwt) {
        if (idReporte == null || nuevoEstado == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El reporte y el nuevo estado son obligatorios.");
        }

        if (observacion != null && observacion.length() > 2000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La observación no puede superar 2000 caracteres.");
        }

        Usuario actor = usuarioService.obtenerUsuarioDesdeJwt(jwt);
        validarPermisoModeracion(actor);

        ReporteResena reporte = reporteResenaRepository.findWithResenaAndUsuarioByIdReporte(idReporte)
                .orElseThrow(() -> new ResourceNotFoundException("Reporte no encontrado con id " + idReporte));

        boolean esReportante = reporte.getUsuario().getIdUsuario().equals(actor.getIdUsuario());
        boolean esAutorResena = reporte.getResena().getUsuario().getIdUsuario().equals(actor.getIdUsuario());
        if (esReportante || esAutorResena) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "No puedes moderar un reporte propio ni uno relacionado con tu propia reseña.");
        }

        EstadoReporte actual = reporte.getEstado();
        boolean transicionValida = (actual == EstadoReporte.PENDIENTE && nuevoEstado == EstadoReporte.EN_REVISION)
                || (actual == EstadoReporte.EN_REVISION
                    && (nuevoEstado == EstadoReporte.ACEPTADO || nuevoEstado == EstadoReporte.RECHAZADO));
        if (!transicionValida) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Transición de estado no permitida: " + actual + " -> " + nuevoEstado + ".");
        }

        LocalDateTime ahora = LocalDateTime.now();
        if (actual == EstadoReporte.PENDIENTE && nuevoEstado == EstadoReporte.EN_REVISION) {
            reporte.setResponsable(actor);
            reporte.setFechaInicioRevision(ahora);
            reporte.setFechaRevision(null);
            reporte.setNotasRevision(null);
            reporte.setIdHistorialReasignacion(null);
        } else if (actual == EstadoReporte.EN_REVISION
                && (nuevoEstado == EstadoReporte.ACEPTADO || nuevoEstado == EstadoReporte.RECHAZADO)) {
            if (reporte.getResponsable() == null) {
                throw new ConflictException("El reporte no tiene un responsable asignado.");
            }
            boolean esResponsable = reporte.getResponsable().getIdUsuario().equals(actor.getIdUsuario());
            if (!esResponsable && !esAdministradorActivo(actor)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Solo el responsable asignado o un Administrador puede resolver este reporte.");
            }
            if (observacion == null || observacion.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "La justificación es obligatoria para aceptar o rechazar un reporte.");
            }
            reporte.setFechaRevision(ahora);
            reporte.setNotasRevision(observacion.trim());
        }

        ReporteResenaDecisionAuditoria evento = new ReporteResenaDecisionAuditoria();
        evento.setReporte(reporte);
        evento.setModerador(actor);
        evento.setEstadoAnterior(actual.name());
        evento.setEstadoNuevo(nuevoEstado.name());
        evento.setObservacion(observacion != null && !observacion.isBlank() ? observacion.trim() : null);
        evento.setFechaEvento(ahora);
        decisionAuditoriaRepository.saveAndFlush(evento);

        reporte.setEstado(nuevoEstado);
        reporte.setFechaActualizacion(ahora);
        return toResponse(reporteResenaRepository.saveAndFlush(reporte));
    }

    @Transactional(readOnly = true)
    public List<ReporteResenaDecisionAuditoriaResponse> listarHistorialModeracion(Long idReporte, Jwt jwt) {
        Usuario actor = usuarioService.obtenerUsuarioDesdeJwt(jwt);
        validarPermisoModeracion(actor);

        if (!reporteResenaRepository.existsById(idReporte)) {
            throw new ResourceNotFoundException("Reporte no encontrado con id " + idReporte);
        }

        return decisionAuditoriaRepository.findByReporteIdReporteOrderByFechaEventoDesc(idReporte)
                .stream()
                .map(evento -> new ReporteResenaDecisionAuditoriaResponse(
                        evento.getIdAuditoria(),
                        evento.getReporte().getIdReporte(),
                        evento.getModerador().getIdUsuario(),
                        evento.getModerador().getNombre(),
                        evento.getEstadoAnterior(),
                        evento.getEstadoNuevo(),
                        evento.getObservacion(),
                        evento.getFechaEvento()))
                .toList();
    }

    private boolean esAdministradorActivo(Usuario usuario) {
        return usuario.getRoles() != null && usuario.getRoles().stream()
                .filter(asignacion -> Boolean.TRUE.equals(asignacion.getEstado()))
                .map(asignacion -> asignacion.getRol())
                .anyMatch(rol -> rol != null && rol.getNombre() != null
                        && "Administrador".equalsIgnoreCase(rol.getNombre()));
    }

    private void validarPermisoModeracion(Usuario usuario) {
        validarUsuarioActivo(usuario);
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

    private void validarMotivoYDescripcion(ReporteResenaRequest request) {
        if (request == null || request.motivo() == null || request.motivo().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El motivo es obligatorio.");
        }

        String motivo = request.motivo().trim();
        if (!MOTIVOS_VALIDOS.contains(motivo)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "El motivo debe ser uno de los siguientes: spam, lenguaje-ofensivo, falso, otro."
            );
        }

        if ("otro".equalsIgnoreCase(motivo)) {
            if (request.descripcion() == null || request.descripcion().trim().isEmpty()) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "La descripción es obligatoria cuando el motivo es 'otro'."
                );
            }
        }
    }

    private void validarUsuarioActivo(Usuario usuario) {
        if (!Boolean.TRUE.equals(usuario.getEstado())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Usuario inactivo o suspendido.");
        }
    }

    private boolean isUniqueConstraintViolation(DataIntegrityViolationException ex) {
        Throwable cause = ex.getCause();
        if (cause instanceof ConstraintViolationException cve) {
            String constraintName = cve.getConstraintName();
            if ("uq_reporte_usuario_resena".equalsIgnoreCase(constraintName)) {
                return true;
            }
        }
        String msg = ex.getMessage();
        return msg != null && msg.toLowerCase().contains("uq_reporte_usuario_resena");
    }

    private ReporteResenaResponse toResponse(ReporteResena r) {
        return new ReporteResenaResponse(
                r.getIdReporte(),
                r.getResena().getIdResena(),
                r.getMotivo(),
                r.getDescripcion(),
                r.getEstado(),
                r.getFechaCreacion()
        );
    }
}

