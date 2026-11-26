package com.example.backend.repository;

import com.example.backend.entity.ReporteComunidadHistorial;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/** Historial de solo inserción de los reportes de la comunidad. */
public interface ReporteComunidadHistorialRepository extends JpaRepository<ReporteComunidadHistorial, Long> {

  List<ReporteComunidadHistorial> findByReporteIdReporteOrderByFechaEventoAsc(Long idReporte);
}
