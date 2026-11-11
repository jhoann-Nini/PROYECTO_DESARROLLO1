package com.example.backend.service;

import com.example.backend.dto.AccionModeracionRequest;
import com.example.backend.dto.ReporteResenaItemResponse;
import com.example.backend.dto.ReporteResenaRequest;
import com.example.backend.dto.ReporteResenaResponse;
import com.example.backend.dto.ResenaReportadaResponse;
import com.example.backend.entity.EstadoReporte;
import com.example.backend.entity.ReporteResena;
import com.example.backend.entity.Resena;
import com.example.backend.entity.Usuario;
import com.example.backend.exception.ConflictException;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.repository.ReporteResenaRepository;
import com.example.backend.repository.ResenaRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Servicio de negocio para la gestión de reportes sobre reseñas y moderación de contenido.
 * Implementa las reglas de validación de negocio, integridad de autorreporte,
 * prevención de reportes duplicados y consulta de la cola de moderación (S2-42).
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

    public ReporteResenaService(
            ReporteResenaRepository reporteResenaRepository,
            ResenaRepository resenaRepository,
            UsuarioService usuarioService) {
        this.reporteResenaRepository = reporteResenaRepository;
        this.resenaRepository = resenaRepository;
        this.usuarioService = usuarioService;
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
     * S2-42: Lista las reseñas pendientes y reportadas para el módulo de moderación.
     * Solo accesible para Moderadores y Administradores activos.
     *
     * @param estadoFiltro      Filtro opcional por estado de reporte (ej. PENDIENTE, EN_REVISION).
     * @param ocultaFiltro      Filtro opcional por indicador de ocultamiento por reportes.
     * @param idProductoFiltro  Filtro opcional por id de producto.
     * @param jwt               Token de autenticación del operador.
     * @return Lista agrupada de reseñas reportadas con el detalle y conteo de reportes.
     */
    @Transactional(readOnly = true)
    public List<ResenaReportadaResponse> listarResenasReportadas(
            EstadoReporte estadoFiltro,
            Boolean ocultaFiltro,
            Long idProductoFiltro,
            Jwt jwt) {
        Usuario usuario = usuarioService.obtenerUsuarioDesdeJwt(jwt);
        validarUsuarioActivo(usuario);
        validarPermisosModeracion(usuario);

        List<ReporteResena> todosLosReportes = reporteResenaRepository.findAllConDetalles();

        // Agrupar por id_resena manteniendo orden cronológico
        Map<Long, List<ReporteResena>> reportesPorResena = todosLosReportes.stream()
                .collect(Collectors.groupingBy(
                        r -> r.getResena().getIdResena(),
                        LinkedHashMap::new,
                        Collectors.toList()
                ));

        List<ResenaReportadaResponse> resultado = new ArrayList<>();

        for (Map.Entry<Long, List<ReporteResena>> entry : reportesPorResena.entrySet()) {
            List<ReporteResena> listaReportes = entry.getValue();
            if (listaReportes.isEmpty()) {
                continue;
            }

            Resena resena = listaReportes.get(0).getResena();

            // Filtrado por idProducto si fue solicitado
            if (idProductoFiltro != null && (resena.getProducto() == null || !idProductoFiltro.equals(resena.getProducto().getIdProducto()))) {
                continue;
            }

            // Filtrado por ocultaPorReportes si fue solicitado
            if (ocultaFiltro != null && !Boolean.valueOf(ocultaFiltro).equals(resena.getOcultaPorReportes())) {
                continue;
            }

            // Filtrado por estado del reporte si fue solicitado (la reseña debe contener al menos un reporte con ese estado)
            if (estadoFiltro != null && listaReportes.stream().noneMatch(r -> r.getEstado() == estadoFiltro)) {
                continue;
            }

            resultado.add(toResenaReportadaResponse(resena, listaReportes));
        }

        // Ordenar con prioridad: reseñas con más reportes pendientes primero
        resultado.sort((a, b) -> {
            int compPendientes = Long.compare(b.reportesPendientes(), a.reportesPendientes());
            if (compPendientes != 0) {
                return compPendientes;
            }
            return Long.compare(b.totalReportes(), a.totalReportes());
        });

        return resultado;
    }

    /**
     * S2-43: Oculta una reseña reportada marcándola con ocultaPorReportes = true.
     * Marca los reportes pendientes/en revisión como ACEPTADO.
     * Acción reservada exclusivamente para Administradores.
     */
    @Transactional
    public ResenaReportadaResponse ocultarResena(Long idResena, AccionModeracionRequest request, Jwt jwt) {
        if (idResena == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El ID de la reseña es obligatorio.");
        }

        Usuario usuario = usuarioService.obtenerUsuarioDesdeJwt(jwt);
        validarUsuarioActivo(usuario);
        validarPermisosAdministrador(usuario);

        Resena resena = resenaRepository.findByIdConDetalles(idResena)
                .orElseThrow(() -> new ResourceNotFoundException("Reseña no encontrada con id " + idResena));

        if (!Boolean.TRUE.equals(resena.getEstado())) {
            throw new ConflictException("No se puede ocultar una reseña eliminada por su autor.");
        }

        resena.setOcultaPorReportes(true);
        resena = resenaRepository.save(resena);

        List<ReporteResena> reportes = reporteResenaRepository.findByResenaIdResenaOrderByFechaCreacionDesc(idResena);
        LocalDateTime ahora = LocalDateTime.now();
        for (ReporteResena rep : reportes) {
            if (rep.getEstado() == EstadoReporte.PENDIENTE || rep.getEstado() == EstadoReporte.EN_REVISION) {
                rep.setEstado(EstadoReporte.ACEPTADO);
                rep.setFechaActualizacion(ahora);
            }
        }
        reporteResenaRepository.saveAll(reportes);

        return toResenaReportadaResponse(resena, reportes);
    }

    /**
     * S2-43: Restaura la visibilidad de una reseña reportada marcándola con ocultaPorReportes = false.
     * Marca los reportes pendientes/en revisión como RECHAZADO.
     * Si la reseña fue eliminada lógicamente por su autor (estado = false), rechaza la publicación (409 Conflict).
     * Acción reservada exclusivamente para Administradores.
     */
    @Transactional
    public ResenaReportadaResponse publicarResena(Long idResena, AccionModeracionRequest request, Jwt jwt) {
        if (idResena == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El ID de la reseña es obligatorio.");
        }

        Usuario usuario = usuarioService.obtenerUsuarioDesdeJwt(jwt);
        validarUsuarioActivo(usuario);
        validarPermisosAdministrador(usuario);

        Resena resena = resenaRepository.findByIdConDetalles(idResena)
                .orElseThrow(() -> new ResourceNotFoundException("Reseña no encontrada con id " + idResena));

        if (!Boolean.TRUE.equals(resena.getEstado())) {
            throw new ConflictException("No se puede publicar una reseña eliminada por su autor.");
        }

        resena.setOcultaPorReportes(false);
        resena = resenaRepository.save(resena);

        List<ReporteResena> reportes = reporteResenaRepository.findByResenaIdResenaOrderByFechaCreacionDesc(idResena);
        LocalDateTime ahora = LocalDateTime.now();
        for (ReporteResena rep : reportes) {
            if (rep.getEstado() == EstadoReporte.PENDIENTE || rep.getEstado() == EstadoReporte.EN_REVISION) {
                rep.setEstado(EstadoReporte.RECHAZADO);
                rep.setFechaActualizacion(ahora);
            }
        }
        reporteResenaRepository.saveAll(reportes);

        return toResenaReportadaResponse(resena, reportes);
    }

    /**
     * S2-43: Rechaza todos los reportes pendientes/en revisión de una reseña.
     * Si los reportes no rechazados bajan de 3 y la reseña está activa, restablece automáticamente su visibilidad.
     * Acción reservada exclusivamente para Administradores.
     */
    @Transactional
    public ResenaReportadaResponse rechazarReportesDeResena(Long idResena, AccionModeracionRequest request, Jwt jwt) {
        if (idResena == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El ID de la reseña es obligatorio.");
        }

        Usuario usuario = usuarioService.obtenerUsuarioDesdeJwt(jwt);
        validarUsuarioActivo(usuario);
        validarPermisosAdministrador(usuario);

        Resena resena = resenaRepository.findByIdConDetalles(idResena)
                .orElseThrow(() -> new ResourceNotFoundException("Reseña no encontrada con id " + idResena));

        List<ReporteResena> reportes = reporteResenaRepository.findByResenaIdResenaOrderByFechaCreacionDesc(idResena);
        LocalDateTime ahora = LocalDateTime.now();
        for (ReporteResena rep : reportes) {
            if (rep.getEstado() == EstadoReporte.PENDIENTE || rep.getEstado() == EstadoReporte.EN_REVISION) {
                rep.setEstado(EstadoReporte.RECHAZADO);
                rep.setFechaActualizacion(ahora);
            }
        }
        reporteResenaRepository.saveAll(reportes);

        long reportesActivos = reportes.stream()
                .filter(r -> r.getEstado() != EstadoReporte.RECHAZADO)
                .count();

        if (reportesActivos < 3 && Boolean.TRUE.equals(resena.getEstado())) {
            resena.setOcultaPorReportes(false);
            resena = resenaRepository.save(resena);
        }

        return toResenaReportadaResponse(resena, reportes);
    }

    /**
     * S2-43: Rechaza un reporte individual de una reseña.
     * Si los reportes no rechazados de la reseña bajan de 3, restablece automáticamente su visibilidad.
     * Acción reservada exclusivamente para Administradores.
     */
    @Transactional
    public ReporteResenaResponse rechazarReporteIndividual(Long idReporte, AccionModeracionRequest request, Jwt jwt) {
        if (idReporte == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El ID del reporte es obligatorio.");
        }

        Usuario usuario = usuarioService.obtenerUsuarioDesdeJwt(jwt);
        validarUsuarioActivo(usuario);
        validarPermisosAdministrador(usuario);

        ReporteResena reporte = reporteResenaRepository.findByIdConDetalles(idReporte)
                .orElseThrow(() -> new ResourceNotFoundException("Reporte no encontrado con id " + idReporte));

        reporte.setEstado(EstadoReporte.RECHAZADO);
        reporte.setFechaActualizacion(LocalDateTime.now());
        reporteResenaRepository.save(reporte);

        Resena resena = reporte.getResena();
        if (resena != null) {
            long reportesActivos = reporteResenaRepository.countByResenaIdResenaAndEstadoNot(
                    resena.getIdResena(), EstadoReporte.RECHAZADO);
            if (reportesActivos < 3 && Boolean.TRUE.equals(resena.getEstado()) && Boolean.TRUE.equals(resena.getOcultaPorReportes())) {
                resena.setOcultaPorReportes(false);
                resenaRepository.save(resena);
            }
        }

        return toResponse(reporte);
    }

    /**
     * S2-42: Consulta plana de la cola de reportes de moderación.
     */
    @Transactional(readOnly = true)
    public List<ReporteResenaResponse> listarReportesModeracion(EstadoReporte estadoFiltro, Jwt jwt) {
        Usuario usuario = usuarioService.obtenerUsuarioDesdeJwt(jwt);
        validarUsuarioActivo(usuario);
        validarPermisosModeracion(usuario);

        List<ReporteResena> reportes;
        if (estadoFiltro != null) {
            reportes = reporteResenaRepository.findByEstadoConDetalles(estadoFiltro);
        } else {
            reportes = reporteResenaRepository.findAllConDetalles();
        }

        return reportes.stream()
                .map(this::toResponse)
                .toList();
    }

    private void validarPermisosModeracion(Usuario usuario) {
        if (!usuario.esModeradorOAdmin()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No tienes permisos de moderación.");
        }
    }

    private void validarPermisosAdministrador(Usuario usuario) {
        if (!usuario.tieneRol("Administrador")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acción reservada exclusivamente para administradores.");
        }
    }

    private ResenaReportadaResponse toResenaReportadaResponse(Resena resena, List<ReporteResena> listaReportes) {
        long totalReportes = listaReportes.size();
        long reportesPendientes = listaReportes.stream()
                .filter(r -> r.getEstado() == EstadoReporte.PENDIENTE || r.getEstado() == EstadoReporte.EN_REVISION)
                .count();

        List<ReporteResenaItemResponse> itemsReporte = listaReportes.stream()
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
                totalReportes,
                reportesPendientes,
                itemsReporte
        );
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
