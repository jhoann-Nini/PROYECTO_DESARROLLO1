package com.example.backend.service;

import com.example.backend.dto.ResenaRequest;
import com.example.backend.entity.Resena;
import com.example.backend.entity.Usuario;
import com.example.backend.entity.Producto;
import com.example.backend.repository.ResenaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Helper service that runs the update of a Resena in a NEW transaction.
 * This is required because internal method calls do not go through the Spring proxy,
 * so a @Transactional(REQUIRES_NEW) on a private method would be ignored.
 */
@Service
public class ResenaUpdateHelper {

    private final ResenaRepository resenaRepository;

    public ResenaUpdateHelper(ResenaRepository resenaRepository) {
        this.resenaRepository = resenaRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Resena actualizarResenaExistente(ResenaRequest request, Usuario usuario, Producto producto, String comentarioLimpio) {
        // Retrieve the already persisted active review (must exist because the unique constraint fired)
        Resena existente = resenaRepository
                .findByUsuarioIdUsuarioAndProductoIdProductoAndEstadoTrue(usuario.getIdUsuario(), producto.getIdProducto())
                .orElseThrow(() -> new IllegalStateException("Reseña activa no encontrada tras violación de unicidad"));
        existente.setComentario(comentarioLimpio);
        existente.setPuntuacion(request.puntuacion());
        existente.setFechaCreacion(java.time.LocalDateTime.now());
        return resenaRepository.save(existente);
    }
}
