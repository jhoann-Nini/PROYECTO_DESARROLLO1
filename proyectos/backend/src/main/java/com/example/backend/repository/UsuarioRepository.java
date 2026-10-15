package com.example.backend.repository;

import com.example.backend.entity.Usuario;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    @EntityGraph(attributePaths = {"rol"})
    Optional<Usuario> findByCorreo(String correo);

    boolean existsByCorreo(String correo);

    @EntityGraph(attributePaths = {"rol"})
    Optional<Usuario> findBySupabaseUid(String supabaseUid);

    boolean existsBySupabaseUid(String supabaseUid);
}
