package com.example.backend.repository;

import com.example.backend.entity.Apelacion;
import com.example.backend.entity.EstadoApelacion;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ApelacionRepository extends JpaRepository<Apelacion, Long> {

    Optional<Apelacion> findByDecisionIdAuditoria(Long idAuditoria);

    /** Bloqueo pesimista para que dos moderadores no resuelvan la misma apelación. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM Apelacion a WHERE a.idApelacion = :id")
    Optional<Apelacion> findByIdForUpdate(@Param("id") Long id);

    @EntityGraph(attributePaths = {"decision", "decision.resena", "decision.resena.producto",
        "decision.moderador", "autor", "moderador"})
    List<Apelacion> findByEstadoOrderByFechaSolicitudAsc(EstadoApelacion estado);

    List<Apelacion> findByAutorIdUsuario(Long idUsuario);

    long countByEstado(EstadoApelacion estado);
}
