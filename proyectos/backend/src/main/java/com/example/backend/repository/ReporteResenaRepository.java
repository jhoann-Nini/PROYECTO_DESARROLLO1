package com.example.backend.repository;

import com.example.backend.entity.ReporteResena;
import java.util.List;
import java.util.Optional;
import com.example.backend.entity.EstadoReporte;
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

    /**
     * Bandeja de moderación filtrada por estado, con las relaciones necesarias para la respuesta.
     */
    @EntityGraph(attributePaths = {"resena", "usuario"})
    List<ReporteResena> findByEstadoOrderByFechaCreacionAsc(EstadoReporte estado);

    /**
     * Consulta un reporte y carga sus relaciones para aplicar las reglas de moderación.
     */
    @EntityGraph(attributePaths = {"resena", "usuario"})
    Optional<ReporteResena> findWithResenaAndUsuarioByIdReporte(Long idReporte);
}

