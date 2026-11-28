package com.example.backend.repository;

import com.example.backend.entity.AccionModeracionComunidad;
import com.example.backend.entity.ModeracionComunidadAuditoria;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;

/** Auditoría de moderación de la comunidad, de solo inserción. */
public interface ModeracionComunidadAuditoriaRepository extends JpaRepository<ModeracionComunidadAuditoria, Long> {

  List<ModeracionComunidadAuditoria> findByPublicacionIdPublicacionOrderByFechaEventoDesc(Long idPublicacion);

  List<ModeracionComunidadAuditoria> findByRespuestaIdRespuestaOrderByFechaEventoDesc(Long idRespuesta);

  /**
   * Criterio de falta del foro (fase 3, P2): RECHAZAR, ELIMINAR_MODERADOR u
   * OCULTAR sin un RESTAURAR posterior sobre el mismo contenido, sin una
   * apelación ACEPTADA (migración 031). «Posterior» se decide por id, no por
   * fechaEvento (reloj de la JVM), igual que en la 031.
   */
  String FALTA = """
      (a.accion = com.example.backend.entity.AccionModeracionComunidad.RECHAZAR
       OR a.accion = com.example.backend.entity.AccionModeracionComunidad.ELIMINAR_MODERADOR
       OR (a.accion = com.example.backend.entity.AccionModeracionComunidad.OCULTAR AND NOT EXISTS (
           SELECT b.idAuditoria FROM ModeracionComunidadAuditoria b
           WHERE b.accion = com.example.backend.entity.AccionModeracionComunidad.RESTAURAR
             AND (b.publicacion = a.publicacion OR b.respuesta = a.respuesta)
             AND b.idAuditoria > a.idAuditoria)))
      AND NOT EXISTS (
          SELECT ap.idApelacion FROM ApelacionComunidad ap
          WHERE ap.decision = a AND ap.estado = com.example.backend.entity.EstadoApelacion.ACEPTADA)
      """;

  /** Fechas de las faltas del foro del autor desde {@code desde} (incluye contenido eliminado). */
  @Query("SELECT a.fechaEvento FROM ModeracionComunidadAuditoria a LEFT JOIN a.publicacion p LEFT JOIN a.respuesta r"
    + " WHERE (p.autor.idUsuario = :idUsuario OR r.autor.idUsuario = :idUsuario)"
    + " AND a.fechaEvento >= :desde AND " + FALTA + " ORDER BY a.fechaEvento DESC")
  List<LocalDateTime> findFechasFaltasDelAutorDesde(@Param("idUsuario") Long idUsuario, @Param("desde") LocalDateTime desde);

  /**
   * Decisiones de {@code acciones} sobre contenido del autor desde {@code desde},
   * con el contenido y su hilo cargados, de la más reciente a la más antigua.
   */
  @Query("SELECT a FROM ModeracionComunidadAuditoria a LEFT JOIN FETCH a.publicacion p"
    + " LEFT JOIN FETCH a.respuesta r LEFT JOIN FETCH r.publicacion"
    + " WHERE (p.autor.idUsuario = :idUsuario OR r.autor.idUsuario = :idUsuario)"
    + " AND a.accion IN :acciones AND a.fechaEvento >= :desde ORDER BY a.idAuditoria DESC")
  List<ModeracionComunidadAuditoria> findDecisionesDelAutorDesde(@Param("idUsuario") Long idUsuario,
      @Param("acciones") Collection<AccionModeracionComunidad> acciones, @Param("desde") LocalDateTime desde);

  /** Id de la decisión más reciente de {@code acciones} sobre la publicación (por id, como la 031). */
  @Query("SELECT MAX(a.idAuditoria) FROM ModeracionComunidadAuditoria a"
    + " WHERE a.publicacion.idPublicacion = :id AND a.accion IN :acciones")
  Long ultimaDePublicacion(@Param("id") Long idPublicacion,
      @Param("acciones") Collection<AccionModeracionComunidad> acciones);

  /** Id de la decisión más reciente de {@code acciones} sobre la respuesta. */
  @Query("SELECT MAX(a.idAuditoria) FROM ModeracionComunidadAuditoria a"
    + " WHERE a.respuesta.idRespuesta = :id AND a.accion IN :acciones")
  Long ultimaDeRespuesta(@Param("id") Long idRespuesta,
      @Param("acciones") Collection<AccionModeracionComunidad> acciones);

  /** Faltas del foro por autor desde {@code desde}: id de usuario, número de faltas y la más reciente. */
  @Query("SELECT COALESCE(p.autor.idUsuario, r.autor.idUsuario), COUNT(a), MAX(a.fechaEvento)"
    + " FROM ModeracionComunidadAuditoria a LEFT JOIN a.publicacion p LEFT JOIN a.respuesta r"
    + " WHERE a.fechaEvento >= :desde AND " + FALTA
    + " GROUP BY COALESCE(p.autor.idUsuario, r.autor.idUsuario)")
  List<Object[]> contarFaltasPorAutorDesde(@Param("desde") LocalDateTime desde);
}
