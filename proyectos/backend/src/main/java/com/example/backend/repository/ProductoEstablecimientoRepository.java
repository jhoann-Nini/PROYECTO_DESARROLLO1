
package com.example.backend.repository;

import com.example.backend.dto.ResumenOfertasProductoResponse;
import com.example.backend.entity.ProductoEstablecimiento;
import com.example.backend.entity.ProductoEstablecimientoId;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductoEstablecimientoRepository
  extends JpaRepository<ProductoEstablecimiento, ProductoEstablecimientoId> {

  // Consulta existente: ofertas para los rankings.
  @Query("SELECT pe FROM ProductoEstablecimiento pe " +
    "JOIN FETCH pe.producto p " +
    "JOIN FETCH p.categoria c " +
    "JOIN FETCH p.marca m " +
    "JOIN FETCH pe.establecimiento e " +
    "WHERE p.estado = true " +
    "  AND e.estado = true " +
    "  AND pe.disponibilidad = true " +
    "  AND p.precioReferencia IS NOT NULL " +
    "  AND p.precioReferencia > 0 " +
    "  AND pe.precio IS NOT NULL " +
    "  AND pe.precio > 0 " +
    "  AND pe.precio < p.precioReferencia")
  List<ProductoEstablecimiento> findOfertasValidas();

  // TEC-134: establecimientos disponibles para un producto.
  @Query("""
        SELECT pe
        FROM ProductoEstablecimiento pe
        JOIN FETCH pe.establecimiento e
        WHERE pe.producto.idProducto = :idProducto
          AND e.estado = true
          AND pe.disponibilidad = true
        ORDER BY pe.precio ASC, e.idEstablecimiento ASC
        """)
  List<ProductoEstablecimiento> findTiendasDisponiblesPorProducto(
    @Param("idProducto") Long idProducto
  );

  // Fase 3: administración de ofertas, incluidas las no disponibles.
  @Query("""
        SELECT pe
        FROM ProductoEstablecimiento pe
        JOIN FETCH pe.producto p
        JOIN FETCH pe.establecimiento e
        WHERE (:idProducto IS NULL OR p.idProducto = :idProducto)
        ORDER BY p.nombre ASC, e.nombre ASC
        """)
  List<ProductoEstablecimiento> findParaAdministracion(@Param("idProducto") Long idProducto);

  // Fase 4 (H-04): disponibilidad real de todos los productos en una sola consulta.
  @Query("""
        SELECT new com.example.backend.dto.ResumenOfertasProductoResponse(
          p.idProducto, COUNT(pe), MIN(pe.precio), MAX(pe.fechaActualizacionPrecio))
        FROM ProductoEstablecimiento pe
        JOIN pe.producto p
        JOIN pe.establecimiento e
        WHERE p.estado = true
          AND e.estado = true
          AND pe.disponibilidad = true
          AND pe.precio IS NOT NULL
          AND pe.precio > 0
        GROUP BY p.idProducto
        """)
  List<ResumenOfertasProductoResponse> resumirOfertasDisponibles();
}
