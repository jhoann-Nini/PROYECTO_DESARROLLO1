package com.example.backend.service;

import com.example.backend.dto.ResenaRequest;
import com.example.backend.dto.ResenaResponse;
import com.example.backend.entity.Producto;
import com.example.backend.entity.Resena;
import com.example.backend.entity.Usuario;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.exception.TooManyRequestsException;
import com.example.backend.repository.ProductoRepository;
import com.example.backend.repository.ResenaRepository;
import com.example.backend.repository.UsuarioRepository;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    private final UsuarioRepository usuarioRepository;

    public ResenaCreateTransaction(ResenaRepository resenaRepository,
                                   ProductoRepository productoRepository,
                                   UsuarioService usuarioService,
                                   UsuarioRepository usuarioRepository) {
        this.resenaRepository = resenaRepository;
        this.productoRepository = productoRepository;
        this.usuarioService = usuarioService;
        this.usuarioRepository = usuarioRepository;
    }

    /**
     * Crea una reseña nueva o actualiza la existente (upsert).
     * Se ejecuta con propagación REQUIRED para participar en la transacción del invocador si existe,
     * o iniciar una nueva transacción física en peticiones HTTP normales.
     * En caso de crear una nueva reseña, aplica el límite de 5 reseñas por hora (HTTP 429).
     */
    @Transactional
    public ResenaResponse crearOActualizar(ResenaRequest request, Jwt jwt) {
        // Obtener usuario a partir del JWT
        Usuario usuario = usuarioService.obtenerUsuarioDesdeJwt(jwt);
        if (!Boolean.TRUE.equals(usuario.getEstado())) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Usuario inactivo o suspendido.");
        }

        // Obtener y validar producto
        Producto producto = productoRepository.findById(request.idProducto())
                .filter(p -> Boolean.TRUE.equals(p.getEstado()))
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Producto no encontrado con id " + request.idProducto()));

        // Buscar reseña activa existente
        Optional<Resena> existenteOpt = resenaRepository
                .findByUsuarioIdUsuarioAndProductoIdProductoAndEstadoTrue(usuario.getIdUsuario(), producto.getIdProducto());

        Resena resena;
        if (existenteOpt.isPresent()) {
            // Actualización (upsert): no consume cupo ni altera fechaCreacion
            resena = existenteOpt.get();
            resena.setComentario(request.comentario().trim());
            resena.setPuntuacion(request.puntuacion());
        } else {
            // Creación de nueva reseña: serializar por usuario para garantizar atomicidad y evitar que concurrencia supere el límite
            usuarioRepository.findByIdForUpdate(usuario.getIdUsuario());

            // Verificar cuota de 5 nuevas reseñas en la ventana móvil de 60 minutos
            LocalDateTime ventanaInicio = LocalDateTime.now().minusMinutes(60);
            long nuevasEnVentana = resenaRepository.countNuevasResenasEnVentana(usuario.getIdUsuario(), ventanaInicio);

            if (nuevasEnVentana >= ResenaService.MAX_RESENAS_POR_HORA) {
                throw new TooManyRequestsException(ResenaService.MENSAJE_LIMITE_RESENAS);
            }

            resena = new Resena();
            resena.setUsuario(usuario);
            resena.setProducto(producto);
            resena.setEstado(true);
            resena.setFechaCreacion(LocalDateTime.now());
            resena.setComentario(request.comentario().trim());
            resena.setPuntuacion(request.puntuacion());
        }

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
