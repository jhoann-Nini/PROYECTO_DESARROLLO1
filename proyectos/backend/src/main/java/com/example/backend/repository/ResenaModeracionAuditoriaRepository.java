package com.example.backend.repository;

import com.example.backend.entity.ResenaModeracionAuditoria;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ResenaModeracionAuditoriaRepository
        extends JpaRepository<ResenaModeracionAuditoria, Long> {

    @EntityGraph(attributePaths = {"moderador"})
    List<ResenaModeracionAuditoria> findByResenaIdResenaOrderByFechaEventoDescIdAuditoriaDesc(Long idResena);
}
