package com.example.backend.service;

import com.example.backend.dto.ResumenPendientesModeracionResponse;
import com.example.backend.entity.EstadoReporte;
import com.example.backend.entity.Usuario;
import com.example.backend.entity.EstadoApelacion;
import com.example.backend.repository.ApelacionRepository;
import com.example.backend.repository.ReporteOfertaRepository;
import com.example.backend.repository.ReporteResenaRepository;
import com.example.backend.repository.ResenaRepository;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Contador de pendientes del panel de moderación (Caso 6). Solo cuenta:
 * no expone contenido, autores ni reportantes.
 */
@Service
public class ModeracionResumenService {

    static final List<EstadoReporte> ESTADOS_ABIERTOS =
            List.of(EstadoReporte.PENDIENTE, EstadoReporte.EN_REVISION);

    private final ResenaRepository resenaRepository;
    private final ReporteResenaRepository reporteResenaRepository;
    private final ReporteOfertaRepository reporteOfertaRepository;
    private final UsuarioService usuarioService;
    private final ApelacionRepository apelacionRepository;
    private final ModeracionComunidadService moderacionComunidadService;
    private final ApelacionComunidadService apelacionComunidadService;

    public ModeracionResumenService(
            ResenaRepository resenaRepository,
            ReporteResenaRepository reporteResenaRepository,
            ReporteOfertaRepository reporteOfertaRepository,
            UsuarioService usuarioService,
            ApelacionRepository apelacionRepository,
            ModeracionComunidadService moderacionComunidadService,
            ApelacionComunidadService apelacionComunidadService) {
        this.moderacionComunidadService = moderacionComunidadService;
        this.apelacionComunidadService = apelacionComunidadService;
        this.apelacionRepository = apelacionRepository;
        this.resenaRepository = resenaRepository;
        this.reporteResenaRepository = reporteResenaRepository;
        this.reporteOfertaRepository = reporteOfertaRepository;
        this.usuarioService = usuarioService;
    }

    @Transactional(readOnly = true)
    public ResumenPendientesModeracionResponse obtenerResumen(Jwt jwt) {
        validarPermisoModeracion(usuarioService.obtenerUsuarioDesdeJwt(jwt));

        long revision = resenaRepository.countPendientesDeRevision();
        long reportesResenas = reporteResenaRepository.countByEstadoIn(ESTADOS_ABIERTOS);
        long reportesOfertas = reporteOfertaRepository.countByEstadoIn(ESTADOS_ABIERTOS);
        long apelaciones = apelacionRepository.countByEstado(EstadoApelacion.PENDIENTE);
        long comunidadRevision = moderacionComunidadService.contarEnRevision();
        long comunidadReportes = moderacionComunidadService.contarReportesAbiertos();
        long comunidadApelaciones = apelacionComunidadService.contarPendientes();
        return new ResumenPendientesModeracionResponse(revision, reportesResenas, reportesOfertas, apelaciones,
                comunidadRevision, comunidadReportes, comunidadApelaciones,
                revision + reportesResenas + reportesOfertas + apelaciones + comunidadRevision + comunidadReportes
                        + comunidadApelaciones);
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
