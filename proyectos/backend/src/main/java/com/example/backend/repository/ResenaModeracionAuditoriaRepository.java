package com.example.backend.repository;

import com.example.backend.entity.ResenaModeracionAuditoria;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ResenaModeracionAuditoriaRepository
        extends JpaRepository<ResenaModeracionAuditoria, Long> {

    @EntityGraph(attributePaths = {"moderador"})
    List<ResenaModeracionAuditoria> findByResenaIdResenaOrderByFechaEventoDescIdAuditoriaDesc(Long idResena);

    /**
     * Caso 6, reincidencia: fechas de las faltas del autor desde {@code desde}.
     * Falta = RECHAZAR, u OCULTAR sin un RESTAURAR posterior en la misma
     * reseña. Incluye reseñas eliminadas por su autor.
     */
    @Query("""
        SELECT a.fechaEvento FROM ResenaModeracionAuditoria a
        WHERE a.resena.usuario.idUsuario = :idUsuario
          AND a.fechaEvento >= :desde
          AND (a.accion = 'RECHAZAR'
               OR (a.accion = 'OCULTAR' AND NOT EXISTS (
                   SELECT b.idAuditoria FROM ResenaModeracionAuditoria b
                   WHERE b.resena = a.resena AND b.accion = 'RESTAURAR'
                     AND (b.fechaEvento > a.fechaEvento
                          OR (b.fechaEvento = a.fechaEvento AND b.idAuditoria > a.idAuditoria)))))
        ORDER BY a.fechaEvento DESC
        """)
    List<LocalDateTime> findFechasFaltasDelAutorDesde(
        @Param("idUsuario") Long idUsuario, @Param("desde") LocalDateTime desde);
}
