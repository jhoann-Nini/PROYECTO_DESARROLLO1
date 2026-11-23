
package com.example.backend.service;

import com.example.backend.dto.ResenaRequest;
import com.example.backend.entity.EstadoModeracion;
import com.example.backend.entity.Resena;
import com.example.backend.entity.Usuario;
import com.example.backend.entity.Producto;
import com.example.backend.repository.ResenaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ResenaUpdateHelper {

  private final ResenaRepository resenaRepository;
  private final ResenaModerationService resenaModerationService;

  public ResenaUpdateHelper(
    ResenaRepository resenaRepository,
    ResenaModerationService resenaModerationService) {

    this.resenaRepository = resenaRepository;
    this.resenaModerationService = resenaModerationService;
  }

  @Transactional(propagation = Propagation.REQUIRES_NEW)
  public Resena actualizarResenaExistente(
    ResenaRequest request,
    Usuario usuario,
    Producto producto,
    String comentarioLimpio) {

    // Recuperar la reseña activa que provocó el conflicto de unicidad.
    Resena existente = resenaRepository
      .findByUsuarioIdUsuarioAndProductoIdProductoAndEstadoTrue(
        usuario.getIdUsuario(),
        producto.getIdProducto())
      .orElseThrow(() -> new IllegalStateException(
        "Reseña activa no encontrada tras violación de unicidad"));

    existente.setComentario(comentarioLimpio);
    existente.setPuntuacion(request.puntuacion());

    // PENDIENTE se conserva, RECHAZADA vuelve a revisión
    // y PUBLICADA se analiza de nuevo.
    existente.setEstadoModeracion(
      resenaModerationService.estadoTrasEdicion(
        existente.getEstadoModeracion(), comentarioLimpio,
        resenaRepository.comentariosDeOtrasResenasDelAutor(
          usuario.getIdUsuario(), existente.getIdResena()))
    );

    return resenaRepository.save(existente);
  }
}
