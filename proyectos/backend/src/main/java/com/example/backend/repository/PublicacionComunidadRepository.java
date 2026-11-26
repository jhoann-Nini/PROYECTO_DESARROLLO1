package com.example.backend.repository;

import com.example.backend.entity.PublicacionComunidad;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Publicaciones de la comunidad. Las listas son por cursor (keyset): la
 * primera página usa un cursor «infinito» en lugar de un parámetro nulo, para
 * que PostgreSQL no tenga que inferir el tipo de un null.
 */
public interface PublicacionComunidadRepository extends JpaRepository<PublicacionComunidad, Long> {

  String VISIBLE = " p.eliminada = false AND p.estadoModeracion = com.example.backend.entity.EstadoModeracion.PUBLICADA"
    + " AND p.ocultaPorModeracion = false AND p.ocultaPorReportes = false ";

  @Query("SELECT p FROM PublicacionComunidad p WHERE p.tipo = com.example.backend.entity.TipoPublicacion.GENERAL AND"
    + VISIBLE + "AND (p.fechaUltimaActividad < :fecha OR (p.fechaUltimaActividad = :fecha AND p.idPublicacion < :id))"
    + " ORDER BY p.fechaUltimaActividad DESC, p.idPublicacion DESC")
  List<PublicacionComunidad> generalesPorActividad(
    @Param("fecha") LocalDateTime fecha, @Param("id") long id, Pageable pagina);

  @Query("SELECT p FROM PublicacionComunidad p WHERE p.tipo = com.example.backend.entity.TipoPublicacion.GENERAL AND"
    + VISIBLE + "AND (p.fechaCreacion < :fecha OR (p.fechaCreacion = :fecha AND p.idPublicacion < :id))"
    + " ORDER BY p.fechaCreacion DESC, p.idPublicacion DESC")
  List<PublicacionComunidad> generalesRecientes(
    @Param("fecha") LocalDateTime fecha, @Param("id") long id, Pageable pagina);

  @Query("SELECT p FROM PublicacionComunidad p WHERE p.producto.idProducto = :idProducto AND"
    + VISIBLE + "AND (p.fechaUltimaActividad < :fecha OR (p.fechaUltimaActividad = :fecha AND p.idPublicacion < :id))"
    + " ORDER BY p.fechaUltimaActividad DESC, p.idPublicacion DESC")
  List<PublicacionComunidad> deProductoPorActividad(@Param("idProducto") long idProducto,
    @Param("fecha") LocalDateTime fecha, @Param("id") long id, Pageable pagina);

  @Query("SELECT p FROM PublicacionComunidad p WHERE p.producto.idProducto = :idProducto AND"
    + VISIBLE + "AND (p.fechaCreacion < :fecha OR (p.fechaCreacion = :fecha AND p.idPublicacion < :id))"
    + " ORDER BY p.fechaCreacion DESC, p.idPublicacion DESC")
  List<PublicacionComunidad> deProductoRecientes(@Param("idProducto") long idProducto,
    @Param("fecha") LocalDateTime fecha, @Param("id") long id, Pageable pagina);

  @Query("SELECT COUNT(p) FROM PublicacionComunidad p WHERE p.tipo = com.example.backend.entity.TipoPublicacion.GENERAL AND" + VISIBLE)
  long contarGeneralesVisibles();

  @Query("SELECT COUNT(p) FROM PublicacionComunidad p WHERE p.producto.idProducto = :idProducto AND" + VISIBLE)
  long contarVisiblesDeProducto(@Param("idProducto") long idProducto);

  /**
   * Actividad de una respuesta visible, sin cargar ni reescribir la fila
   * entera. Nunca retrocede si otra respuesta ya dejó una fecha posterior.
   */
  @Modifying(flushAutomatically = true)
  @Query("UPDATE PublicacionComunidad p SET p.fechaUltimaActividad = :fecha"
    + " WHERE p.idPublicacion = :id AND p.fechaUltimaActividad < :fecha")
  int registrarActividad(@Param("id") long id, @Param("fecha") LocalDateTime fecha);

  /** Cuota (RN-14): cuenta también las eliminadas. */
  @Query("SELECT COUNT(p) FROM PublicacionComunidad p WHERE p.autor.idUsuario = :idAutor AND p.fechaCreacion >= :desde")
  long contarDelAutorDesde(@Param("idAutor") long idAutor, @Param("desde") LocalDateTime desde);
}
