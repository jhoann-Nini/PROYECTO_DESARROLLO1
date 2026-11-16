package com.example.backend.service;

import com.example.backend.dto.RolResponse;
import com.example.backend.dto.UsuarioAdminResponse;
import com.example.backend.entity.Rol;
import com.example.backend.entity.Usuario;
import com.example.backend.entity.UsuarioRol;
import com.example.backend.repository.RolRepository;
import com.example.backend.repository.UsuarioRepository;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Consultas de solo lectura para apoyar la administración de cuentas,
 * roles y asignaciones. La autorización se aplica en Spring Security.
 */
@Service
public class AdministracionConsultasService {

    private static final String SIN_ROLES_ACTIVOS = "Sin roles activos";

    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;

    public AdministracionConsultasService(
            UsuarioRepository usuarioRepository,
            RolRepository rolRepository) {
        this.usuarioRepository = usuarioRepository;
        this.rolRepository = rolRepository;
    }

    @Transactional(readOnly = true)
    public List<UsuarioAdminResponse> listarUsuarios(String correo) {
        List<Usuario> usuarios = correo == null || correo.isBlank()
                ? usuarioRepository.findAllByOrderByNombreAsc()
                : usuarioRepository.findByCorreoContainingIgnoreCaseOrderByNombreAsc(correo.trim());

        return usuarios.stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<RolResponse> listarRoles() {
        return rolRepository.findAll(Sort.by(Sort.Direction.ASC, "nombre")).stream()
                .map(rol -> new RolResponse(rol.getIdRol(), rol.getNombre(), rol.getDescripcion()))
                .toList();
    }

    private UsuarioAdminResponse toResponse(Usuario usuario) {
        List<String> rolesActivos = usuario.getRoles() == null ? List.of() :
                usuario.getRoles().stream()
                        .filter(asignacion -> Boolean.TRUE.equals(asignacion.getEstado()))
                        .map(UsuarioRol::getRol)
                        .filter(rol -> rol != null && rol.getNombre() != null)
                        .map(Rol::getNombre)
                        .distinct()
                        .sorted()
                        .toList();

        String rolPrincipal = rolesActivos.isEmpty() ? SIN_ROLES_ACTIVOS : rolesActivos.get(0);

        return new UsuarioAdminResponse(
                usuario.getIdUsuario(),
                usuario.getNombre(),
                usuario.getCorreo(),
                rolPrincipal,
                usuario.getEstado(),
                usuario.getFechaRegistro(),
                rolesActivos
        );
    }
}
