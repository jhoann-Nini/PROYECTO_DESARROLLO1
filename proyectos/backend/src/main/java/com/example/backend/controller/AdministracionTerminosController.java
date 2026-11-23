package com.example.backend.controller;

import com.example.backend.dto.CrearTerminoModeracionRequest;
import com.example.backend.dto.TerminoModeracionResponse;
import com.example.backend.service.TerminoModeracionService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Lista de términos de moderación (Caso 6). Bajo /api/admin/**: SecurityConfig
 * la restringe a administradores y el servicio lo revalida.
 */
@RestController
@RequestMapping("/api/admin/terminos-moderacion")
public class AdministracionTerminosController {

  private final TerminoModeracionService service;

  public AdministracionTerminosController(TerminoModeracionService service) {
    this.service = service;
  }

  @GetMapping
  public List<TerminoModeracionResponse> listar(
      @RequestParam(required = false) String estado, @AuthenticationPrincipal Jwt jwt) {
    return service.listar(estado, jwt);
  }

  @PostMapping
  public ResponseEntity<TerminoModeracionResponse> crear(
      @Valid @RequestBody CrearTerminoModeracionRequest request, @AuthenticationPrincipal Jwt jwt) {
    return ResponseEntity.status(HttpStatus.CREATED).body(service.crear(request, jwt));
  }

  @PutMapping("/{idTermino}/desactivar")
  public TerminoModeracionResponse desactivar(@PathVariable Long idTermino, @AuthenticationPrincipal Jwt jwt) {
    return service.desactivar(idTermino, jwt);
  }
}
