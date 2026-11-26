package com.example.backend.repository;

import com.example.backend.entity.RespuestaComunidad;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Respuestas de la comunidad: un nivel por consulta, en orden de creación. */
public interface RespuestaComunidadRepository extends JpaRepository<RespuestaComunidad, Long> {

  String VISIBLE = " r.eliminada = false AND r.estadoModeracion = com.example.backend.entity.EstadoModeracion.PUBLICADA"
    + " AND r.ocultaPorModeracion = false AND r.ocultaPorReportes = false ";

  @Query("SELECT r FROM RespuestaComunidad r WHERE r.publicacion.idPublicacion = :idPublicacion AND r.padre IS NULL"
    + " AND (r.fechaCreacion > :fecha OR (r.fechaCreacion = :fecha AND r.idRespuesta > :id))"
    + " ORDER BY r.fechaCreacion ASC, r.idRespuesta ASC")
  List<RespuestaComunidad> directas(@Param("idPublicacion") long idPublicacion,
    @Param("fecha") LocalDateTime fecha, @Param("id") long id, Pageable pagina);

  @Query("SELECT r FROM RespuestaComunidad r WHERE r.publicacion.idPublicacion = :idPublicacion AND r.padre.idRespuesta = :padre"
    + " AND (r.fechaCreacion > :fecha OR (r.fechaCreacion = :fecha AND r.idRespuesta > :id))"
    + " ORDER BY r.fechaCreacion ASC, r.idRespuesta ASC")
  List<RespuestaComunidad> hijas(@Param("idPublicacion") long idPublicacion, @Param("padre") long padre,
    @Param("fecha") LocalDateTime fecha, @Param("id") long id, Pageable pagina);

  /** Respuestas visibles por publicación, para los conteos de las listas. */
  @Query("SELECT r.publicacion.idPublicacion, COUNT(r) FROM RespuestaComunidad r"
    + " WHERE r.publicacion.idPublicacion IN :ids AND" + VISIBLE + "GROUP BY r.publicacion.idPublicacion")
  List<Object[]> contarVisiblesPorPublicacion(@Param("ids") Collection<Long> ids);

  /**
   * Hijas por respuesta, incluidas las no visibles: una hija eliminada
   * conserva su lugar y también se muestra (RN-10).
   */
  @Query("SELECT r.padre.idRespuesta, COUNT(r) FROM RespuestaComunidad r"
    + " WHERE r.padre.idRespuesta IN :ids GROUP BY r.padre.idRespuesta")
  List<Object[]> contarHijasPorRespuesta(@Param("ids") Collection<Long> ids);

  /** Cuota (RN-14): cuenta también las eliminadas. */
  @Query("SELECT COUNT(r) FROM RespuestaComunidad r WHERE r.autor.idUsuario = :idAutor AND r.fechaCreacion >= :desde")
  long contarDelAutorDesde(@Param("idAutor") long idAutor, @Param("desde") LocalDateTime desde);
}
