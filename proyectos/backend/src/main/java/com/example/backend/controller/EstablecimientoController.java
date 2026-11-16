package com.example.backend.controller;

import com.example.backend.dto.EstablecimientoResponse;
import com.example.backend.dto.EstablecimientoUpdateRequest;
import com.example.backend.service.EstablecimientoService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Endpoints para que representantes gestionen únicamente sus establecimientos. */
@RestController
@RequestMapping("/api/representante/establecimientos")
public class EstablecimientoController {

    private final EstablecimientoService establecimientoService;

    public EstablecimientoController(EstablecimientoService establecimientoService) {
        this.establecimientoService = establecimientoService;
    }

    @GetMapping
    public List<EstablecimientoResponse> listar(@AuthenticationPrincipal Jwt jwt) {
        return establecimientoService.listarAsignados(jwt);
    }

    @GetMapping("/{idEstablecimiento}")
    public EstablecimientoResponse obtener(
            @PathVariable Long idEstablecimiento,
            @AuthenticationPrincipal Jwt jwt) {
        return establecimientoService.obtenerAsignado(idEstablecimiento, jwt);
    }

    @PutMapping("/{idEstablecimiento}")
    public EstablecimientoResponse actualizar(
            @PathVariable Long idEstablecimiento,
            @Valid @RequestBody EstablecimientoUpdateRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return establecimientoService.actualizarAsignado(idEstablecimiento, request, jwt);
    }
}
