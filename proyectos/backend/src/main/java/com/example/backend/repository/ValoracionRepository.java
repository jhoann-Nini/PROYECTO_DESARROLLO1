package com.example.backend.repository;

import com.example.backend.entity.Valoracion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ValoracionRepository extends JpaRepository<Valoracion, Long> {
    List<Valoracion> findByProductoIdProducto(Long idProducto);
}
