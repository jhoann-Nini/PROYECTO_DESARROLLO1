package com.example.backend.repository;

import com.example.backend.dto.ResenaStats;
import com.example.backend.entity.Resena;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
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

    @Query("SELECT new com.example.backend.dto.ResenaStats(r.producto.idProducto, COUNT(r.idResena)) " +
           "FROM Resena r " +
           "WHERE r.estado = true AND r.producto.estado = true " +
           "GROUP BY r.producto.idProducto " +
           "ORDER BY COUNT(r.idResena) DESC, r.producto.idProducto ASC")
    List<ResenaStats> findMasComentadosStats(Pageable pageable);
}

