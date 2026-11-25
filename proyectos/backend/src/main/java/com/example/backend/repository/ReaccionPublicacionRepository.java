package com.example.backend.repository;

import com.example.backend.entity.ReaccionPublicacion;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** «Me gusta» de publicacions (migración 029). */
public interface ReaccionPublicacionRepository extends JpaRepository<ReaccionPublicacion, ReaccionPublicacion.Clave> {

  @Query("SELECT r.idPublicacion, COUNT(r) FROM ReaccionPublicacion r WHERE r.idPublicacion IN :ids GROUP BY r.idPublicacion")
  List<Object[]> contarPorPublicacion(@Param("ids") Collection<Long> ids);

  @Query("SELECT r.idPublicacion FROM ReaccionPublicacion r WHERE r.idUsuario = :idUsuario AND r.idPublicacion IN :ids")
  List<Long> propias(@Param("idUsuario") long idUsuario, @Param("ids") Collection<Long> ids);

  long countByIdPublicacion(Long idPublicacion);

  /** Idempotente y seguro ante clics simultáneos: la PK descarta el duplicado. */
  @Modifying(flushAutomatically = true, clearAutomatically = true)
  @Query(value = "INSERT INTO reaccion_publicacion (id_publicacion, id_usuario, tipo, fecha_creacion)"
    + " VALUES (:id, :idUsuario, 'ME_GUSTA', CURRENT_TIMESTAMP) ON CONFLICT DO NOTHING", nativeQuery = true)
  int darSiNoExiste(@Param("id") long id, @Param("idUsuario") long idUsuario);

  @Modifying(flushAutomatically = true, clearAutomatically = true)
  @Query("DELETE FROM ReaccionPublicacion r WHERE r.idPublicacion = :id AND r.idUsuario = :idUsuario")
  int retirar(@Param("id") long id, @Param("idUsuario") long idUsuario);
}
