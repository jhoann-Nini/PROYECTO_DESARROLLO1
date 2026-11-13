package com.example.backend.service;

import com.example.backend.dto.AccionModeracionRequest;
import com.example.backend.dto.ReporteResenaRequest;
import com.example.backend.dto.ReporteResenaResponse;
import com.example.backend.dto.ReporteResenaDecisionAuditoriaResponse;
import com.example.backend.dto.ReporteResenaItemResponse;
import com.example.backend.dto.ResenaReportadaResponse;
import com.example.backend.entity.EstadoReporte;
import com.example.backend.entity.ReporteResena;
import com.example.backend.entity.ReporteResenaDecisionAuditoria;
import com.example.backend.entity.Resena;
import com.example.backend.entity.ResenaModeracionAuditoria;
import com.example.backend.entity.Usuario;
import com.example.backend.exception.ConflictException;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.repository.ReporteResenaRepository;
import com.example.backend.repository.ReporteResenaDecisionAuditoriaRepository;
import com.example.backend.repository.ResenaModeracionAuditoriaRepository;
import com.example.backend.repository.ResenaRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Servicio de negocio para la gestión de reportes sobre reseñas y acciones de moderación (S2-42, S2-43).
 * Implementa validaciones de negocio, integridad de autorreporte, prevención de duplicados,
 * máquina de estados de reportes y auditoría transaccional append-only conforme a las migraciones 010 y 011.
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
    private final ResenaModeracionAuditoriaRepository moderacionAuditoriaRepository;

    public ReporteResenaService(
            ReporteResenaRepository reporteResenaRepository,
            ResenaRepository resenaRepository,
            UsuarioService usuarioService,
            ReporteResenaDecisionAuditoriaRepository decisionAuditoriaRepository) {
        this(reporteResenaRepository, resenaRepository, usuarioService, decisionAuditoriaRepository, null);
    }

    @Autowired
    public ReporteResenaService(
            ReporteResenaRepository reporteResenaRepository,
            ResenaRepository resenaRepository,
            UsuarioService usuarioService,
            ReporteResenaDecisionAuditoriaRepository decisionAuditoriaRepository,
            ResenaModeracionAuditoriaRepository moderacionAuditoriaRepository) {
        this.reporteResenaRepository = reporteResenaRepository;
        this.resenaRepository = resenaRepository;
        this.usuarioService = usuarioService;
        this.decisionAuditoriaRepository = decisionAuditoriaRepository;
        this.moderacionAuditoriaRepository = moderacionAuditoriaRepository;
    }

    /**
     * Registra un nuevo reporte sobre una reseña específica por parte del usuario autenticado.
     */
    @Transactional
    public ReporteResenaResponse crearReporte(Long idResena, ReporteResenaRequest request, Jwt jwt) {
        if (idResena == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El ID de la reseña es obligatorio.");
        }

        Usuario usuario = usuarioService.obtenerUsuarioDesdeJwt(jwt);
        validarUsuarioActivo(usuario);
        validarMotivoYDescripcion(request);

        Resena resena = resenaRepository.findById(idResena)
                .orElseThrow(() -> new ResourceNotFoundException("Reseña no encontrada con id " + idResena));

        if (!Boolean.TRUE.equals(resena.getEstado())) {
            throw new ResourceNotFoundException("Reseña no encontrada con id " + idResena);
        }

        if (resena.getUsuario().getIdUsuario().equals(usuario.getIdUsuario())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No puedes reportar tu propia reseña.");
        }

        if (reporteResenaRepository.existsByUsuarioIdUsuarioAndResenaIdResena(usuario.getIdUsuario(), resena.getIdResena())) {
            throw new ConflictException("Ya has reportado esta reseña previamente.");
        }

        ReporteResena reporte = new ReporteResena();
        reporte.setResena(resena);
        reporte.setUsuario(usuario);
        reporte.setMotivo(request.motivo().trim());
        reporte.setDescripcion(request.descripcion() != null ? request.descripcion().trim() : null);
        reporte.setEstado(EstadoReporte.PENDIENTE);
        reporte.setFechaCreacion(LocalDateTime.now());
        reporte.setFechaActualizacion(LocalDateTime.now());

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

    public ReporteResenaResponse actualizarEstadoModeracion(Long idReporte, EstadoReporte nuevoEstado, Jwt jwt) {
        return actualizarEstadoModeracion(idReporte, nuevoEstado, null, jwt);
    }

    /**
     * Avanza o resuelve un reporte según la máquina de estados estricta (PENDIENTE -> EN_REVISION -> ACEPTADO/RECHAZADO).
     * Registra auditoría append-only obligatoria en reporte_resena_decision_auditoria.
     */
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
        boolean iniciarRevision = actual == EstadoReporte.PENDIENTE
                && nuevoEstado == EstadoReporte.EN_REVISION;
        boolean resolverReporte = actual == EstadoReporte.EN_REVISION
                && (nuevoEstado == EstadoReporte.ACEPTADO || nuevoEstado == EstadoReporte.RECHAZADO);

        if (resolverReporte) {
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
        }

        // Registrar primero la auditoría mientras el reporte conserva su estado anterior.
        ReporteResenaDecisionAuditoria evento = new ReporteResenaDecisionAuditoria();
        evento.setReporte(reporte);
        evento.setModerador(actor);
        evento.setEstadoAnterior(actual.name());
        evento.setEstadoNuevo(nuevoEstado.name());
        evento.setObservacion(observacion != null && !observacion.isBlank() ? observacion.trim() : null);
        evento.setFechaEvento(ahora);
        decisionAuditoriaRepository.saveAndFlush(evento);

        if (iniciarRevision) {
            reporte.setResponsable(actor);
            reporte.setFechaInicioRevision(ahora);
            reporte.setFechaRevision(null);
            reporte.setNotasRevision(null);
            reporte.setIdHistorialReasignacion(null);
        } else if (resolverReporte) {
            reporte.setFechaRevision(ahora);
            reporte.setNotasRevision(observacion.trim());
        }

        reporte.setEstado(nuevoEstado);
        reporte.setFechaActualizacion(ahora);
        ReporteResena guardado = reporteResenaRepository.saveAndFlush(reporte);

        if (nuevoEstado == EstadoReporte.RECHAZADO || nuevoEstado == EstadoReporte.ACEPTADO) {
            recalcularOcultamientoPorReportes(reporte.getResena());
        }

        return toResponse(guardado);
    }

    @Transactional(readOnly = true)
    public List<ReporteResenaDecisionAuditoriaResponse> listarHistorialModeracion(Long idReporte, Jwt jwt) {
        Usuario actor = usuarioService.obtenerUsuarioDesdeJwt(jwt);
        validarPermisoModeracion(actor);

        if (!reporteResenaRepository.existsById(idReporte)) {
            throw new ResourceNotFoundException("Reporte no encontrado con id " + idReporte);
        }

        return decisionAuditoriaRepository.findByReporteIdReporteOrderByFechaEventoDescIdAuditoriaDesc(idReporte)
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

    /**
     * S2-42: Lista las reseñas reportadas con sus métricas y detalle de reportes asociados.
     */
    @Transactional(readOnly = true)
    public List<ResenaReportadaResponse> listarResenasReportadas(
            EstadoReporte estadoFiltro,
            Boolean ocultaFiltro,
            Long idProductoFiltro,
            Jwt jwt) {

        Usuario usuario = usuarioService.obtenerUsuarioDesdeJwt(jwt);
        validarPermisoModeracion(usuario);

        List<ReporteResena> todos = reporteResenaRepository.findAllConDetalles();

        Map<Long, List<ReporteResena>> porResena = todos.stream()
                .collect(Collectors.groupingBy(
                        r -> r.getResena().getIdResena(),
                        LinkedHashMap::new,
                        Collectors.toList()
                ));

        List<ResenaReportadaResponse> resultado = new ArrayList<>();

        for (Map.Entry<Long, List<ReporteResena>> entry : porResena.entrySet()) {
            List<ReporteResena> grupoReportes = entry.getValue();
            Resena resena = grupoReportes.get(0).getResena();

            if (idProductoFiltro != null) {
                if (resena.getProducto() == null
                        || !idProductoFiltro.equals(resena.getProducto().getIdProducto())) {
                    continue;
                }
            }

            if (ocultaFiltro != null) {
                boolean esOculta = Boolean.TRUE.equals(resena.getOcultaPorReportes());
                if (ocultaFiltro != esOculta) {
                    continue;
                }
            }

            if (estadoFiltro != null && grupoReportes.stream().noneMatch(r -> r.getEstado() == estadoFiltro)) {
                continue;
            }

            long totalReportes = grupoReportes.size();
            long reportesPendientes = grupoReportes.stream()
                    .filter(r -> EstadoReporte.PENDIENTE.equals(r.getEstado()))
                    .count();

            List<ReporteResenaItemResponse> itemsReporte = grupoReportes.stream()
                    .map(r -> new ReporteResenaItemResponse(
                            r.getIdReporte(),
                            r.getUsuario() != null ? r.getUsuario().getIdUsuario() : null,
                            r.getUsuario() != null ? r.getUsuario().getNombre() : "Usuario anónimo",
                            r.getMotivo(),
                            r.getDescripcion(),
                            r.getEstado(),
                            r.getFechaCreacion()
                    ))
                    .toList();

            resultado.add(new ResenaReportadaResponse(
                    resena.getIdResena(),
                    resena.getProducto() != null ? resena.getProducto().getIdProducto() : null,
                    resena.getProducto() != null ? resena.getProducto().getNombre() : null,
                    resena.getUsuario() != null ? resena.getUsuario().getIdUsuario() : null,
                    resena.getUsuario() != null ? resena.getUsuario().getNombre() : null,
                    resena.getComentario(),
                    resena.getPuntuacion(),
                    resena.getFechaCreacion(),
                    resena.getEstado(),
                    resena.getOcultaPorReportes(),
                    resena.getOcultaPorModeracion(),
                    totalReportes,
                    reportesPendientes,
                    itemsReporte
            ));
        }

        resultado.sort((a, b) -> {
            int compPendientes = Long.compare(b.reportesPendientes(), a.reportesPendientes());
            if (compPendientes != 0) {
                return compPendientes;
            }
            int compTotal = Long.compare(b.totalReportes(), a.totalReportes());
            if (compTotal != 0) {
                return compTotal;
            }
            return Long.compare(
                    b.idResena() != null ? b.idResena() : 0L,
                    a.idResena() != null ? a.idResena() : 0L
            );
        });

        return resultado;
    }

    /**
     * S2-42: Consulta plana de la cola de reportes de moderación.
     */
    @Transactional(readOnly = true)
    public List<ReporteResenaResponse> listarReportesModeracion(EstadoReporte estadoFiltro, Jwt jwt) {
        Usuario usuario = usuarioService.obtenerUsuarioDesdeJwt(jwt);
        validarPermisoModeracion(usuario);

        EstadoReporte estado = estadoFiltro != null ? estadoFiltro : EstadoReporte.PENDIENTE;
        List<ReporteResena> reportes = reporteResenaRepository.findByEstadoConDetalles(estado);

        return reportes.stream()
                .map(this::toResponse)
                .toList();
    }

    // =========================================================================
    // S2-43: Acciones operativas de moderación sobre reseñas y reportes
    // =========================================================================

    /**
     * S2-43: Oculta manualmente una reseña por incumplimiento de normas.
     * Modifica ocultaPorModeracion = true sin alterar ocultaPorReportes.
     * Persiste evento en resena_moderacion_auditoria en la misma transacción (saveAndFlush).
     */
    @Transactional
    public ResenaReportadaResponse ocultarResena(Long idResena, AccionModeracionRequest request, Jwt jwt) {
        if (idResena == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El ID de la reseña es obligatorio.");
        }

        Usuario actor = usuarioService.obtenerUsuarioDesdeJwt(jwt);
        validarUsuarioActivo(actor);
        validarPermisoModeracion(actor);

        Resena resena = resenaRepository.findById(idResena)
                .orElseThrow(() -> new ResourceNotFoundException("Reseña no encontrada con id " + idResena));

        if (resena.getUsuario().getIdUsuario().equals(actor.getIdUsuario())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No puedes moderar tu propia reseña.");
        }

        if (!Boolean.TRUE.equals(resena.getEstado())) {
            throw new ConflictException("No se puede ocultar una reseña eliminada por su autor.");
        }

        if (Boolean.TRUE.equals(resena.getOcultaPorModeracion())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "La reseña ya está oculta por moderación.");
        }

        String motivo = (request != null && request.motivo() != null && !request.motivo().isBlank())
                ? request.motivo().trim()
                : "Ocultamiento por incumplimiento de normas";
        if (motivo.length() > 2000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La justificación no puede superar 2000 caracteres.");
        }

        LocalDateTime ahora = LocalDateTime.now();

        // Registrar auditoría con saveAndFlush antes de modificar la reseña
        if (moderacionAuditoriaRepository != null) {
            ResenaModeracionAuditoria evento = new ResenaModeracionAuditoria();
            evento.setResena(resena);
            evento.setModerador(actor);
            evento.setAccion("OCULTAR");
            evento.setMotivo(motivo);
            evento.setFechaEvento(ahora);
            moderacionAuditoriaRepository.saveAndFlush(evento);
        }

        resena.setOcultaPorModeracion(true);
        resena.setModeradaPor(actor);
        resena.setFechaModeracion(ahora);
        resena.setMotivoModeracion(motivo);
        resena = resenaRepository.saveAndFlush(resena);

        List<ReporteResena> reportes = reporteResenaRepository.findByResenaIdResenaOrderByFechaCreacionDesc(idResena);
        return toResenaReportadaResponse(resena, reportes);
    }

    /**
     * S2-43: Publica / restaura una reseña previamente ocultada manualmente por moderación.
     * Restablece ocultaPorModeracion = false sin alterar ocultaPorReportes.
     * Persiste evento en resena_moderacion_auditoria en la misma transacción (saveAndFlush).
     */
    @Transactional
    public ResenaReportadaResponse publicarResena(Long idResena, AccionModeracionRequest request, Jwt jwt) {
        if (idResena == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El ID de la reseña es obligatorio.");
        }

        Usuario actor = usuarioService.obtenerUsuarioDesdeJwt(jwt);
        validarUsuarioActivo(actor);
        validarPermisoModeracion(actor);

        Resena resena = resenaRepository.findById(idResena)
                .orElseThrow(() -> new ResourceNotFoundException("Reseña no encontrada con id " + idResena));

        if (resena.getUsuario().getIdUsuario().equals(actor.getIdUsuario())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No puedes moderar tu propia reseña.");
        }

        if (!Boolean.TRUE.equals(resena.getEstado())) {
            throw new ConflictException("No se puede publicar una reseña eliminada por su autor.");
        }

        if (!Boolean.TRUE.equals(resena.getOcultaPorModeracion())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "La reseña no está oculta manualmente.");
        }

        String motivo = (request != null && request.motivo() != null && !request.motivo().isBlank())
                ? request.motivo().trim()
                : "Restauración de visibilidad de la reseña";
        if (motivo.length() > 2000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La justificación no puede superar 2000 caracteres.");
        }

        LocalDateTime ahora = LocalDateTime.now();

        // Registrar auditoría con saveAndFlush antes de modificar la reseña
        if (moderacionAuditoriaRepository != null) {
            ResenaModeracionAuditoria evento = new ResenaModeracionAuditoria();
            evento.setResena(resena);
            evento.setModerador(actor);
            evento.setAccion("RESTAURAR");
            evento.setMotivo(motivo);
            evento.setFechaEvento(ahora);
            moderacionAuditoriaRepository.saveAndFlush(evento);
        }

        resena.setOcultaPorModeracion(false);
        resena.setModeradaPor(null);
        resena.setFechaModeracion(null);
        resena.setMotivoModeracion(null);
        resena = resenaRepository.saveAndFlush(resena);

        List<ReporteResena> reportes = reporteResenaRepository.findByResenaIdResenaOrderByFechaCreacionDesc(idResena);
        return toResenaReportadaResponse(resena, reportes);
    }

    /**
     * S2-43: Rechaza un reporte individual específico en estado EN_REVISION.
     * Recalcula automáticamente el umbral de reportes activos y visibilidad de la reseña.
     */
    @Transactional
    public ReporteResenaResponse rechazarReporteIndividual(Long idReporte, AccionModeracionRequest request, Jwt jwt) {
        String motivo = (request != null && request.motivo() != null && !request.motivo().isBlank())
                ? request.motivo().trim()
                : "Reporte desestimado tras revisión por moderación";

        return actualizarEstadoModeracion(idReporte, EstadoReporte.RECHAZADO, motivo, jwt);
    }

    /**
     * S2-43: Rechaza en lote los reportes en revisión asociados a una reseña.
     * En cumplimiento de la máquina de estados, no se permite rechazar reportes en estado PENDIENTE.
     * Si los reportes no rechazados bajan de 3, restablece ocultaPorReportes = false.
     */
    @Transactional
    public ResenaReportadaResponse rechazarReportesDeResena(Long idResena, AccionModeracionRequest request, Jwt jwt) {
        if (idResena == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El ID de la reseña es obligatorio.");
        }

        Usuario actor = usuarioService.obtenerUsuarioDesdeJwt(jwt);
        validarUsuarioActivo(actor);
        validarPermisoModeracion(actor);

        Resena resena = resenaRepository.findById(idResena)
                .orElseThrow(() -> new ResourceNotFoundException("Reseña no encontrada con id " + idResena));

        if (resena.getUsuario().getIdUsuario().equals(actor.getIdUsuario())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No puedes moderar tu propia reseña.");
        }

        List<ReporteResena> reportes = reporteResenaRepository.findByResenaIdResenaOrderByFechaCreacionDesc(idResena);

        boolean hayPendientes = reportes.stream()
                .anyMatch(r -> EstadoReporte.PENDIENTE.equals(r.getEstado()));
        if (hayPendientes) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Transición no permitida: existen reportes en estado PENDIENTE que deben iniciar revisión antes de ser resueltos.");
        }

        String motivo = (request != null && request.motivo() != null && !request.motivo().isBlank())
                ? request.motivo().trim()
                : "Reportes desestimados tras revisión de moderación";

        LocalDateTime ahora = LocalDateTime.now();
        for (ReporteResena rep : reportes) {
            if (EstadoReporte.EN_REVISION.equals(rep.getEstado())) {
                boolean esReportante = rep.getUsuario().getIdUsuario().equals(actor.getIdUsuario());
                if (esReportante) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                            "No puedes moderar un reporte propio.");
                }
                boolean esResponsable = rep.getResponsable() != null
                        && rep.getResponsable().getIdUsuario().equals(actor.getIdUsuario());
                if (!esResponsable && !esAdministradorActivo(actor)) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                            "Solo el responsable asignado o un Administrador puede resolver estos reportes.");
                }

                ReporteResenaDecisionAuditoria evento = new ReporteResenaDecisionAuditoria();
                evento.setReporte(rep);
                evento.setModerador(actor);
                evento.setEstadoAnterior(EstadoReporte.EN_REVISION.name());
                evento.setEstadoNuevo(EstadoReporte.RECHAZADO.name());
                evento.setObservacion(motivo);
                evento.setFechaEvento(ahora);
                decisionAuditoriaRepository.saveAndFlush(evento);

                rep.setEstado(EstadoReporte.RECHAZADO);
                rep.setFechaRevision(ahora);
                rep.setNotasRevision(motivo);
                rep.setFechaActualizacion(ahora);
                reporteResenaRepository.saveAndFlush(rep);
            }
        }

        recalcularOcultamientoPorReportes(resena);
        return toResenaReportadaResponse(resena, reportes);
    }

    private void recalcularOcultamientoPorReportes(Resena resena) {
        if (resena == null || resena.getIdResena() == null) {
            return;
        }
        long reportesActivos = reporteResenaRepository.countByResenaIdResenaAndEstadoNot(
                resena.getIdResena(), EstadoReporte.RECHAZADO);
        boolean debeOcultar = reportesActivos >= 3;
        if (!Boolean.valueOf(debeOcultar).equals(resena.getOcultaPorReportes())) {
            resena.setOcultaPorReportes(debeOcultar);
            resenaRepository.saveAndFlush(resena);
        }
    }

    private ResenaReportadaResponse toResenaReportadaResponse(Resena resena, List<ReporteResena> reportes) {
        long totalReportes = reportes != null ? reportes.size() : 0;
        long reportesPendientes = reportes != null
                ? reportes.stream().filter(r -> EstadoReporte.PENDIENTE.equals(r.getEstado())).count()
                : 0;

        List<ReporteResenaItemResponse> itemsReporte = reportes != null
                ? reportes.stream()
                        .map(r -> new ReporteResenaItemResponse(
                                r.getIdReporte(),
                                r.getUsuario() != null ? r.getUsuario().getIdUsuario() : null,
                                r.getUsuario() != null ? r.getUsuario().getNombre() : "Usuario anónimo",
                                r.getMotivo(),
                                r.getDescripcion(),
                                r.getEstado(),
                                r.getFechaCreacion()
                        ))
                        .toList()
                : Collections.emptyList();

        return new ResenaReportadaResponse(
                resena.getIdResena(),
                resena.getProducto() != null ? resena.getProducto().getIdProducto() : null,
                resena.getProducto() != null ? resena.getProducto().getNombre() : null,
                resena.getUsuario() != null ? resena.getUsuario().getIdUsuario() : null,
                resena.getUsuario() != null ? resena.getUsuario().getNombre() : null,
                resena.getComentario(),
                resena.getPuntuacion(),
                resena.getFechaCreacion(),
                resena.getEstado(),
                resena.getOcultaPorReportes(),
                resena.getOcultaPorModeracion(),
                totalReportes,
                reportesPendientes,
                itemsReporte
        );
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
