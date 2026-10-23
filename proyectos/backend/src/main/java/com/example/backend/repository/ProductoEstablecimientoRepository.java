package com.example.backend.repository;

import com.example.backend.entity.ProductoEstablecimiento;
import com.example.backend.entity.ProductoEstablecimientoId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface ProductoEstablecimientoRepository
        extends JpaRepository<ProductoEstablecimiento, ProductoEstablecimientoId> {

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
}
