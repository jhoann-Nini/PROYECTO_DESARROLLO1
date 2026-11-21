package com.example.backend.repository;

import com.example.backend.entity.EstadoReporte;
import com.example.backend.entity.ReporteOferta;
import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReporteOfertaRepository
  extends JpaRepository<ReporteOferta, Long> {

  /** Un usuario solo puede tener un reporte abierto por oferta (migración 021). */
  boolean existsByUsuarioIdUsuarioAndProductoIdProductoAndEstablecimientoIdEstablecimientoAndEstadoIn(
    Long idUsuario, Long idProducto, Long idEstablecimiento, Collection<EstadoReporte> estados);

  /** Base del límite de reportes por hora. */
  long countByUsuarioIdUsuarioAndFechaCreacionAfter(Long idUsuario, LocalDateTime desde);

  @Query("""
    SELECT r FROM ReporteOferta r
    JOIN FETCH r.producto
    JOIN FETCH r.establecimiento
    JOIN FETCH r.usuario
    ORDER BY r.fechaCreacion ASC, r.idReporte ASC
    """)
  List<ReporteOferta> findAllConDetalles();

  @Query("""
    SELECT r FROM ReporteOferta r
    JOIN FETCH r.producto
    JOIN FETCH r.establecimiento
    JOIN FETCH r.usuario
    WHERE r.estado = :estado
    ORDER BY r.fechaCreacion ASC, r.idReporte ASC
    """)
  List<ReporteOferta> findByEstadoConDetalles(@Param("estado") EstadoReporte estado);

  /** Bloqueo pesimista para que dos moderadores no decidan a la vez. */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("""
    SELECT r FROM ReporteOferta r
    JOIN FETCH r.producto
    JOIN FETCH r.establecimiento
    JOIN FETCH r.usuario
    WHERE r.idReporte = :idReporte
    """)
  Optional<ReporteOferta> findByIdForUpdate(@Param("idReporte") Long idReporte);

  @Query("""
    SELECT r FROM ReporteOferta r
    JOIN FETCH r.producto
    JOIN FETCH r.establecimiento
    JOIN FETCH r.usuario
    WHERE r.idReporte = :idReporte
    """)
  Optional<ReporteOferta> findByIdConDetalles(@Param("idReporte") Long idReporte);
}
