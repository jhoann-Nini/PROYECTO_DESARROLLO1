package com.example.backend.dto;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Perfil del usuario autenticado.
 * Se conserva "rol" por compatibilidad y se añade "roles" para cuentas multirrol.
 */
public record UsuarioMeResponse(
    Long idUsuario,
    String nombre,
    String correo,
    String rol,
    Boolean activo,
    LocalDateTime fechaRegistro,
    List<String> roles
) {}
