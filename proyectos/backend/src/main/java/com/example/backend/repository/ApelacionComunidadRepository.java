package com.example.backend.repository;

import com.example.backend.entity.ApelacionComunidad;
import com.example.backend.entity.EstadoApelacion;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Apelaciones de decisiones de moderación de la comunidad (migración 031). */
public interface ApelacionComunidadRepository extends JpaRepository<ApelacionComunidad, Long> {

  List<ApelacionComunidad> findByEstadoOrderByFechaSolicitudAsc(EstadoApelacion estado);

  List<ApelacionComunidad> findByAutorIdUsuario(Long idUsuario);

  Optional<ApelacionComunidad> findByDecisionIdAuditoria(Long idAuditoria);

  long countByEstado(EstadoApelacion estado);

  /** Bloqueo pesimista: dos moderadoras que resuelven la misma apelación se ponen en fila. */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT a FROM ApelacionComunidad a WHERE a.idApelacion = :id")
  Optional<ApelacionComunidad> findByIdForUpdate(@Param("id") Long id);

  /** Cola de moderación con todo lo que muestra, en una sola consulta. */
  @Query("SELECT ap FROM ApelacionComunidad ap JOIN FETCH ap.autor JOIN FETCH ap.decision d"
    + " JOIN FETCH d.moderador LEFT JOIN FETCH d.publicacion LEFT JOIN FETCH d.respuesta r"
    + " LEFT JOIN FETCH r.publicacion LEFT JOIN FETCH ap.moderador"
    + " WHERE ap.estado = :estado ORDER BY ap.fechaSolicitud ASC, ap.idApelacion ASC")
  List<ApelacionComunidad> colaPorEstado(@Param("estado") EstadoApelacion estado);
}
