package com.example.backend.service;

import com.example.backend.dto.UsuarioMeResponse;
import com.example.backend.entity.Rol;
import com.example.backend.entity.Usuario;
import com.example.backend.exception.ConflictException;
import com.example.backend.repository.RolRepository;
import com.example.backend.repository.UsuarioRepository;
import java.time.LocalDateTime;
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
 * Servicio de aprovisionamiento Just-In-Time (JIT) y gestión del perfil del usuario autenticado.
 *
 * Implementa la creación segura de perfiles en public.usuario a partir de tokens Supabase ES256,
 * respetando el principio de Zero-Trust respecto a claims de rol del cliente y manejando
 * la concurrencia mediante transacciones aisladas.
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

    /**
     * Obtiene el perfil del usuario autenticado o lo aprovisiona si es la primera vez que accede.
     *
     * @param jwt Token JWT validado por Spring Security
     * @return DTO con los datos de negocio del usuario (sin contraseñas ni secretos)
     */
    public UsuarioMeResponse obtenerOProveerUsuario(Jwt jwt) {
        if (jwt == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token JWT de Supabase requerido.");
        }

        // 1. Validar sub exclusivamente del token y verificar que sea un UUID válido
        String sub = jwt.getSubject();
        if (sub == null || sub.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El claim 'sub' es obligatorio en el token.");
        }
        try {
            UUID.fromString(sub);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El claim 'sub' debe ser un UUID válido.");
        }

        // 2. Inspeccionar verificación de correo en los claims disponibles
        Boolean emailVerified = jwt.getClaimAsBoolean("email_verified");
        if (emailVerified != null && !emailVerified) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "El correo electrónico asociado al token no ha sido verificado.");
        }

        // 3. Buscar primero por supabase_uid
        Optional<Usuario> usuarioExistente = usuarioRepository.findBySupabaseUid(sub);
        if (usuarioExistente.isPresent()) {
            return toResponse(usuarioExistente.get());
        }

        // 4. Obtener y validar el correo electrónico desde el claim 'email'
        String rawEmail = jwt.getClaimAsString("email");
        if (rawEmail == null || rawEmail.isBlank() || !rawEmail.contains("@")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El token debe contener un correo electrónico válido en el claim 'email'.");
        }
        final String email = rawEmail.trim().toLowerCase();

        // 5. Verificar si existe cuenta previa con el mismo correo
        // Regla de seguridad: Si existe una cuenta histórica sin supabase_uid o asociada a otro identificador,
        // no vincular automáticamente sin autorización demostrada (409 Conflict).
        // Si fue creada concurrentemente con este mismo sub, devolver su perfil.
        Optional<Usuario> usuarioPorCorreo = usuarioRepository.findByCorreo(email);
        if (usuarioPorCorreo.isPresent()) {
            Usuario u = usuarioPorCorreo.get();
            if (sub.equals(u.getSupabaseUid())) {
                return toResponse(u);
            }
            throw new ConflictException("Existe una cuenta previa registrada con el correo " + email + " sin vinculación segura al identificador de Supabase.");
        }

        // 6. Asignar rol inicial "Usuario registrado" consultando RolRepository
        // Regla de seguridad: No aceptar roles del cliente ni de user_metadata.
        Rol rolDefault = rolRepository.findByNombre("Usuario registrado")
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.INTERNAL_SERVER_ERROR,
                        "El rol predeterminado 'Usuario registrado' no existe en el sistema."
                ));

        // 7. Extraer nombre desde claims confiables o fallback al usuario/correo
        String nombre = extraerNombre(jwt, email);

        // 8. Crear y persistir el nuevo usuario
        Usuario nuevoUsuario = new Usuario();
        nuevoUsuario.setNombre(nombre);
        nuevoUsuario.setCorreo(email);
        nuevoUsuario.setSupabaseUid(sub);
        nuevoUsuario.setRol(rolDefault);
        nuevoUsuario.setEstado(true);
        nuevoUsuario.setFechaRegistro(LocalDateTime.now());
        nuevoUsuario.setPassword(null);

        Usuario usuarioPersistido;
        try {
            // Se ejecuta en una transacción aislada (REQUIRES_NEW) para no contaminar
            // la transacción principal ante fallos de concurrencia.
            usuarioPersistido = requiresNewTx.execute(status -> usuarioRepository.saveAndFlush(nuevoUsuario));
        } catch (DataIntegrityViolationException ex) {
            // Manejo de concurrencia: si dos peticiones simultáneas intentaron crear el mismo supabase_uid o correo,
            // la segunda recupera el registro ya confirmado por la primera.
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
        if (nombre.length() > 150) {
            return nombre.substring(0, 150);
        }
        return nombre;
    }

    private UsuarioMeResponse toResponse(Usuario usuario) {
        return new UsuarioMeResponse(
                usuario.getIdUsuario(),
                usuario.getNombre(),
                usuario.getCorreo(),
                usuario.getRol() != null ? usuario.getRol().getNombre() : "Usuario registrado",
                usuario.getEstado(),
                usuario.getFechaRegistro()
        );
    }

    /**
     * Obtiene la entidad Usuario autenticada a partir del token JWT validado por Spring Security,
     * aprovisionándola JIT si es la primera vez que interactúa con el sistema.
     *
     * @param jwt Token JWT inyectado
     * @return Entidad Usuario persistida
     */
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

