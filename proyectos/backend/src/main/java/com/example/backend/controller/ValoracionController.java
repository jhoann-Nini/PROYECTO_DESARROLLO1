package com.example.backend.controller;

import com.example.backend.dto.ValoracionRequest;
import com.example.backend.dto.ValoracionResponse;
import com.example.backend.service.ValoracionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

/**
 * Controlador REST para registrar y consultar valoraciones de productos con autenticación JWT de Supabase.
 */
@RestController
public class ValoracionController {

    private final ValoracionService valoracionService;

    public ValoracionController(ValoracionService valoracionService) {
        this.valoracionService = valoracionService;
    }

    /**
     * Endpoint protegido para registrar o actualizar la valoración activa del usuario para un producto.
     */
    @PostMapping("/api/valoraciones")
    @ResponseStatus(HttpStatus.CREATED)
    public ValoracionResponse crearOActualizar(
            @Valid @RequestBody ValoracionRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return valoracionService.crearOActualizar(request, jwt);
    }

    /**
     * Endpoint protegido para consultar la valoración que el usuario actual ha emitido sobre un producto.
     */
    @GetMapping("/api/valoraciones/mi-valoracion")
    public ResponseEntity<ValoracionResponse> obtenerMiValoracion(
            @RequestParam Long idProducto,
            @AuthenticationPrincipal Jwt jwt) {
        return valoracionService.obtenerMiValoracion(idProducto, jwt)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }
}
