package com.example.backend.repository;

import com.example.backend.entity.ReaccionRespuesta;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** «Me gusta» de respuestas (migración 029). */
public interface ReaccionRespuestaRepository extends JpaRepository<ReaccionRespuesta, ReaccionRespuesta.Clave> {

  @Query("SELECT r.idRespuesta, COUNT(r) FROM ReaccionRespuesta r WHERE r.idRespuesta IN :ids GROUP BY r.idRespuesta")
  List<Object[]> contarPorRespuesta(@Param("ids") Collection<Long> ids);

  @Query("SELECT r.idRespuesta FROM ReaccionRespuesta r WHERE r.idUsuario = :idUsuario AND r.idRespuesta IN :ids")
  List<Long> propias(@Param("idUsuario") long idUsuario, @Param("ids") Collection<Long> ids);

  long countByIdRespuesta(Long idRespuesta);

  /** Idempotente y seguro ante clics simultáneos: la PK descarta el duplicado. */
  @Modifying(flushAutomatically = true, clearAutomatically = true)
  @Query(value = "INSERT INTO reaccion_respuesta (id_respuesta, id_usuario, tipo, fecha_creacion)"
    + " VALUES (:id, :idUsuario, 'ME_GUSTA', CURRENT_TIMESTAMP) ON CONFLICT DO NOTHING", nativeQuery = true)
  int darSiNoExiste(@Param("id") long id, @Param("idUsuario") long idUsuario);

  @Modifying(flushAutomatically = true, clearAutomatically = true)
  @Query("DELETE FROM ReaccionRespuesta r WHERE r.idRespuesta = :id AND r.idUsuario = :idUsuario")
  int retirar(@Param("id") long id, @Param("idUsuario") long idUsuario);
}
