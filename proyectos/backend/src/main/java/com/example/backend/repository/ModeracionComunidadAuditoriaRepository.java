package com.example.backend.repository;

import com.example.backend.entity.ModeracionComunidadAuditoria;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/** Auditoría de moderación de la comunidad, de solo inserción. */
public interface ModeracionComunidadAuditoriaRepository extends JpaRepository<ModeracionComunidadAuditoria, Long> {

  List<ModeracionComunidadAuditoria> findByPublicacionIdPublicacionOrderByFechaEventoDesc(Long idPublicacion);

  List<ModeracionComunidadAuditoria> findByRespuestaIdRespuestaOrderByFechaEventoDesc(Long idRespuesta);
}
