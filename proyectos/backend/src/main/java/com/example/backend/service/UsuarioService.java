package com.example.backend.service;

import com.example.backend.dto.UsuarioMeResponse;
import com.example.backend.entity.Rol;
import com.example.backend.entity.Usuario;
import com.example.backend.entity.UsuarioRol;
import com.example.backend.exception.ConflictException;
import com.example.backend.repository.RolRepository;
import com.example.backend.repository.UsuarioRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

/**
 * Aprovisionamiento Just-In-Time del perfil local a partir de un JWT de Supabase.
 * Los roles se asignan desde el catálogo de la base de datos, nunca desde claims del cliente.
 */
@Service
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final TransactionTemplate requiresNewTx;

    public UsuarioService(UsuarioRepository usuarioRepository,
                          RolRepository rolRepository,
                          PlatformTransactionManager txManager) {
        this.usuarioRepository = usuarioRepository;
        this.rolRepository = rolRepository;
        this.requiresNewTx = new TransactionTemplate(txManager);
        this.requiresNewTx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    public UsuarioMeResponse obtenerOProveerUsuario(Jwt jwt) {
        if (jwt == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token JWT de Supabase requerido.");
        }

        String sub = jwt.getSubject();
        if (sub == null || sub.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El claim 'sub' es obligatorio en el token.");
        }
        try {
            UUID.fromString(sub);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El claim 'sub' debe ser un UUID válido.");
        }

        Boolean emailVerified = jwt.getClaimAsBoolean("email_verified");
        if (emailVerified != null && !emailVerified) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "El correo electrónico asociado al token no ha sido verificado.");
        }

        Optional<Usuario> usuarioExistente = usuarioRepository.findBySupabaseUid(sub);
        if (usuarioExistente.isPresent()) {
            return toResponse(usuarioExistente.get());
        }

        String rawEmail = jwt.getClaimAsString("email");
        if (rawEmail == null || rawEmail.isBlank() || !rawEmail.contains("@")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El token debe contener un correo electrónico válido en el claim 'email'.");
        }
        final String email = rawEmail.trim().toLowerCase();

        Optional<Usuario> usuarioPorCorreo = usuarioRepository.findByCorreo(email);
        if (usuarioPorCorreo.isPresent()) {
            Usuario u = usuarioPorCorreo.get();
            if (sub.equals(u.getSupabaseUid())) {
                return toResponse(u);
            }
            throw new ConflictException("Existe una cuenta previa registrada con el correo " + email + " sin vinculación segura al identificador de Supabase.");
        }

        Rol rolDefault = rolRepository.findByNombre("Usuario registrado")
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.INTERNAL_SERVER_ERROR,
                        "El rol predeterminado 'Usuario registrado' no existe en el sistema."
                ));

        Usuario nuevoUsuario = new Usuario();
        nuevoUsuario.setNombre(extraerNombre(jwt, email));
        nuevoUsuario.setCorreo(email);
        nuevoUsuario.setSupabaseUid(sub);
        nuevoUsuario.setRol(rolDefault); // compatibilidad temporal con usuario.id_rol
        nuevoUsuario.setEstado(true);
        nuevoUsuario.setFechaRegistro(LocalDateTime.now());
        nuevoUsuario.setPassword(null);

        UsuarioRol asignacionInicial = new UsuarioRol();
        asignacionInicial.setRol(rolDefault);
        asignacionInicial.setEstado(true);
        asignacionInicial.setFechaAsignacion(LocalDateTime.now());
        nuevoUsuario.agregarRol(asignacionInicial);

        Usuario usuarioPersistido;
        try {
            usuarioPersistido = requiresNewTx.execute(status -> usuarioRepository.saveAndFlush(nuevoUsuario));
        } catch (DataIntegrityViolationException ex) {
            usuarioPersistido = usuarioRepository.findBySupabaseUid(sub)
                    .orElseGet(() -> usuarioRepository.findByCorreo(email)
                            .filter(u -> sub.equals(u.getSupabaseUid()))
                            .orElseThrow(() -> new ConflictException("Conflicto de unicidad al registrar el usuario en base de datos.")));
        }

        if (usuarioPersistido == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "No fue posible persistir el perfil de usuario.");
        }
        return toResponse(usuarioPersistido);
    }

    private String extraerNombre(Jwt jwt, String email) {
        Object userMetadataObj = jwt.getClaim("user_metadata");
        if (userMetadataObj instanceof Map<?, ?> metadata) {
            Object fullName = metadata.get("full_name");
            if (fullName instanceof String s && !s.isBlank()) {
                return truncarNombre(s.trim());
            }
            Object name = metadata.get("name");
            if (name instanceof String s && !s.isBlank()) {
                return truncarNombre(s.trim());
            }
            Object userName = metadata.get("user_name");
            if (userName instanceof String s && !s.isBlank()) {
                return truncarNombre(s.trim());
            }
        }
        return truncarNombre(email.split("@")[0]);
    }

    private String truncarNombre(String nombre) {
        return nombre.length() > 150 ? nombre.substring(0, 150) : nombre;
    }

    private UsuarioMeResponse toResponse(Usuario usuario) {
        List<String> rolesActivos = usuario.getRoles() == null ? List.of() :
                usuario.getRoles().stream()
                        .filter(asignacion -> Boolean.TRUE.equals(asignacion.getEstado()))
                        .map(UsuarioRol::getRol)
                        .filter(rol -> rol != null && rol.getNombre() != null)
                        .map(Rol::getNombre)
                        .distinct()
                        .sorted()
                        .toList();

        // Compatibilidad de lectura con perfiles existentes antes de aplicar la migración.
        if (rolesActivos.isEmpty() && usuario.getRol() != null && usuario.getRol().getNombre() != null) {
            rolesActivos = List.of(usuario.getRol().getNombre());
        }
        String rolPrincipal = rolesActivos.isEmpty() ? "Usuario registrado" : rolesActivos.get(0);

        return new UsuarioMeResponse(
                usuario.getIdUsuario(),
                usuario.getNombre(),
                usuario.getCorreo(),
                rolPrincipal,
                usuario.getEstado(),
                usuario.getFechaRegistro(),
                rolesActivos
        );
    }

    public Usuario obtenerUsuarioDesdeJwt(Jwt jwt) {
        if (jwt == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token JWT de Supabase requerido.");
        }
        String sub = jwt.getSubject();
        if (sub == null || sub.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El claim 'sub' es obligatorio en el token.");
        }
        return usuarioRepository.findBySupabaseUid(sub)
                .orElseGet(() -> {
                    obtenerOProveerUsuario(jwt);
                    return usuarioRepository.findBySupabaseUid(sub)
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No fue posible autenticar al usuario."));
                });
    }
}
