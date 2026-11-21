package com.example.backend.repository;

import com.example.backend.entity.ReporteOfertaHistorial;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReporteOfertaHistorialRepository
  extends JpaRepository<ReporteOfertaHistorial, Long> {

  @Query("""
    SELECT h FROM ReporteOfertaHistorial h
    JOIN FETCH h.moderador
    WHERE h.reporte.idReporte IN :ids
    ORDER BY h.fechaEvento ASC, h.idHistorial ASC
    """)
  List<ReporteOfertaHistorial> findByReportesConModerador(@Param("ids") Collection<Long> ids);
}
