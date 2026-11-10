package com.example.backend.repository;

import com.example.backend.entity.UsuarioEstablecimiento;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UsuarioEstablecimientoRepository extends JpaRepository<UsuarioEstablecimiento, Long> {
    Optional<UsuarioEstablecimiento> findByUsuario_IdUsuarioAndEstablecimiento_IdEstablecimiento(Long usuarioId, Long establecimientoId);
}
