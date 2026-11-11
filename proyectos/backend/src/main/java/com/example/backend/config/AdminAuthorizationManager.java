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
 * Gestor de autorización administrativa.
 * Consulta asignaciones vigentes en cada solicitud y aplica denegación por defecto.
 */
@Component
public class AdminAuthorizationManager implements AuthorizationManager<RequestAuthorizationContext> {

    private static final Logger log = LoggerFactory.getLogger(AdminAuthorizationManager.class);
    private static final String ROL_ADMINISTRADOR = "Administrador";

    private final UsuarioRepository usuarioRepository;

    public AdminAuthorizationManager(UsuarioRepository usuarioRepository) {
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
        if (authentication == null || !authentication.isAuthenticated()) {
            return new AuthorizationDecision(false);
        }

        Object principal = authentication.getPrincipal();
        if (!(principal instanceof Jwt jwt)) {
            return new AuthorizationDecision(false);
        }

        String sub = jwt.getSubject();
        if (sub == null || sub.isBlank()) {
            return new AuthorizationDecision(false);
        }

        try {
            UUID.fromString(sub.trim());
        } catch (IllegalArgumentException e) {
            log.warn("Rechazo de autorización administrativa: claim 'sub' inválido.");
            return new AuthorizationDecision(false);
        }

        try {
            boolean esAdmin = usuarioRepository.findBySupabaseUid(sub)
                    .filter(usuario -> Boolean.TRUE.equals(usuario.getEstado()))
                    .map(this::tieneRolAdministradorVigente)
                    .orElse(false);
            return new AuthorizationDecision(esAdmin);
        } catch (DataAccessException dae) {
            log.error("Fallo de base de datos al verificar autorización administrativa (sub: {}).", sub, dae);
            return new AuthorizationDecision(false);
        } catch (Exception ex) {
            log.error("Error inesperado al verificar autorización administrativa (sub: {}).", sub, ex);
            return new AuthorizationDecision(false);
        }
    }

    private boolean tieneRolAdministradorVigente(Usuario usuario) {
        if (usuario.getRoles() == null) {
            return false;
        }
        return usuario.getRoles().stream()
                .filter(asignacion -> Boolean.TRUE.equals(asignacion.getEstado()))
                .map(UsuarioRol::getRol)
                .anyMatch(rol -> rol != null
                        && rol.getNombre() != null
                        && ROL_ADMINISTRADOR.equalsIgnoreCase(rol.getNombre()));
    }
}
