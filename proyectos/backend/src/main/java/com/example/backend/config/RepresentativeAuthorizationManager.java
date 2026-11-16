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
 * Autoriza las rutas de gestión de establecimientos a representantes activos
 * y administradores activos. El alcance de cada representante se verifica
 * adicionalmente en el servicio mediante su asignación vigente.
 */
@Component
public class RepresentativeAuthorizationManager implements AuthorizationManager<RequestAuthorizationContext> {

    private static final Logger log = LoggerFactory.getLogger(RepresentativeAuthorizationManager.class);
    private static final String ROL_REPRESENTANTE = "Representante de establecimiento";
    private static final String ROL_ADMINISTRADOR = "Administrador";

    private final UsuarioRepository usuarioRepository;

    public RepresentativeAuthorizationManager(UsuarioRepository usuarioRepository) {
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
                    .map(this::tieneRolPermitido)
                    .orElse(false);
            return new AuthorizationDecision(autorizado);
        } catch (IllegalArgumentException ex) {
            log.warn("Rechazo de autorización de representante: claim 'sub' inválido.");
            return new AuthorizationDecision(false);
        } catch (DataAccessException ex) {
            log.error("No fue posible verificar los permisos del representante.", ex);
            return new AuthorizationDecision(false);
        } catch (Exception ex) {
            log.error("Error inesperado al verificar los permisos del representante.", ex);
            return new AuthorizationDecision(false);
        }
    }

    private boolean tieneRolPermitido(Usuario usuario) {
        return usuario.getRoles() != null && usuario.getRoles().stream()
                .filter(asignacion -> Boolean.TRUE.equals(asignacion.getEstado()))
                .map(UsuarioRol::getRol)
                .anyMatch(rol -> rol != null && rol.getNombre() != null
                        && (ROL_REPRESENTANTE.equalsIgnoreCase(rol.getNombre())
                        || ROL_ADMINISTRADOR.equalsIgnoreCase(rol.getNombre())));
    }
}
