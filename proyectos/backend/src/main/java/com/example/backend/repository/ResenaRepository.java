
package com.example.backend.repository;

import com.example.backend.dto.ResenaStats;
import com.example.backend.dto.ValoracionStats;
import com.example.backend.entity.Resena;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ResenaRepository extends JpaRepository<Resena, Long> {

  // Consulta privada: incluye reseñas pendientes.
  List<Resena> findByUsuarioIdUsuario(Long idUsuario);

  // Evita duplicados incluso cuando la reseña está pendiente.
  Optional<Resena> findByUsuarioIdUsuarioAndProductoIdProductoAndEstadoTrue(
    Long idUsuario, Long idProducto);

  // Listado público general.
  @EntityGraph(attributePaths = {"usuario", "producto"})
  @Query("SELECT r FROM Resena r WHERE r.estado = true " +
    "AND r.ocultaPorReportes = false " +
    "AND r.ocultaPorModeracion = false " +
    "AND r.estadoModeracion = com.example.backend.entity.EstadoModeracion.PUBLICADA " +
    "ORDER BY r.fechaCreacion DESC")
  List<Resena> findByEstadoTrueOrderByFechaCreacionDesc();

  // Alias conservado por compatibilidad con TEC-97.
  @EntityGraph(attributePaths = {"usuario", "producto"})
  @Query("SELECT r FROM Resena r WHERE r.estado = true " +
    "AND r.ocultaPorReportes = false " +
    "AND r.ocultaPorModeracion = false " +
    "AND r.estadoModeracion = com.example.backend.entity.EstadoModeracion.PUBLICADA " +
    "ORDER BY r.fechaCreacion DESC")
  List<Resena> findByEstadoTrueAndOcultaPorReportesFalseOrderByFechaCreacionDesc();

  // Alias conservado por compatibilidad con origin/main.
  @EntityGraph(attributePaths = {"usuario", "producto"})
  @Query("SELECT r FROM Resena r WHERE r.estado = true " +
    "AND r.ocultaPorReportes = false " +
    "AND r.ocultaPorModeracion = false " +
    "AND r.estadoModeracion = com.example.backend.entity.EstadoModeracion.PUBLICADA " +
    "ORDER BY r.fechaCreacion DESC")
  List<Resena> findByEstadoTrueAndOcultaPorReportesFalseAndOcultaPorModeracionFalseOrderByFechaCreacionDesc();

  // Listado público por producto.
  @EntityGraph(attributePaths = {"usuario", "producto"})
  @Query("SELECT r FROM Resena r WHERE r.producto.idProducto = :idProducto " +
    "AND r.estado = true " +
    "AND r.ocultaPorReportes = false " +
    "AND r.ocultaPorModeracion = false " +
    "AND r.estadoModeracion = com.example.backend.entity.EstadoModeracion.PUBLICADA " +
    "ORDER BY r.fechaCreacion DESC")
  List<Resena> findByProductoIdProductoAndEstadoTrueOrderByFechaCreacionDesc(
    @Param("idProducto") Long idProducto);

  // Alias conservado por compatibilidad con TEC-97.
  @EntityGraph(attributePaths = {"usuario", "producto"})
  @Query("SELECT r FROM Resena r WHERE r.producto.idProducto = :idProducto " +
    "AND r.estado = true " +
    "AND r.ocultaPorReportes = false " +
    "AND r.ocultaPorModeracion = false " +
    "AND r.estadoModeracion = com.example.backend.entity.EstadoModeracion.PUBLICADA " +
    "ORDER BY r.fechaCreacion DESC")
  List<Resena> findByProductoIdProductoAndEstadoTrueAndOcultaPorReportesFalseOrderByFechaCreacionDesc(
    @Param("idProducto") Long idProducto);

  // Alias conservado por compatibilidad con origin/main.
  @EntityGraph(attributePaths = {"usuario", "producto"})
  @Query("SELECT r FROM Resena r WHERE r.producto.idProducto = :idProducto " +
    "AND r.estado = true " +
    "AND r.ocultaPorReportes = false " +
    "AND r.ocultaPorModeracion = false " +
    "AND r.estadoModeracion = com.example.backend.entity.EstadoModeracion.PUBLICADA " +
    "ORDER BY r.fechaCreacion DESC")
  List<Resena> findByProductoIdProductoAndEstadoTrueAndOcultaPorReportesFalseAndOcultaPorModeracionFalseOrderByFechaCreacionDesc(
    @Param("idProducto") Long idProducto);

  // Bloqueo pesimista para operaciones de moderación manual.
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT r FROM Resena r JOIN FETCH r.usuario WHERE r.idResena = :idResena")
  Optional<Resena> findByIdForModeration(@Param("idResena") Long idResena);

  // Consulta con detalles para operaciones internas.
  @EntityGraph(attributePaths = {"usuario", "producto"})
  @Query("SELECT r FROM Resena r WHERE r.idResena = :idResena")
  Optional<Resena> findByIdConDetalles(@Param("idResena") Long idResena);

  // Estadísticas públicas: productos más comentados.
  @Query("SELECT new com.example.backend.dto.ResenaStats(r.producto.idProducto, COUNT(r.idResena)) " +
    "FROM Resena r " +
    "WHERE r.estado = true " +
    "AND r.ocultaPorReportes = false " +
    "AND r.ocultaPorModeracion = false " +
    "AND r.estadoModeracion = com.example.backend.entity.EstadoModeracion.PUBLICADA " +
    "AND r.producto.estado = true " +
    "GROUP BY r.producto.idProducto " +
    "ORDER BY COUNT(r.idResena) DESC, r.producto.idProducto ASC")
  List<ResenaStats> findMasComentadosStats(Pageable pageable);

  // Estadísticas públicas: productos mejor valorados.
  @Query("SELECT new com.example.backend.dto.ValoracionStats(r.producto.idProducto, AVG(r.puntuacion), COUNT(r.idResena)) " +
    "FROM Resena r " +
    "WHERE r.producto.estado = true " +
    "AND r.estado = true " +
    "AND r.ocultaPorReportes = false " +
    "AND r.ocultaPorModeracion = false " +
    "AND r.estadoModeracion = com.example.backend.entity.EstadoModeracion.PUBLICADA " +
    "GROUP BY r.producto.idProducto " +
    "ORDER BY AVG(r.puntuacion) DESC, COUNT(r.idResena) DESC, r.producto.idProducto ASC")
  List<ValoracionStats> findMejorValoradosStats(Pageable pageable);

  // Promedio público de valoraciones.
  @Query("SELECT AVG(r.puntuacion) FROM Resena r " +
    "WHERE r.producto.idProducto = :idProducto " +
    "AND r.estado = true " +
    "AND r.ocultaPorReportes = false " +
    "AND r.ocultaPorModeracion = false " +
    "AND r.estadoModeracion = com.example.backend.entity.EstadoModeracion.PUBLICADA")
  Double findPromedioByProducto(@Param("idProducto") Long idProducto);

  // Cantidad de reseñas públicas.
  @Query("SELECT COUNT(r) FROM Resena r " +
    "WHERE r.producto.idProducto = :idProducto " +
    "AND r.estado = true " +
    "AND r.ocultaPorReportes = false " +
    "AND r.ocultaPorModeracion = false " +
    "AND r.estadoModeracion = com.example.backend.entity.EstadoModeracion.PUBLICADA")
  Long countByProducto(@Param("idProducto") Long idProducto);

  // Control de límite por hora: cuenta también las reseñas pendientes.
  @Query("SELECT COUNT(r) FROM Resena r " +
    "WHERE r.usuario.idUsuario = :idUsuario " +
    "AND r.fechaCreacion >= :fechaInicio")
  long countNuevasResenasEnVentana(
    @Param("idUsuario") Long idUsuario,
    @Param("fechaInicio") LocalDateTime fechaInicio);
}
