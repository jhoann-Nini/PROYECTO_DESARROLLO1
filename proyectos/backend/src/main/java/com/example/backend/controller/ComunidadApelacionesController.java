package com.example.backend.controller;

import com.example.backend.dto.ApelacionResponse;
import com.example.backend.dto.comunidad.CrearApelacionComunidadRequest;
import com.example.backend.dto.comunidad.DecisionComunidadApelableResponse;
import com.example.backend.service.ApelacionComunidadService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Apelaciones del autor sobre decisiones del foro (comunidad, fase 3).
 * Requiere sesión, también en GET (SecurityConfig).
 */
@RestController
@RequestMapping("/api/comunidad/apelaciones")
public class ComunidadApelacionesController {

  private final ApelacionComunidadService servicio;

  public ComunidadApelacionesController(ApelacionComunidadService servicio) {
    this.servicio = servicio;
  }

  @PostMapping
  public ResponseEntity<ApelacionResponse> crear(@Valid @RequestBody CrearApelacionComunidadRequest request,
      @AuthenticationPrincipal Jwt jwt) {
    return ResponseEntity.status(HttpStatus.CREATED).body(servicio.crear(request, jwt));
  }

  @GetMapping("/mias")
  public List<DecisionComunidadApelableResponse> mias(@AuthenticationPrincipal Jwt jwt) {
    return servicio.listarMias(jwt);
  }
}
