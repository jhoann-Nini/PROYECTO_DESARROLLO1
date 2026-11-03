package com.example.backend.repository;

import com.example.backend.entity.Usuario;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    @EntityGraph(attributePaths = {"rol"})
    Optional<Usuario> findByCorreo(String correo);

    boolean existsByCorreo(String correo);

    @EntityGraph(attributePaths = {"rol"})
    Optional<Usuario> findBySupabaseUid(String supabaseUid);

    boolean existsBySupabaseUid(String supabaseUid);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM Usuario u WHERE u.idUsuario = :idUsuario")
    Optional<Usuario> findByIdForUpdate(@Param("idUsuario") Long idUsuario);
}
