package com.example.backend.dto;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Resumen de una cuenta para consultas administrativas.
 * No expone contraseña ni el identificador de Supabase.
 * Se conserva "rol" por compatibilidad y "roles" para cuentas multirrol.
 */
public record UsuarioAdminResponse(
        Long idUsuario,
        String nombre,
        String correo,
        String rol,
        Boolean activo,
        LocalDateTime fechaRegistro,
        List<String> roles
) {
}
