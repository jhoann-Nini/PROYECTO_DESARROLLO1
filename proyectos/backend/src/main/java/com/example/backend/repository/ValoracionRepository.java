package com.example.backend.repository;

import com.example.backend.dto.ValoracionStats;
import com.example.backend.entity.Valoracion;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface ValoracionRepository extends JpaRepository<Valoracion, Long> {
    List<Valoracion> findByProductoIdProducto(Long idProducto);

    List<Valoracion> findByProductoIdProductoAndEstadoTrue(Long idProducto);

    Optional<Valoracion> findByUsuarioIdUsuarioAndProductoIdProductoAndEstadoTrue(Long idUsuario, Long idProducto);

    @Query("SELECT new com.example.backend.dto.ValoracionStats(v.producto.idProducto, AVG(v.puntuacion), COUNT(v.idValoracion)) " +
           "FROM Valoracion v " +
           "WHERE v.producto.estado = true AND v.estado = true " +
           "GROUP BY v.producto.idProducto " +
           "ORDER BY AVG(v.puntuacion) DESC, COUNT(v.idValoracion) DESC, v.producto.idProducto ASC")
    List<ValoracionStats> findMejorValoradosStats(Pageable pageable);

    /**
     * Retorna el promedio de puntuación y el total de valoraciones activas para un producto específico.
     * Se utiliza para el endpoint público de estadísticas de valoración por producto.
     */
    @Query("SELECT AVG(v.puntuacion) FROM Valoracion v WHERE v.producto.idProducto = :idProducto AND v.estado = true")
    Double findPromedioByProducto(Long idProducto);

    @Query("SELECT COUNT(v) FROM Valoracion v WHERE v.producto.idProducto = :idProducto AND v.estado = true")
    Long countByProducto(Long idProducto);
}
