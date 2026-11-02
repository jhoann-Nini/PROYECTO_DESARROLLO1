package com.example.backend.service;

import com.example.backend.dto.ResenaRequest;
import com.example.backend.dto.ResenaResponse;
import com.example.backend.dto.ResenaUpdateRequest;
import com.example.backend.entity.Producto;
import com.example.backend.entity.Resena;
import com.example.backend.entity.Usuario;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.repository.ProductoRepository;
import com.example.backend.repository.ResenaRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Servicio de negocio para la consulta, registro, actualización y eliminación de reseñas de productos.
 */
@Service
public class ResenaService {

    private final ResenaRepository resenaRepository;
    private final ProductoRepository productoRepository;
    private final UsuarioService usuarioService;

    public ResenaService(ResenaRepository resenaRepository,
                         ProductoRepository productoRepository,
                         UsuarioService usuarioService) {
        this.resenaRepository = resenaRepository;
        this.productoRepository = productoRepository;
        this.usuarioService = usuarioService;
    }

    @Transactional(readOnly = true)
    public List<ResenaResponse> listar(Long idProducto) {
        List<Resena> resenas;
        if (idProducto != null) {
            if (!productoRepository.existsById(idProducto)) {
                throw new ResourceNotFoundException("Producto no encontrado con id " + idProducto);
            }
            resenas = resenaRepository.findByProductoIdProductoAndEstadoTrueOrderByFechaCreacionDesc(idProducto);
        } else {
            resenas = resenaRepository.findByEstadoTrueOrderByFechaCreacionDesc();
        }
        return resenas.stream().map(this::toResponse).toList();
    }

    @Transactional
    public ResenaResponse crearOActualizar(ResenaRequest request, Jwt jwt) {
        Usuario usuario = usuarioService.obtenerUsuarioDesdeJwt(jwt);

        Producto producto = productoRepository.findById(request.idProducto())
                .filter(p -> Boolean.TRUE.equals(p.getEstado()))
                .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado con id " + request.idProducto()));

        String comentarioLimpio = request.comentario().trim();

        // Si el usuario ya tiene una reseña activa para este producto, se actualizan sus datos y fecha
        Resena resena = resenaRepository.findByUsuarioIdUsuarioAndProductoIdProductoAndEstadoTrue(
                usuario.getIdUsuario(),
                producto.getIdProducto()
        ).orElseGet(() -> {
            Resena nueva = new Resena();
            nueva.setUsuario(usuario);
            nueva.setProducto(producto);
            nueva.setEstado(true);
            return nueva;
        });

        resena.setComentario(comentarioLimpio);
        if (request.puntuacion() != null) {
            resena.setPuntuacion(request.puntuacion());
        }
        resena.setFechaCreacion(LocalDateTime.now());

        Resena guardada = resenaRepository.save(resena);
        return toResponse(guardada);
    }

    /**
     * Actualiza una reseña existente identificada por su ID (S2-17).
     * Valida que el usuario autenticado sea el autor de la reseña.
     */
    @Transactional
    public ResenaResponse actualizar(Long idResena, ResenaUpdateRequest request, Jwt jwt) {
        return actualizar(null, idResena, request, jwt);
    }

    /**
     * Actualiza una reseña existente identificada por su ID y verificando el producto (S2-17).
     * Valida que pertenezca al producto indicado y que el usuario autenticado sea el autor.
     */
    @Transactional
    public ResenaResponse actualizar(Long idProducto, Long idResena, ResenaUpdateRequest request, Jwt jwt) {
        if (idResena == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El id de la reseña es obligatorio.");
        }

        Usuario usuario = usuarioService.obtenerUsuarioDesdeJwt(jwt);

        Resena resena = resenaRepository.findById(idResena)
                .filter(r -> Boolean.TRUE.equals(r.getEstado()))
                .orElseThrow(() -> new ResourceNotFoundException("Reseña no encontrada con id " + idResena));

        if (idProducto != null && !resena.getProducto().getIdProducto().equals(idProducto)) {
            throw new ResourceNotFoundException("Reseña no encontrada con id " + idResena + " para el producto con id " + idProducto);
        }

        // Verificar que el usuario autenticado sea el autor de la reseña
        if (!resena.getUsuario().getIdUsuario().equals(usuario.getIdUsuario())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No tienes permiso para modificar esta reseña.");
        }

        String comentarioLimpio = request.comentario().trim();
        resena.setComentario(comentarioLimpio);
        if (request.puntuacion() != null) {
            resena.setPuntuacion(request.puntuacion());
        }

        Resena guardada = resenaRepository.save(resena);
        return toResponse(guardada);
    }

    /**
     * Elimina lógicamente una reseña existente identificada por su ID (S2-18).
     * Valida que el usuario autenticado sea el autor de la reseña o tenga rol 'Administrador'.
     */
    @Transactional
    public void eliminar(Long idResena, Jwt jwt) {
        eliminar(null, idResena, jwt);
    }

    /**
     * Elimina lógicamente una reseña existente verificando el producto (S2-18).
     * Valida que pertenezca al producto indicado y que el usuario autenticado sea el autor o tenga rol 'Administrador'.
     */
    @Transactional
    public void eliminar(Long idProducto, Long idResena, Jwt jwt) {
        if (idResena == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El id de la reseña es obligatorio.");
        }

        Usuario usuario = usuarioService.obtenerUsuarioDesdeJwt(jwt);

        Resena resena = resenaRepository.findById(idResena)
                .filter(r -> Boolean.TRUE.equals(r.getEstado()))
                .orElseThrow(() -> new ResourceNotFoundException("Reseña no encontrada con id " + idResena));

        if (idProducto != null && !resena.getProducto().getIdProducto().equals(idProducto)) {
            throw new ResourceNotFoundException("Reseña no encontrada con id " + idResena + " para el producto con id " + idProducto);
        }

        boolean esAutor = resena.getUsuario().getIdUsuario().equals(usuario.getIdUsuario());
        boolean esAdmin = usuario.getRol() != null && "Administrador".equalsIgnoreCase(usuario.getRol().getNombre());

        if (!esAutor && !esAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No tienes permiso para eliminar esta reseña.");
        }

        resena.setEstado(false);
        resenaRepository.save(resena);
    }

    private ResenaResponse toResponse(Resena r) {
        return new ResenaResponse(
                r.getIdResena(),
                r.getProducto().getIdProducto(),
                r.getProducto().getNombre(),
                r.getUsuario().getIdUsuario(),
                r.getUsuario().getNombre(),
                r.getComentario(),
                r.getPuntuacion(),
                r.getFechaCreacion(),
                r.getEstado()
        );
    }
}
