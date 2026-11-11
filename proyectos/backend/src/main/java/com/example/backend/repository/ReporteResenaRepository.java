package com.example.backend.repository;

import com.example.backend.entity.ReporteResena;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReporteResenaRepository extends JpaRepository<ReporteResena, Long> {

    /**
     * Verifica si ya existe un reporte registrado por un usuario para una reseña específica.
     */
    boolean existsByUsuarioIdUsuarioAndResenaIdResena(Long idUsuario, Long idResena);

    /**
     * Obtiene todos los reportes emitidos por un usuario ordenados descendentemente por fecha de creación.
     */
    @EntityGraph(attributePaths = {"resena"})
    List<ReporteResena> findByUsuarioIdUsuarioOrderByFechaCreacionDesc(Long idUsuario);
}

