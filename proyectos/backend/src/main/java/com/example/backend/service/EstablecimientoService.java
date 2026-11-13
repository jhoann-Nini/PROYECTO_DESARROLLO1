package com.example.backend.service;

import com.example.backend.dto.EstablecimientoResponse;
import com.example.backend.dto.EstablecimientoUpdateRequest;
import com.example.backend.entity.Establecimiento;
import com.example.backend.entity.Rol;
import com.example.backend.entity.Usuario;
import com.example.backend.entity.UsuarioEstablecimiento;
import com.example.backend.entity.UsuarioRol;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.repository.EstablecimientoRepository;
import com.example.backend.repository.UsuarioEstablecimientoRepository;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Gestión de los datos básicos de establecimientos desde la cuenta representante.
 * El acceso se limita a asignaciones activas; el administrador conserva alcance global.
 */
@Service
public class EstablecimientoService {

    private static final String ROL_REPRESENTANTE = "Representante de establecimiento";
    private static final String ROL_ADMINISTRADOR = "Administrador";

    private final UsuarioService usuarioService;
    private final EstablecimientoRepository establecimientoRepository;
    private final UsuarioEstablecimientoRepository usuarioEstablecimientoRepository;

    public EstablecimientoService(
            UsuarioService usuarioService,
            EstablecimientoRepository establecimientoRepository,
            UsuarioEstablecimientoRepository usuarioEstablecimientoRepository) {
        this.usuarioService = usuarioService;
        this.establecimientoRepository = establecimientoRepository;
        this.usuarioEstablecimientoRepository = usuarioEstablecimientoRepository;
    }

    @Transactional(readOnly = true)
    public List<EstablecimientoResponse> listarAsignados(Jwt jwt) {
        Usuario usuario = obtenerUsuarioActivo(jwt);
        validarRolRepresentanteOAdministrador(usuario);

        if (tieneRolActivo(usuario, ROL_ADMINISTRADOR)) {
            return establecimientoRepository.findByEstadoTrueOrderByNombreAsc()
                    .stream()
                    .map(this::toResponse)
                    .toList();
        }

        return usuarioEstablecimientoRepository
                .findAsignacionesActivasConEstablecimiento(usuario.getIdUsuario())
                .stream()
                .map(UsuarioEstablecimiento::getEstablecimiento)
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public EstablecimientoResponse obtenerAsignado(Long idEstablecimiento, Jwt jwt) {
        Usuario usuario = obtenerUsuarioActivo(jwt);
        validarRolRepresentanteOAdministrador(usuario);
        return toResponse(buscarEstablecimientoPermitido(usuario, idEstablecimiento));
    }

    @Transactional
    public EstablecimientoResponse actualizarAsignado(
            Long idEstablecimiento,
            EstablecimientoUpdateRequest request,
            Jwt jwt) {
        Usuario usuario = obtenerUsuarioActivo(jwt);
        validarRolRepresentanteOAdministrador(usuario);

        Establecimiento establecimiento = buscarEstablecimientoPermitido(usuario, idEstablecimiento);
        establecimiento.setNombre(request.nombre().trim());
        establecimiento.setDireccion(request.direccion());
        establecimiento.setTelefono(request.telefono());
        establecimiento.setCorreo(request.correo());
        establecimiento.setDescripcion(request.descripcion());
        establecimiento.setLatitud(request.latitud());
        establecimiento.setLongitud(request.longitud());

        return toResponse(establecimientoRepository.save(establecimiento));
    }

    private Usuario obtenerUsuarioActivo(Jwt jwt) {
        Usuario usuario = usuarioService.obtenerUsuarioDesdeJwt(jwt);
        if (!Boolean.TRUE.equals(usuario.getEstado())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "La cuenta está suspendida o inactiva.");
        }
        return usuario;
    }

    private void validarRolRepresentanteOAdministrador(Usuario usuario) {
        if (!tieneRolActivo(usuario, ROL_REPRESENTANTE)
                && !tieneRolActivo(usuario, ROL_ADMINISTRADOR)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "La cuenta no tiene permisos para gestionar establecimientos.");
        }
    }

    private boolean tieneRolActivo(Usuario usuario, String nombreRol) {
        return usuario.getRoles() != null && usuario.getRoles().stream()
                .filter(asignacion -> Boolean.TRUE.equals(asignacion.getEstado()))
                .map(UsuarioRol::getRol)
                .map(Rol::getNombre)
                .anyMatch(nombre -> nombre != null && nombreRol.equalsIgnoreCase(nombre));
    }

    private Establecimiento buscarEstablecimientoPermitido(Usuario usuario, Long idEstablecimiento) {
        if (tieneRolActivo(usuario, ROL_ADMINISTRADOR)) {
            return establecimientoRepository.findById(idEstablecimiento)
                    .filter(establecimiento -> Boolean.TRUE.equals(establecimiento.getEstado()))
                    .orElseThrow(() -> new ResourceNotFoundException("Establecimiento no encontrado."));
        }

        return usuarioEstablecimientoRepository
                .findAsignacionActivaConEstablecimiento(usuario.getIdUsuario(), idEstablecimiento)
                .map(UsuarioEstablecimiento::getEstablecimiento)
                .filter(establecimiento -> Boolean.TRUE.equals(establecimiento.getEstado()))
                .orElseThrow(() -> new ResourceNotFoundException("Establecimiento no encontrado."));
    }

    private EstablecimientoResponse toResponse(Establecimiento establecimiento) {
        return new EstablecimientoResponse(
                establecimiento.getIdEstablecimiento(),
                establecimiento.getNombre(),
                establecimiento.getDireccion(),
                establecimiento.getTelefono(),
                establecimiento.getCorreo(),
                establecimiento.getDescripcion(),
                establecimiento.getLatitud(),
                establecimiento.getLongitud(),
                establecimiento.getEstado()
        );
    }
}
