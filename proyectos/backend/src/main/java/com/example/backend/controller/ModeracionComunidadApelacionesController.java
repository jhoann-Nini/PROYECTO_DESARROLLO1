package com.example.backend.controller;

import com.example.backend.dto.ResolverApelacionRequest;
import com.example.backend.dto.comunidad.ApelacionComunidadModeracionResponse;
import com.example.backend.entity.EstadoApelacion;
import com.example.backend.service.ApelacionComunidadService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Cola y resolución de apelaciones del foro (comunidad, fase 3).
 * SecurityConfig exige rol de moderación en /api/moderacion/** y el servicio
 * revalida, incluido el conflicto de interés.
 */
@RestController
@RequestMapping("/api/moderacion/comunidad/apelaciones")
public class ModeracionComunidadApelacionesController {

  private final ApelacionComunidadService servicio;

  public ModeracionComunidadApelacionesController(ApelacionComunidadService servicio) {
    this.servicio = servicio;
  }

  @GetMapping
  public List<ApelacionComunidadModeracionResponse> listar(@RequestParam(required = false) EstadoApelacion estado,
      @AuthenticationPrincipal Jwt jwt) {
    return servicio.listarParaModeracion(estado, jwt);
  }

  @PutMapping("/{idApelacion}/aceptar")
  public ApelacionComunidadModeracionResponse aceptar(@PathVariable Long idApelacion,
      @Valid @RequestBody(required = false) ResolverApelacionRequest request, @AuthenticationPrincipal Jwt jwt) {
    return servicio.aceptar(idApelacion, request, jwt);
  }

  @PutMapping("/{idApelacion}/rechazar")
  public ApelacionComunidadModeracionResponse rechazar(@PathVariable Long idApelacion,
      @Valid @RequestBody(required = false) ResolverApelacionRequest request, @AuthenticationPrincipal Jwt jwt) {
    return servicio.rechazar(idApelacion, request, jwt);
  }
}
