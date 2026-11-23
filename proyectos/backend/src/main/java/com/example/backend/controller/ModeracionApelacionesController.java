package com.example.backend.controller;

import com.example.backend.dto.ApelacionModeracionResponse;
import com.example.backend.dto.ResolverApelacionRequest;
import com.example.backend.entity.EstadoApelacion;
import com.example.backend.service.ApelacionService;
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
 * Cola y resolución de apelaciones (Caso 6). SecurityConfig exige rol de
 * moderación en /api/moderacion/** y el servicio revalida, incluido el
 * conflicto de interés.
 */
@RestController
@RequestMapping("/api/moderacion/apelaciones")
public class ModeracionApelacionesController {

  private final ApelacionService apelacionService;

  public ModeracionApelacionesController(ApelacionService apelacionService) {
    this.apelacionService = apelacionService;
  }

  @GetMapping
  public List<ApelacionModeracionResponse> listar(
      @RequestParam(required = false) EstadoApelacion estado,
      @AuthenticationPrincipal Jwt jwt) {
    return apelacionService.listarParaModeracion(estado, jwt);
  }

  @PutMapping("/{idApelacion}/aceptar")
  public ApelacionModeracionResponse aceptar(
      @PathVariable Long idApelacion,
      @Valid @RequestBody(required = false) ResolverApelacionRequest request,
      @AuthenticationPrincipal Jwt jwt) {
    return apelacionService.aceptar(idApelacion, request, jwt);
  }

  @PutMapping("/{idApelacion}/rechazar")
  public ApelacionModeracionResponse rechazar(
      @PathVariable Long idApelacion,
      @Valid @RequestBody(required = false) ResolverApelacionRequest request,
      @AuthenticationPrincipal Jwt jwt) {
    return apelacionService.rechazar(idApelacion, request, jwt);
  }
}
