package com.example.backend.controller;

import com.example.backend.dto.ResumenPendientesModeracionResponse;
import com.example.backend.service.ModeracionResumenService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Contador de pendientes del panel de moderación. SecurityConfig exige rol de
 * moderador en /api/moderacion/** y el servicio lo vuelve a comprobar.
 */
@RestController
public class ModeracionResumenController {

    private final ModeracionResumenService moderacionResumenService;

    public ModeracionResumenController(ModeracionResumenService moderacionResumenService) {
        this.moderacionResumenService = moderacionResumenService;
    }

    @GetMapping("/api/moderacion/pendientes/resumen")
    public ResumenPendientesModeracionResponse obtenerResumen(@AuthenticationPrincipal Jwt jwt) {
        return moderacionResumenService.obtenerResumen(jwt);
    }
}
