package com.example.backend.repository;

import com.example.backend.entity.ApelacionComunidad;
import com.example.backend.entity.EstadoApelacion;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/** Apelaciones de decisiones de moderación de la comunidad (migración 031). */
public interface ApelacionComunidadRepository extends JpaRepository<ApelacionComunidad, Long> {

  List<ApelacionComunidad> findByEstadoOrderByFechaSolicitudAsc(EstadoApelacion estado);

  List<ApelacionComunidad> findByAutorIdUsuario(Long idUsuario);

  Optional<ApelacionComunidad> findByDecisionIdAuditoria(Long idAuditoria);

  long countByEstado(EstadoApelacion estado);
}
