package com.example.backend.repository;

import com.example.backend.entity.Resena;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ResenaRepository extends JpaRepository<Resena, Long> {
    List<Resena> findByProductoIdProducto(Long idProducto);
    List<Resena> findByUsuarioIdUsuario(Long idUsuario);
}
