package com.example.backend.service;

import com.example.backend.dto.AccionModeracionRequest;
import com.example.backend.dto.ResenaEnRevisionResponse;
import com.example.backend.entity.EstadoModeracion;
import com.example.backend.entity.Resena;
import com.example.backend.entity.ResenaModeracionAuditoria;
import com.example.backend.entity.Usuario;
import com.example.backend.exception.ConflictException;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.repository.ResenaModeracionAuditoriaRepository;
import com.example.backend.repository.ResenaRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Revisión humana de las reseñas retenidas por el filtro automático
 * (estado_moderacion = PENDIENTE).
 * <p>
 * Cada decisión registra primero un evento APROBAR o RECHAZAR en
 * resena_moderacion_auditoria y después cambia el estado, en la misma
 * transacción. La migración 020 exige esa correspondencia en PostgreSQL.
 */
@Service
public class RevisionResenasService {

    static final String MOTIVO_APROBACION_POR_DEFECTO =
            "Contenido revisado y aprobado por moderación";

    private final ResenaRepository resenaRepository;
    private final ResenaModeracionAuditoriaRepository moderacionAuditoriaRepository;
    private final ResenaModerationService resenaModerationService;
    private final UsuarioService usuarioService;

    public RevisionResenasService(
            ResenaRepository resenaRepository,
            ResenaModeracionAuditoriaRepository moderacionAuditoriaRepository,
            ResenaModerationService resenaModerationService,
            UsuarioService usuarioService) {
        this.resenaRepository = resenaRepository;
        this.moderacionAuditoriaRepository = moderacionAuditoriaRepository;
        this.resenaModerationService = resenaModerationService;
        this.usuarioService = usuarioService;
    }

    @Transactional(readOnly = true)
    public List<ResenaEnRevisionResponse> listarPendientes(Jwt jwt) {
        Usuario actor = usuarioService.obtenerUsuarioDesdeJwt(jwt);
        validarPermisoModeracion(actor);
        // Caso 6: primero las de riesgo alto; dentro de cada nivel, el orden del repositorio.
        return resenaRepository.findPendientesDeRevision().stream()
                .map(this::toResponse)
                .sorted(java.util.Comparator.comparing(
                        (ResenaEnRevisionResponse r) -> !"ALTO".equals(r.riesgo())))
                .toList();
    }

    /**
     * Publica una reseña retenida. La justificación es opcional.
     */
    @Transactional
    public ResenaEnRevisionResponse aprobar(Long idResena, AccionModeracionRequest request, Jwt jwt) {
        String motivo = motivoOpcional(request, MOTIVO_APROBACION_POR_DEFECTO);
        return decidir(idResena, "APROBAR", EstadoModeracion.PUBLICADA, motivo, jwt);
    }

    /**
     * Rechaza una reseña retenida. La justificación es obligatoria porque
     * el contenido no se publicará.
     */
    @Transactional
    public ResenaEnRevisionResponse rechazar(Long idResena, AccionModeracionRequest request, Jwt jwt) {
        String motivo = request != null && request.motivo() != null ? request.motivo().trim() : "";
        if (motivo.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La justificación es obligatoria para rechazar una reseña.");
        }
        validarLongitud(motivo);
        return decidir(idResena, "RECHAZAR", EstadoModeracion.RECHAZADA, motivo, jwt);
    }

    private ResenaEnRevisionResponse decidir(
            Long idResena, String accion, EstadoModeracion estadoFinal, String motivo, Jwt jwt) {
        if (idResena == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El ID de la reseña es obligatorio.");
        }

        Usuario actor = usuarioService.obtenerUsuarioDesdeJwt(jwt);
        validarPermisoModeracion(actor);

        Resena resena = resenaRepository.findByIdForModeration(idResena)
                .orElseThrow(() -> new ResourceNotFoundException("Reseña no encontrada con id " + idResena));

        if (resena.getUsuario().getIdUsuario().equals(actor.getIdUsuario())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No puedes moderar tu propia reseña.");
        }
        if (!Boolean.TRUE.equals(resena.getEstado())) {
            throw new ConflictException("La reseña fue eliminada por su autor.");
        }
        if (resena.getEstadoModeracion() != EstadoModeracion.PENDIENTE) {
            throw new ConflictException("La reseña no está pendiente de revisión.");
        }

        // Auditoría primero, mientras la reseña conserva el estado PENDIENTE.
        ResenaModeracionAuditoria evento = new ResenaModeracionAuditoria();
        evento.setComentarioRevisado(resena.getComentario());
        evento.setResena(resena);
        evento.setModerador(actor);
        evento.setAccion(accion);
        evento.setMotivo(motivo);
        evento.setFechaEvento(LocalDateTime.now());
        moderacionAuditoriaRepository.saveAndFlush(evento);

        resena.setEstadoModeracion(estadoFinal);
        Resena guardada = resenaRepository.saveAndFlush(resena);
        return toResponse(guardada);
    }

    private ResenaEnRevisionResponse toResponse(Resena resena) {
        ResenaModerationService.ResultadoModeracion analisis =
                resenaModerationService.analizar(resena.getComentario());
        return new ResenaEnRevisionResponse(
                resena.getIdResena(),
                resena.getProducto() != null ? resena.getProducto().getIdProducto() : null,
                resena.getProducto() != null ? resena.getProducto().getNombre() : null,
                resena.getUsuario() != null ? resena.getUsuario().getIdUsuario() : null,
                resena.getUsuario() != null ? resena.getUsuario().getNombre() : null,
                resena.getComentario(),
                resena.getPuntuacion(),
                resena.getFechaCreacion(),
                resena.getEstadoModeracion(),
                resena.getOcultaPorModeracion(),
                resena.getOcultaPorReportes(),
                analisis.motivos(),
                analisis.riesgo().name());
    }

    private static String motivoOpcional(AccionModeracionRequest request, String porDefecto) {
        String motivo = request != null && request.motivo() != null && !request.motivo().isBlank()
                ? request.motivo().trim()
                : porDefecto;
        validarLongitud(motivo);
        return motivo;
    }

    private static void validarLongitud(String motivo) {
        if (motivo.length() > 2000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La justificación no puede superar 2000 caracteres.");
        }
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
