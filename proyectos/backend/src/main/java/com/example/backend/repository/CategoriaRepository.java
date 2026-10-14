package com.example.backend.repository;

import com.example.backend.entity.Categoria;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface CategoriaRepository extends JpaRepository<Categoria, Long> {
    List<Categoria> findByEstadoTrue();
}
