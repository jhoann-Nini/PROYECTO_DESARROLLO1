package com.example.backend.service;

import com.example.backend.dto.ResenaRequest;
import com.example.backend.dto.ResenaResponse;
import com.example.backend.entity.Producto;
import com.example.backend.entity.Resena;
import com.example.backend.entity.Usuario;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.repository.ProductoRepository;
import com.example.backend.repository.ResenaRepository;
import java.util.List;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Orquestador de reseñas. No abre transacciones propias; delega en componentes
 * transaccionales independientes (ResenaCreateTransaction y ResenaUpdateHelper).
 */
@Service
public class ResenaService {

    private final ResenaRepository resenaRepository;
    private final ProductoRepository productoRepository;
    private final UsuarioService usuarioService;
    private final ResenaUpdateHelper resenaUpdateHelper;
    private final ResenaCreateTransaction resenaCreateTransaction;

    public ResenaService(ResenaRepository resenaRepository,
                         ProductoRepository productoRepository,
                         UsuarioService usuarioService,
                         ResenaUpdateHelper resenaUpdateHelper,
                         ResenaCreateTransaction resenaCreateTransaction) {
        this.resenaRepository = resenaRepository;
        this.productoRepository = productoRepository;
        this.usuarioService = usuarioService;
        this.resenaUpdateHelper = resenaUpdateHelper;
        this.resenaCreateTransaction = resenaCreateTransaction;
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

    /**
     * Orquestador que delega la lógica de creación/actualización a componentes transaccionales separados.
     */
    public ResenaResponse crearOActualizar(ResenaRequest request, Jwt jwt) {
        try {
            return resenaCreateTransaction.crearOActualizar(request, jwt);
        } catch (org.springframework.dao.DataIntegrityViolationException ex) {
            // Identificar la violación concreta del índice único parcial
            String constraintName = null;
            Throwable cause = ex.getCause();
            if (cause instanceof org.hibernate.exception.ConstraintViolationException cve) {
                constraintName = cve.getConstraintName();
            }
            if ("uk_resena_usuario_producto_activa".equals(constraintName)) {
                // Recuperar y actualizar en nueva transacción
                Usuario usuario = usuarioService.obtenerUsuarioDesdeJwt(jwt);
                Producto producto = productoRepository.findById(request.idProducto())
                        .filter(p -> Boolean.TRUE.equals(p.getEstado()))
                        .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado con id " + request.idProducto()));
                String comentarioLimpio = request.comentario().trim();
                Resena actualizada = resenaUpdateHelper.actualizarResenaExistente(request, usuario, producto, comentarioLimpio);
                return toResponse(actualizada);
            }
            // Propagar cualquier otro error de integridad
            throw ex;
        }
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
