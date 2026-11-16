
package com.example.backend.service;

import com.example.backend.dto.ResenaRequest;
import com.example.backend.dto.ResenaResponse;
import com.example.backend.entity.EstadoModeracion;
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

import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ResenaCreateTransaction {

  private final ResenaRepository resenaRepository;
  private final ProductoRepository productoRepository;
  private final UsuarioService usuarioService;
  private final UsuarioRepository usuarioRepository;
  private final ResenaModerationService resenaModerationService;

  public ResenaCreateTransaction(
    ResenaRepository resenaRepository,
    ProductoRepository productoRepository,
    UsuarioService usuarioService,
    UsuarioRepository usuarioRepository,
    ResenaModerationService resenaModerationService) {

    this.resenaRepository = resenaRepository;
    this.productoRepository = productoRepository;
    this.usuarioService = usuarioService;
    this.usuarioRepository = usuarioRepository;
    this.resenaModerationService = resenaModerationService;
  }

  /**
   * Crea una reseña nueva o actualiza la existente (upsert).
   * Se ejecuta dentro de una transacción REQUIRED.
   * En caso de crear una reseña nueva, aplica el límite
   * de 5 reseñas por hora.
   */
  @Transactional
  public ResenaResponse crearOActualizar(ResenaRequest request, Jwt jwt) {

    // Obtener usuario a partir del JWT.
    Usuario usuario = usuarioService.obtenerUsuarioDesdeJwt(jwt);

    if (!Boolean.TRUE.equals(usuario.getEstado())) {
      throw new ResponseStatusException(
        HttpStatus.FORBIDDEN,
        "Usuario inactivo o suspendido."
      );
    }

    // Obtener y validar producto.
    Producto producto = productoRepository.findById(request.idProducto())
      .filter(p -> Boolean.TRUE.equals(p.getEstado()))
      .orElseThrow(() -> new ResourceNotFoundException(
        "Producto no encontrado con id " + request.idProducto()
      ));

    // Buscar reseña activa existente.
    Optional<Resena> existenteOpt = resenaRepository
      .findByUsuarioIdUsuarioAndProductoIdProductoAndEstadoTrue(
        usuario.getIdUsuario(),
        producto.getIdProducto()
      );

    Resena resena;

    if (existenteOpt.isPresent()) {

      // Actualización: no consume cupo ni altera fechaCreacion.
      resena = existenteOpt.get();

      String comentario = request.comentario().trim();

      resena.setComentario(comentario);
      resena.setPuntuacion(request.puntuacion());

      // Si ya estaba pendiente, conserva ese estado.
      // De lo contrario, analiza el nuevo comentario.
      if (resena.getEstadoModeracion() != EstadoModeracion.PENDIENTE) {
        resena.setEstadoModeracion(
          resenaModerationService.determinarEstado(comentario)
        );
      }

    } else {

      // Creación: serializar por usuario para evitar
      // que la concurrencia supere el límite establecido.
      usuarioRepository.findByIdForUpdate(usuario.getIdUsuario());

      // Verificar cuota de 5 nuevas reseñas en los últimos 60 minutos.
      LocalDateTime ventanaInicio = LocalDateTime.now().minusMinutes(60);

      long nuevasEnVentana = resenaRepository.countNuevasResenasEnVentana(
        usuario.getIdUsuario(),
        ventanaInicio
      );

      if (nuevasEnVentana >= ResenaService.MAX_RESENAS_POR_HORA) {
        throw new TooManyRequestsException(
          ResenaService.MENSAJE_LIMITE_RESENAS
        );
      }

      resena = new Resena();
      resena.setUsuario(usuario);
      resena.setProducto(producto);
      resena.setEstado(true);
      resena.setFechaCreacion(LocalDateTime.now());

      String comentario = request.comentario().trim();

      resena.setComentario(comentario);
      resena.setPuntuacion(request.puntuacion());

      // Analizar el comentario para determinar su estado inicial.
      resena.setEstadoModeracion(
        resenaModerationService.determinarEstado(comentario)
      );
    }

    // Guardar y forzar flush para detectar posibles conflictos de unicidad.
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
      guardada.getEstado(),
      guardada.getEstadoModeracion()
    );
  }
}
