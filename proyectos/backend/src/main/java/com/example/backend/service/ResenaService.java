package com.example.backend.service;

import com.example.backend.dto.ResenaRequest;
import com.example.backend.dto.ResenaResponse;
import com.example.backend.dto.ResenaUpdateRequest;
import com.example.backend.dto.ModeracionResenaRequest;
import com.example.backend.dto.ResenaModeracionAuditoriaResponse;
import com.example.backend.entity.Producto;
import com.example.backend.entity.Resena;
import com.example.backend.entity.ResenaModeracionAuditoria;
import com.example.backend.entity.Usuario;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.repository.ProductoRepository;
import com.example.backend.repository.ResenaRepository;
import com.example.backend.repository.ResenaModeracionAuditoriaRepository;
import java.time.LocalDateTime;
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
    private final ResenaModeracionAuditoriaRepository moderacionAuditoriaRepository;

    public ResenaService(ResenaRepository resenaRepository,
                         ProductoRepository productoRepository,
                         UsuarioService usuarioService,
                         ResenaUpdateHelper resenaUpdateHelper,
                         ResenaCreateTransaction resenaCreateTransaction,
                         ResenaModeracionAuditoriaRepository moderacionAuditoriaRepository) {
        this.resenaRepository = resenaRepository;
        this.productoRepository = productoRepository;
        this.usuarioService = usuarioService;
        this.resenaUpdateHelper = resenaUpdateHelper;
        this.resenaCreateTransaction = resenaCreateTransaction;
        this.moderacionAuditoriaRepository = moderacionAuditoriaRepository;
    }

    @Transactional(readOnly = true)
    public List<ResenaResponse> listar(Long idProducto) {
        List<Resena> resenas;
        if (idProducto != null) {
            if (!productoRepository.existsById(idProducto)) {
                throw new ResourceNotFoundException("Producto no encontrado con id " + idProducto);
            }
            resenas = resenaRepository.findByProductoIdProductoAndEstadoTrueAndOcultaPorReportesFalseAndOcultaPorModeracionFalseOrderByFechaCreacionDesc(idProducto);
        } else {
            resenas = resenaRepository.findByEstadoTrueAndOcultaPorReportesFalseAndOcultaPorModeracionFalseOrderByFechaCreacionDesc();
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
     * Oculta o restaura manualmente una reseña y registra la decisión en una auditoría append-only.
     * El ocultamiento automático por reportes y el borrado lógico del autor permanecen independientes.
     */
    @Transactional
    public void actualizarOcultamientoModeracion(Long idResena, ModeracionResenaRequest request, Jwt jwt) {
        if (idResena == null || request == null || request.motivo() == null || request.motivo().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La reseña y la justificación son obligatorias.");
        }

        Usuario actor = usuarioService.obtenerUsuarioDesdeJwt(jwt);
        validarUsuarioActivo(actor);
        validarPermisoModeracion(actor);

        Resena resena = resenaRepository.findByIdForModeration(idResena)
                .orElseThrow(() -> new ResourceNotFoundException("Reseña no encontrada con id " + idResena));

        if (resena.getUsuario().getIdUsuario().equals(actor.getIdUsuario())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "No puedes moderar tu propia reseña.");
        }

        boolean ocultamientoActual = Boolean.TRUE.equals(resena.getOcultaPorModeracion());
        if (ocultamientoActual == request.ocultar()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    request.ocultar() ? "La reseña ya está oculta por moderación."
                            : "La reseña no está oculta manualmente.");
        }

        if (request.ocultar() && !Boolean.TRUE.equals(resena.getEstado())) {
            throw new ResourceNotFoundException("No se puede moderar una reseña eliminada por su autor.");
        }

        LocalDateTime ahora = LocalDateTime.now();
        String accion = request.ocultar() ? "OCULTAR" : "RESTAURAR";
        String motivo = request.motivo().trim();

        if (request.ocultar()) {
            resena.setOcultaPorModeracion(true);
            resena.setModeradaPor(actor);
            resena.setFechaModeracion(ahora);
            resena.setMotivoModeracion(motivo);
        } else {
            resena.setOcultaPorModeracion(false);
            resena.setModeradaPor(null);
            resena.setFechaModeracion(null);
            resena.setMotivoModeracion(null);
        }

        ResenaModeracionAuditoria evento = new ResenaModeracionAuditoria();
        evento.setResena(resena);
        evento.setModerador(actor);
        evento.setAccion(accion);
        evento.setMotivo(motivo);
        evento.setFechaEvento(ahora);

        moderacionAuditoriaRepository.saveAndFlush(evento);
        resenaRepository.saveAndFlush(resena);
    }

    @Transactional(readOnly = true)
    public List<ResenaModeracionAuditoriaResponse> listarHistorialModeracion(Long idResena, Jwt jwt) {
        Usuario actor = usuarioService.obtenerUsuarioDesdeJwt(jwt);
        validarUsuarioActivo(actor);
        validarPermisoModeracion(actor);

        if (!resenaRepository.existsById(idResena)) {
            throw new ResourceNotFoundException("Reseña no encontrada con id " + idResena);
        }

        return moderacionAuditoriaRepository.findByResenaIdResenaOrderByFechaEventoDescIdAuditoriaDesc(idResena)
                .stream()
                .map(evento -> new ResenaModeracionAuditoriaResponse(
                        evento.getIdAuditoria(),
                        evento.getResena().getIdResena(),
                        evento.getModerador().getIdUsuario(),
                        evento.getModerador().getNombre(),
                        evento.getAccion(),
                        evento.getMotivo(),
                        evento.getFechaEvento()))
                .toList();
    }

    private void validarPermisoModeracion(Usuario usuario) {
        boolean autorizado = usuario.getRoles() != null && usuario.getRoles().stream()
                .filter(asignacion -> Boolean.TRUE.equals(asignacion.getEstado()))
                .map(asignacion -> asignacion.getRol())
                .anyMatch(rol -> rol != null && rol.getNombre() != null
                        && ("Moderador".equalsIgnoreCase(rol.getNombre())
                        || "Administrador".equalsIgnoreCase(rol.getNombre())));
        if (!autorizado) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Se requiere un rol activo de Moderador o Administrador.");
        }
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
