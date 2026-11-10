package com.example.backend.repository;

import com.example.backend.entity.UsuarioRol;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface UsuarioRolRepository extends JpaRepository<UsuarioRol, Long> {
    Optional<UsuarioRol> findByUsuario_IdUsuarioAndRol_IdRol(Long usuarioId, Long rolId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT ur FROM UsuarioRol ur WHERE ur.usuario.idUsuario = :usuarioId AND ur.rol.idRol = :rolId")
    Optional<UsuarioRol> findByUsuarioAndRolForUpdate(Long usuarioId, Long rolId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT ur FROM UsuarioRol ur
        JOIN ur.rol r
        JOIN ur.usuario u
        WHERE ur.estado = true AND u.estado = true
          AND LOWER(r.nombre) = 'administrador'
        """)
    List<UsuarioRol> findAdministradoresActivosForUpdate();
}
