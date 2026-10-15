package com.example.backend.dto;

import java.time.LocalDateTime;

/**
 * DTO de respuesta para el perfil de usuario actual autenticado (GET /api/usuarios/me).
 * No expone contraseñas, hashes ni tokens sensibles.
 */
public record UsuarioMeResponse(
    Long idUsuario,
    String nombre,
    String correo,
    String rol,
    Boolean activo,
    LocalDateTime fechaRegistro
) {}
