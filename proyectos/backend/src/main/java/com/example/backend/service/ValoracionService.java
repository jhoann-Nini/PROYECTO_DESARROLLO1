package com.example.backend.service;

import com.example.backend.dto.ValoracionRequest;
import com.example.backend.dto.ValoracionResponse;
import com.example.backend.entity.Producto;
import com.example.backend.entity.Resena;
import com.example.backend.entity.Usuario;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.repository.ProductoRepository;
import com.example.backend.repository.ResenaRepository;
import java.time.LocalDateTime;
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
    private final ProductoRepository productoRepository;
    private final UsuarioService usuarioService;

    public ValoracionService(
            ResenaRepository resenaRepository,
            ProductoRepository productoRepository,
            UsuarioService usuarioService) {
        this.resenaRepository = resenaRepository;
        this.productoRepository = productoRepository;
        this.usuarioService = usuarioService;
    }

    /**
     * Registra o actualiza la reseña (valoración) activa de un usuario para un producto.
     */
    @Transactional
    public ValoracionResponse crearOActualizar(ValoracionRequest request, Jwt jwt) {
        if (jwt == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token JWT requerido para valorar un producto.");
        }

        if (request.puntuacion() == null || request.puntuacion() < 1 || request.puntuacion() > 5) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La puntuación debe ser un número entero entre 1 y 5.");
        }

        Usuario usuario = usuarioService.obtenerUsuarioDesdeJwt(jwt);

        Producto producto = productoRepository.findById(request.idProducto())
                .filter(p -> Boolean.TRUE.equals(p.getEstado()))
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Producto no encontrado o inactivo con id " + request.idProducto()));

        // Busca reseña activa del usuario para el producto, o crea una nueva.
        Resena resena = resenaRepository
                .findByUsuarioIdUsuarioAndProductoIdProductoAndEstadoTrue(
                        usuario.getIdUsuario(),
                        producto.getIdProducto())
                .orElseGet(() -> {
                    Resena nueva = new Resena();
                    nueva.setUsuario(usuario);
                    nueva.setProducto(producto);
                    nueva.setEstado(true);
                    return nueva;
                });

        resena.setComentario("");
        resena.setPuntuacion(request.puntuacion());
        resena.setFechaCreacion(LocalDateTime.now());

        Resena guardada = resenaRepository.save(resena);
        return toValoracionResponse(guardada);
    }

    /**
     * Obtiene la reseña (valoración) activa del usuario autenticado para un producto.
     */
    @Transactional(readOnly = true)
    public Optional<ValoracionResponse> obtenerMiValoracion(Long idProducto, Jwt jwt) {
        if (jwt == null) {
            return Optional.empty();
        }
        Usuario usuario = usuarioService.obtenerUsuarioDesdeJwt(jwt);
        return resenaRepository
                .findByUsuarioIdUsuarioAndProductoIdProductoAndEstadoTrue(
                        usuario.getIdUsuario(),
                        idProducto)
                .map(this::toValoracionResponse);
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
