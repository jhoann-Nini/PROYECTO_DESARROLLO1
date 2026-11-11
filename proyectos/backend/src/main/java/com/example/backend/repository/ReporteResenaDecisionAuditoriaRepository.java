package com.example.backend.repository;

import com.example.backend.entity.ReporteResenaDecisionAuditoria;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReporteResenaDecisionAuditoriaRepository
        extends JpaRepository<ReporteResenaDecisionAuditoria, Long> {

    @EntityGraph(attributePaths = {"moderador"})
    List<ReporteResenaDecisionAuditoria> findByReporteIdReporteOrderByFechaEventoDesc(Long idReporte);
}
