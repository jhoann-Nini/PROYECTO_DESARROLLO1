package com.example.backend.service;

import com.example.backend.dto.ValoracionRequest;
import com.example.backend.dto.ValoracionResponse;
import com.example.backend.entity.Producto;
import com.example.backend.entity.Usuario;
import com.example.backend.entity.Valoracion;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.repository.ProductoRepository;
import com.example.backend.repository.ValoracionRepository;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Servicio de negocio para la gestión de valoraciones de productos.
 */
@Service
public class ValoracionService {

    private final ValoracionRepository valoracionRepository;
    private final ProductoRepository productoRepository;
    private final UsuarioService usuarioService;

    public ValoracionService(
            ValoracionRepository valoracionRepository,
            ProductoRepository productoRepository,
            UsuarioService usuarioService) {
        this.valoracionRepository = valoracionRepository;
        this.productoRepository = productoRepository;
        this.usuarioService = usuarioService;
    }

    /**
     * Registra o actualiza la valoración activa de un usuario para un producto específico.
     * Si el usuario ya valoró el producto, actualiza su puntuación conservando la unicidad.
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

        Optional<Valoracion> valoracionExistente = valoracionRepository
                .findByUsuarioIdUsuarioAndProductoIdProductoAndEstadoTrue(
                        usuario.getIdUsuario(),
                        producto.getIdProducto());

        Valoracion valoracion = valoracionExistente.orElseGet(() -> {
            Valoracion nueva = new Valoracion();
            nueva.setUsuario(usuario);
            nueva.setProducto(producto);
            nueva.setEstado(true);
            return nueva;
        });

        valoracion.setPuntuacion(request.puntuacion());
        valoracion.setFechaCreacion(LocalDateTime.now());

        try {
            Valoracion guardada = valoracionRepository.saveAndFlush(valoracion);
            return toResponse(guardada);
        } catch (DataIntegrityViolationException ex) {
            // Manejo de condición de carrera concurrente respetando el índice único parcial
            Valoracion concurrente = valoracionRepository
                    .findByUsuarioIdUsuarioAndProductoIdProductoAndEstadoTrue(
                            usuario.getIdUsuario(),
                            producto.getIdProducto())
                    .orElseThrow(() -> ex);

            concurrente.setPuntuacion(request.puntuacion());
            concurrente.setFechaCreacion(LocalDateTime.now());
            Valoracion actualizada = valoracionRepository.saveAndFlush(concurrente);
            return toResponse(actualizada);
        }
    }

    /**
     * Consulta la valoración activa del usuario autenticado para un producto determinado.
     */
    @Transactional(readOnly = true)
    public Optional<ValoracionResponse> obtenerMiValoracion(Long idProducto, Jwt jwt) {
        if (jwt == null) {
            return Optional.empty();
        }

        Usuario usuario = usuarioService.obtenerUsuarioDesdeJwt(jwt);
        return valoracionRepository
                .findByUsuarioIdUsuarioAndProductoIdProductoAndEstadoTrue(
                        usuario.getIdUsuario(),
                        idProducto)
                .map(this::toResponse);
    }

    private ValoracionResponse toResponse(Valoracion v) {
        return new ValoracionResponse(
                v.getIdValoracion(),
                v.getProducto().getIdProducto(),
                v.getProducto().getNombre(),
                v.getUsuario().getIdUsuario(),
                v.getUsuario().getNombre(),
                v.getPuntuacion(),
                v.getFechaCreacion(),
                v.getEstado()
        );
    }
}
