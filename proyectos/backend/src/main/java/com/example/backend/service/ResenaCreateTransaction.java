package com.example.backend.service;

import com.example.backend.dto.ResenaRequest;
import com.example.backend.entity.Producto;
import com.example.backend.entity.Resena;
import com.example.backend.entity.Usuario;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.repository.ProductoRepository;
import com.example.backend.repository.ResenaRepository;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.backend.dto.ResenaResponse;

/**
 * Bean que contiene la lógica de creación/actualización de reseñas dentro de una
 * transacción (REQUIRED). Se usa desde ResenaService como parte
 * de la arquitectura de orquestación.
 */
@Service
public class ResenaCreateTransaction {

    private final ResenaRepository resenaRepository;
    private final ProductoRepository productoRepository;
    private final UsuarioService usuarioService;

    public ResenaCreateTransaction(ResenaRepository resenaRepository,
                                   ProductoRepository productoRepository,
                                   UsuarioService usuarioService) {
        this.resenaRepository = resenaRepository;
        this.productoRepository = productoRepository;
        this.usuarioService = usuarioService;
    }

    /**
     * Crea una reseña nueva o actualiza la existente (upsert).
     * Se ejecuta con propagación REQUIRED para participar en la transacción del invocador si existe,
     * o iniciar una nueva transacción física en peticiones HTTP normales.
     */
    @Transactional
    public ResenaResponse crearOActualizar(ResenaRequest request, Jwt jwt) {
        // Obtener usuario a partir del JWT
        Usuario usuario = usuarioService.obtenerUsuarioDesdeJwt(jwt);

        // Obtener y validar producto
        Producto producto = productoRepository.findById(request.idProducto())
                .filter(p -> Boolean.TRUE.equals(p.getEstado()))
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Producto no encontrado con id " + request.idProducto()));

        // Buscar reseña activa existente
        Resena resena = resenaRepository
                .findByUsuarioIdUsuarioAndProductoIdProductoAndEstadoTrue(usuario.getIdUsuario(), producto.getIdProducto())
                .orElseGet(() -> {
                    Resena nueva = new Resena();
                    nueva.setUsuario(usuario);
                    nueva.setProducto(producto);
                    nueva.setEstado(true);
                    return nueva;
                });

        // Actualizar campos comunes
        resena.setComentario(request.comentario().trim());
        resena.setPuntuacion(request.puntuacion());
        resena.setFechaCreacion(java.time.LocalDateTime.now());

        // Guardar y forzar flush para que la violación de unicidad se detecte ahora
        Resena guardada = resenaRepository.saveAndFlush(resena);
        return new ResenaResponse(
                guardada.getIdResena(),
                guardada.getProducto().getIdProducto(),
                guardada.getProducto().getNombre(),
                guardada.getUsuario().getIdUsuario(),
                guardada.getUsuario().getNombre(),
                guardada.getComentario(),
                guardada.getPuntuacion(),
                guardada.getFechaCreacion(),
                guardada.getEstado()
        );
    }
}
