package com.example.backend.service;

import com.example.backend.dto.ReporteResenaRequest;
import com.example.backend.dto.ReporteResenaResponse;
import com.example.backend.entity.EstadoReporte;
import com.example.backend.entity.ReporteResena;
import com.example.backend.entity.Resena;
import com.example.backend.entity.Usuario;
import com.example.backend.exception.ConflictException;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.repository.ReporteResenaRepository;
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

