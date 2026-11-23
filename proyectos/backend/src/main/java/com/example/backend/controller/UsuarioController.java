package com.example.backend.controller;

import com.example.backend.dto.EstadoReincidenciaResponse;
import com.example.backend.dto.UsuarioMeResponse;
import com.example.backend.service.ReincidenciaService;
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
    private final ReincidenciaService reincidenciaService;

    public UsuarioController(UsuarioService usuarioService, ReincidenciaService reincidenciaService) {
        this.usuarioService = usuarioService;
        this.reincidenciaService = reincidenciaService;
    }

    /**
     * Caso 6: faltas de moderación del usuario autenticado y restricción
     * vigente (aviso, revisión previa o bloqueo).
     */
    @GetMapping("/me/reincidencia")
    public EstadoReincidenciaResponse obtenerMiReincidencia(@AuthenticationPrincipal Jwt jwt) {
        return reincidenciaService.evaluar(usuarioService.obtenerUsuarioDesdeJwt(jwt).getIdUsuario());
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
