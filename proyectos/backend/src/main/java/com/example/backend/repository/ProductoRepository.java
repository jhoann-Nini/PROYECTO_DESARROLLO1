package com.example.backend.repository;

import com.example.backend.entity.Producto;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProductoRepository extends JpaRepository<Producto, Long> {
    /**
     * Carga categoría y marca en la misma consulta para evitar consultas N+1
     * al construir las respuestas del catálogo.
     */
    @EntityGraph(attributePaths = {"categoria", "marca"})
    List<Producto> findByEstadoTrue();

    @EntityGraph(attributePaths = {"categoria", "marca"})
    List<Producto> findByCategoriaIdCategoriaAndEstadoTrue(Long idCategoria);

    @EntityGraph(attributePaths = {"categoria", "marca"})
    List<Producto> findByMarcaIdMarcaAndEstadoTrue(Long idMarca);

    @EntityGraph(attributePaths = {"categoria", "marca"})
    List<Producto> findByIdProductoIn(List<Long> ids);

    @org.springframework.data.jpa.repository.Query("SELECT p FROM Producto p LEFT JOIN FETCH p.categoria LEFT JOIN FETCH p.marca WHERE p.estado = true ORDER BY p.idProducto ASC")
    List<Producto> findAllActivosParaExportar();
}
