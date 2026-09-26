package com.example.backend.repository;

import com.example.backend.entity.ProductoEstablecimiento;
import com.example.backend.entity.ProductoEstablecimientoId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductoEstablecimientoRepository
        extends JpaRepository<ProductoEstablecimiento, ProductoEstablecimientoId> {
}
