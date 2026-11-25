package com.example.backend.repository;

import com.example.backend.entity.EstadoReporte;
import com.example.backend.entity.ReporteComunidad;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Reportes de la comunidad (migración 030). */
public interface ReporteComunidadRepository extends JpaRepository<ReporteComunidad, Long> {

  String ABIERTO = " r.estado IN (com.example.backend.entity.EstadoReporte.PENDIENTE, com.example.backend.entity.EstadoReporte.EN_REVISION) ";

  /** Límite compartido de reportes por hora (LimiteReportesService). */
  long countByUsuarioIdUsuarioAndFechaCreacionAfter(Long idUsuario, LocalDateTime desde);

  @Query("SELECT COUNT(r) > 0 FROM ReporteComunidad r WHERE r.usuario.idUsuario = :idUsuario"
    + " AND r.publicacion.idPublicacion = :id AND" + ABIERTO)
  boolean existeAbiertoDePublicacion(@Param("idUsuario") long idUsuario, @Param("id") long idPublicacion);

  @Query("SELECT COUNT(r) > 0 FROM ReporteComunidad r WHERE r.usuario.idUsuario = :idUsuario"
    + " AND r.respuesta.idRespuesta = :id AND" + ABIERTO)
  boolean existeAbiertoDeRespuesta(@Param("idUsuario") long idUsuario, @Param("id") long idRespuesta);

  List<ReporteComunidad> findByEstadoInOrderByFechaCreacionAsc(Collection<EstadoReporte> estados);

  /** Reportes no rechazados de una publicación: los que cuentan para el umbral de 3. */
  @Query("SELECT COUNT(r) FROM ReporteComunidad r WHERE r.publicacion.idPublicacion = :id"
    + " AND r.estado <> com.example.backend.entity.EstadoReporte.RECHAZADO")
  long contarActivosDePublicacion(@Param("id") long idPublicacion);

  @Query("SELECT COUNT(r) FROM ReporteComunidad r WHERE r.respuesta.idRespuesta = :id"
    + " AND r.estado <> com.example.backend.entity.EstadoReporte.RECHAZADO")
  long contarActivosDeRespuesta(@Param("id") long idRespuesta);
}
