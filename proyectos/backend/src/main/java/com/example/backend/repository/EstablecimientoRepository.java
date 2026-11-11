package com.example.backend.repository;

import com.example.backend.entity.Establecimiento;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EstablecimientoRepository extends JpaRepository<Establecimiento, Long> {
    List<Establecimiento> findByEstadoTrueOrderByNombreAsc();
}
