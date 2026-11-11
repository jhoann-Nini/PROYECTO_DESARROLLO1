package com.example.backend.repository;

import com.example.backend.entity.EstadoReporte;
import com.example.backend.entity.ReporteResena;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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
     * Obtiene todos los reportes con los datos completos de la reseña, producto, autor y reportante.
     */
    @EntityGraph(attributePaths = {"resena", "resena.producto", "resena.usuario", "usuario"})
    @Query("SELECT r FROM ReporteResena r ORDER BY r.fechaCreacion DESC")
    List<ReporteResena> findAllConDetalles();

    /**
     * Obtiene reportes filtrados por estado con los datos completos asociados.
     */
    @EntityGraph(attributePaths = {"resena", "resena.producto", "resena.usuario", "usuario"})
    @Query("SELECT r FROM ReporteResena r WHERE r.estado = :estado ORDER BY r.fechaCreacion DESC")
    List<ReporteResena> findByEstadoConDetalles(@Param("estado") EstadoReporte estado);

    /**
     * Obtiene un reporte por su ID con todas sus relaciones asociadas cargadas.
     */
    @EntityGraph(attributePaths = {"resena", "resena.producto", "resena.usuario", "usuario"})
    @Query("SELECT r FROM ReporteResena r WHERE r.idReporte = :idReporte")
    java.util.Optional<ReporteResena> findByIdConDetalles(@Param("idReporte") Long idReporte);

    /**
     * Obtiene los reportes de una reseña específica ordenados descendentemente.
     */
    @EntityGraph(attributePaths = {"resena", "resena.producto", "resena.usuario", "usuario"})
    List<ReporteResena> findByResenaIdResenaOrderByFechaCreacionDesc(Long idResena);

    /**
     * Cuenta los reportes de una reseña cuyo estado sea diferente al indicado.
     */
    long countByResenaIdResenaAndEstadoNot(Long idResena, EstadoReporte estado);
}
