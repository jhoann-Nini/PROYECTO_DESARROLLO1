package com.example.backend.controller;

import com.example.backend.dto.ApelacionResponse;
import com.example.backend.dto.CrearApelacionRequest;
import com.example.backend.dto.DecisionApelableResponse;
import com.example.backend.service.ApelacionService;
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

/** Apelaciones del autor (Caso 6). Requiere autenticación (SecurityConfig). */
@RestController
@RequestMapping("/api/apelaciones")
public class ApelacionController {

  private final ApelacionService apelacionService;

  public ApelacionController(ApelacionService apelacionService) {
    this.apelacionService = apelacionService;
  }

  @PostMapping
  public ResponseEntity<ApelacionResponse> crear(
      @Valid @RequestBody CrearApelacionRequest request,
      @AuthenticationPrincipal Jwt jwt) {
    return ResponseEntity.status(HttpStatus.CREATED).body(apelacionService.crear(request, jwt));
  }

  @GetMapping("/mias")
  public List<DecisionApelableResponse> listarMias(@AuthenticationPrincipal Jwt jwt) {
    return apelacionService.listarMias(jwt);
  }
}
