package com.example.backend.repository;

import com.example.backend.entity.UsuarioEstablecimiento;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UsuarioEstablecimientoRepository extends JpaRepository<UsuarioEstablecimiento, Long> {
    Optional<UsuarioEstablecimiento> findByUsuario_IdUsuarioAndEstablecimiento_IdEstablecimiento(Long usuarioId, Long establecimientoId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT ue FROM UsuarioEstablecimiento ue
        WHERE ue.usuario.idUsuario = :usuarioId
          AND ue.establecimiento.idEstablecimiento = :establecimientoId
        """)
    Optional<UsuarioEstablecimiento> findByUsuarioAndEstablecimientoForUpdate(
            @Param("usuarioId") Long usuarioId,
            @Param("establecimientoId") Long establecimientoId);
}
