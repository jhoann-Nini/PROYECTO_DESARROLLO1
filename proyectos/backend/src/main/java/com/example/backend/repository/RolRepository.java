package com.example.backend.repository;

import com.example.backend.entity.Rol;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface RolRepository extends JpaRepository<Rol, Long> {
    Optional<Rol> findByNombre(String nombre);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM Rol r WHERE LOWER(r.nombre) = LOWER(:nombre)")
    Optional<Rol> findByNombreForUpdate(String nombre);
}
