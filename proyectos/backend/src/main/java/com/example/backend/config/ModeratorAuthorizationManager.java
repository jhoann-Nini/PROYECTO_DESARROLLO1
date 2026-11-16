package com.example.backend.config;

import com.example.backend.entity.Usuario;
import com.example.backend.entity.UsuarioRol;
import com.example.backend.repository.UsuarioRepository;
import java.util.UUID;
import java.util.function.Supplier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.authorization.AuthorizationManager;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;
import org.springframework.stereotype.Component;

/**
 * Autoriza la bandeja de moderación a moderadores y administradores activos.
 * No concede permisos administrativos generales al rol Moderador.
 */
@Component
public class ModeratorAuthorizationManager implements AuthorizationManager<RequestAuthorizationContext> {

    private static final Logger log = LoggerFactory.getLogger(ModeratorAuthorizationManager.class);
    private final UsuarioRepository usuarioRepository;

    public ModeratorAuthorizationManager(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    @Override
    public AuthorizationDecision authorize(
            Supplier<? extends Authentication> authenticationSupplier,
            RequestAuthorizationContext context) {
        if (authenticationSupplier == null) {
            return new AuthorizationDecision(false);
        }
        Authentication authentication = authenticationSupplier.get();
        if (authentication == null || !authentication.isAuthenticated()
                || !(authentication.getPrincipal() instanceof Jwt jwt)) {
            return new AuthorizationDecision(false);
        }

        String sub = jwt.getSubject();
        if (sub == null || sub.isBlank()) {
            return new AuthorizationDecision(false);
        }
        try {
            UUID.fromString(sub.trim());
            boolean autorizado = usuarioRepository.findBySupabaseUid(sub)
                    .filter(usuario -> Boolean.TRUE.equals(usuario.getEstado()))
                    .map(this::tienePermisoModeracion)
                    .orElse(false);
            return new AuthorizationDecision(autorizado);
        } catch (IllegalArgumentException ex) {
            return new AuthorizationDecision(false);
        } catch (DataAccessException ex) {
            log.error("No fue posible verificar permisos de moderación.", ex);
            return new AuthorizationDecision(false);
        } catch (Exception ex) {
            log.error("Error inesperado al verificar permisos de moderación.", ex);
            return new AuthorizationDecision(false);
        }
    }

    private boolean tienePermisoModeracion(Usuario usuario) {
        return usuario.getRoles() != null && usuario.getRoles().stream()
                .filter(asignacion -> Boolean.TRUE.equals(asignacion.getEstado()))
                .map(UsuarioRol::getRol)
                .anyMatch(rol -> rol != null && rol.getNombre() != null
                        && ("Moderador".equalsIgnoreCase(rol.getNombre())
                        || "Administrador".equalsIgnoreCase(rol.getNombre())));
    }
}
