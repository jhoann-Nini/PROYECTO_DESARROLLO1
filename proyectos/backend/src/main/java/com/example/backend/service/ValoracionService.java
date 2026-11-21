package com.example.backend.service;

import com.example.backend.dto.ValoracionResponse;
import com.example.backend.entity.Resena;
import com.example.backend.entity.Usuario;
import com.example.backend.repository.ResenaRepository;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Servicio de negocio para la gestión de valoraciones (ahora basadas en Resena).
 * Mantiene el contrato público de ValoracionResponse pero persiste en la tabla `resena`.
 */
@Service
public class ValoracionService {

    private final ResenaRepository resenaRepository;
    private final UsuarioService usuarioService;

    public ValoracionService(
            ResenaRepository resenaRepository,
            UsuarioService usuarioService) {
        this.resenaRepository = resenaRepository;
        this.usuarioService = usuarioService;
    }

    // Fase 5 (H-15): se eliminó crearOActualizar. Era inalcanzable (POST
    // /api/valoraciones responde 410 Gone sin llamarlo) y, si se reactivaba,
    // borraba el comentario de la reseña existente. Las valoraciones se crean
    // con las reseñas: POST /api/resenas.

    /**
     * Obtiene la reseña (valoración) activa del usuario autenticado para un producto.
     */
    @Transactional(readOnly = true)
    public Optional<ValoracionResponse> obtenerMiValoracion(Long idProducto, Jwt jwt) {
        if (jwt == null) {
            return Optional.empty();
        }
        Usuario usuario = usuarioService.obtenerUsuarioDesdeJwt(jwt);
        validarUsuarioActivo(usuario);
        return resenaRepository
                .findByUsuarioIdUsuarioAndProductoIdProductoAndEstadoTrue(
                        usuario.getIdUsuario(),
                        idProducto)
                .map(this::toValoracionResponse);
    }

    /**
     * Impide que una cuenta suspendida consulte o modifique sus valoraciones.
     */
    private void validarUsuarioActivo(Usuario usuario) {
        if (!Boolean.TRUE.equals(usuario.getEstado())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Usuario inactivo o suspendido.");
        }
    }

    /**
     * Convierte una Resena en el DTO de respuesta utilizado por el endpoint de Valoración.
     */
    private ValoracionResponse toValoracionResponse(Resena r) {
        return new ValoracionResponse(
                r.getIdResena(),
                r.getProducto().getIdProducto(),
                r.getProducto().getNombre(),
                r.getUsuario().getIdUsuario(),
                r.getUsuario().getNombre(),
                r.getPuntuacion(),
                r.getFechaCreacion(),
                r.getEstado()
        );
    }
}
