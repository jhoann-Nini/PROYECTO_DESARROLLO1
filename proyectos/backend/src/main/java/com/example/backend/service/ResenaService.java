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
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Servicio de negocio para la consulta, registro, actualización y eliminación de reseñas de productos.
 * Para el registro y actualización por producto/usuario, delega en componentes transaccionales
 * independientes (ResenaCreateTransaction y ResenaUpdateHelper) para garantizar la concurrencia.
 */
@Service
public class ResenaService {

    public static final int MAX_RESENAS_POR_HORA = 5;
    public static final String MENSAJE_LIMITE_RESENAS = "Has alcanzado el límite de 5 reseñas por hora. Intenta de nuevo más tarde.";

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
            resenas = resenaRepository.findByProductoIdProductoAndEstadoTrueAndOcultaPorReportesFalseOrderByFechaCreacionDesc(idProducto);
        } else {
            resenas = resenaRepository.findByEstadoTrueAndOcultaPorReportesFalseOrderByFechaCreacionDesc();
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
        validarUsuarioActivo(usuario);
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
        validarUsuarioActivo(usuario);

        Resena resena = resenaRepository.findById(idResena)
                .filter(r -> Boolean.TRUE.equals(r.getEstado()))
                .orElseThrow(() -> new ResourceNotFoundException("Reseña no encontrada con id " + idResena));

        if (idProducto != null && !resena.getProducto().getIdProducto().equals(idProducto)) {
            throw new ResourceNotFoundException("Reseña no encontrada con id " + idResena + " para el producto con id " + idProducto);
        }

        // S2-19: Verificar que el usuario autenticado sea el autor de la reseña
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
        validarUsuarioActivo(usuario);

        Resena resena = resenaRepository.findById(idResena)
                .filter(r -> Boolean.TRUE.equals(r.getEstado()))
                .orElseThrow(() -> new ResourceNotFoundException("Reseña no encontrada con id " + idResena));

        if (idProducto != null && !resena.getProducto().getIdProducto().equals(idProducto)) {
            throw new ResourceNotFoundException("Reseña no encontrada con id " + idResena + " para el producto con id " + idProducto);
        }

        boolean esAutor = resena.getUsuario().getIdUsuario().equals(usuario.getIdUsuario());
        boolean esAdmin = usuario.getRoles() != null
                && usuario.getRoles().stream()
                        .anyMatch(asignacion ->
                                Boolean.TRUE.equals(asignacion.getEstado())
                                && asignacion.getRol() != null
                                && "Administrador".equalsIgnoreCase(asignacion.getRol().getNombre())
                        );

        if (!esAutor && !esAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No tienes permiso para eliminar esta reseña.");
        }

        resena.setEstado(false);
        resenaRepository.save(resena);
    }

    /**
     * S2-19: Valida que el usuario se encuentre activo en la plataforma.
     */
    private void validarUsuarioActivo(Usuario usuario) {
        if (!Boolean.TRUE.equals(usuario.getEstado())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Usuario inactivo o suspendido.");
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
