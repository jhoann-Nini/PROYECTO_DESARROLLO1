package com.example.backend.service;

import com.example.backend.dto.ResenaRequest;
import com.example.backend.dto.ResenaResponse;
import com.example.backend.entity.Producto;
import com.example.backend.entity.Resena;
import com.example.backend.entity.Usuario;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.repository.ProductoRepository;
import com.example.backend.repository.ResenaRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Servicio de negocio para la consulta y registro de reseñas de productos.
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

        // Si el usuario ya tiene una reseña activa para este producto, se actualiza el comentario y la fecha
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
        resena.setFechaCreacion(LocalDateTime.now());

        Resena guardada = resenaRepository.save(resena);
        return toResponse(guardada);
    }

    private ResenaResponse toResponse(Resena r) {
        return new ResenaResponse(
                r.getIdResena(),
                r.getProducto().getIdProducto(),
                r.getProducto().getNombre(),
                r.getUsuario().getIdUsuario(),
                r.getUsuario().getNombre(),
                r.getComentario(),
                r.getFechaCreacion(),
                r.getEstado()
        );
    }
}
