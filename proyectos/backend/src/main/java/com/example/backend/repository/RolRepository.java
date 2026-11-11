package com.example.backend.repository;

import com.example.backend.entity.Rol;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;

public interface RolRepository extends JpaRepository<Rol, Long> {
    Optional<Rol> findByNombre(String nombre);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Rol> findByNombreForUpdate(String nombre);
}
