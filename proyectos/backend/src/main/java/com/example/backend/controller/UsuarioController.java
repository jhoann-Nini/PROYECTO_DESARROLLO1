package com.example.backend.controller;

import com.example.backend.dto.UsuarioMeResponse;
import com.example.backend.service.UsuarioService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controlador REST para la gestión del perfil del usuario autenticado.
 * Expone el endpoint de aprovisionamiento Just-In-Time (JIT) GET /api/usuarios/me.
 */
@RestController
@RequestMapping("/api/usuarios")
public class UsuarioController {

    private final UsuarioService usuarioService;

    public UsuarioController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    /**
     * Devuelve el perfil del usuario autenticado obtenido exclusivamente del token JWT
     * de Supabase validado por Spring Security, creándolo automáticamente si no existía.
     *
     * @param jwt Token JWT validado inyectado por Spring Security
     * @return Perfil de negocio del usuario sin credenciales ni tokens
     */
    @GetMapping("/me")
    public UsuarioMeResponse obtenerMiPerfil(@AuthenticationPrincipal Jwt jwt) {
        return usuarioService.obtenerOProveerUsuario(jwt);
    }
}
