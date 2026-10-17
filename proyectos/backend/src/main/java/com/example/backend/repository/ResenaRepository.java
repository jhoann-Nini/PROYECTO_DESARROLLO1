package com.example.backend.repository;

import com.example.backend.entity.Resena;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ResenaRepository extends JpaRepository<Resena, Long> {
    List<Resena> findByProductoIdProducto(Long idProducto);
    List<Resena> findByUsuarioIdUsuario(Long idUsuario);

    @EntityGraph(attributePaths = {"usuario", "producto"})
    List<Resena> findByEstadoTrueOrderByFechaCreacionDesc();

    @EntityGraph(attributePaths = {"usuario", "producto"})
    List<Resena> findByProductoIdProductoAndEstadoTrueOrderByFechaCreacionDesc(Long idProducto);

    Optional<Resena> findByUsuarioIdUsuarioAndProductoIdProductoAndEstadoTrue(Long idUsuario, Long idProducto);
}

