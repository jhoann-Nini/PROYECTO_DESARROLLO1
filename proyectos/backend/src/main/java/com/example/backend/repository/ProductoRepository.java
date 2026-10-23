package com.example.backend.repository;

import com.example.backend.entity.Producto;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProductoRepository extends JpaRepository<Producto, Long> {
    @EntityGraph(attributePaths = {"categoria", "marca"})
    List<Producto> findByEstadoTrue();

    @EntityGraph(attributePaths = {"categoria", "marca"})
    List<Producto> findByCategoriaIdCategoriaAndEstadoTrue(Long idCategoria);

    @EntityGraph(attributePaths = {"categoria", "marca"})
    List<Producto> findByMarcaIdMarcaAndEstadoTrue(Long idMarca);

    @EntityGraph(attributePaths = {"categoria", "marca"})
    List<Producto> findByIdProductoIn(List<Long> ids);
}
