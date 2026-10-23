package com.example.backend.config;

import com.example.backend.entity.Usuario;
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
 * Gestor de autorización exclusivo para operaciones administrativas (POST, PUT, DELETE).
 *
 * Implementa el principio de Zero-Trust y Fail-Safe Defaults:
 * - Valida la existencia positiva del usuario en public.usuario mediante el claim 'sub' con formato UUID.
 * - Verifica que el estado de la cuenta sea activo (estado = true).
 * - Verifica que el rol asociado en public.rol sea estrictamente 'Administrador'.
 * - Ante cualquier fallo de base de datos o ausencia de datos en BD, deniega el acceso sin conceder permisos.
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
    public AuthorizationDecision authorize(Supplier<? extends Authentication> authenticationSupplier, RequestAuthorizationContext context) {
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

        // Validación explícita del formato UUID del claim 'sub'
        try {
            UUID.fromString(sub.trim());
        } catch (IllegalArgumentException e) {
            log.warn("Rechazo de autorización administrativa: el claim 'sub' no es un UUID válido: '{}'", sub);
            return new AuthorizationDecision(false);
        }

        try {
            boolean esAdmin = usuarioRepository.findBySupabaseUid(sub)
                    .filter(u -> Boolean.TRUE.equals(u.getEstado()))
                    .map(Usuario::getRol)
                    .filter(r -> r != null && ROL_ADMINISTRADOR.equalsIgnoreCase(r.getNombre()))
                    .isPresent();

            return new AuthorizationDecision(esAdmin);
        } catch (DataAccessException dae) {
            log.error("Fallo de acceso a datos en PostgreSQL durante la verificación de autorización administrativa (sub: {}): {}", sub, dae.getMessage(), dae);
            // Principio Fail-Closed: ante indisponibilidad de BD nunca conceder acceso
            return new AuthorizationDecision(false);
        } catch (Exception ex) {
            log.error("Error inesperado al consultar el rol de usuario para autorización administrativa (sub: {}): {}", sub, ex.getMessage(), ex);
            // Fail-closed seguro
            return new AuthorizationDecision(false);
        }
    }
}
