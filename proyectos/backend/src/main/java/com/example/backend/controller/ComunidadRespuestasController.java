package com.example.backend.controller;

import com.example.backend.dto.comunidad.CrearRespuestaRequest;
import com.example.backend.dto.comunidad.EditarRespuestaRequest;
import com.example.backend.dto.comunidad.PaginaRespuestas;
import com.example.backend.dto.comunidad.RespuestaResponse;
import com.example.backend.service.RespuestaComunidadService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Respuestas de la comunidad: un nivel por petición; {@code padre} vacío son las directas. */
@RestController
public class ComunidadRespuestasController {

  private final RespuestaComunidadService servicio;

  public ComunidadRespuestasController(RespuestaComunidadService servicio) {
    this.servicio = servicio;
  }

  @GetMapping("/api/comunidad/publicaciones/{id}/respuestas")
  public PaginaRespuestas listar(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
      @RequestParam(required = false) Long padre,
      @RequestParam(required = false) String cursor,
      @RequestParam(required = false) Integer limite) {
    return servicio.listarNivel(jwt, id, padre, cursor, limite);
  }

  @PostMapping("/api/comunidad/publicaciones/{id}/respuestas")
  public ResponseEntity<RespuestaResponse> crear(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
      @RequestBody CrearRespuestaRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(servicio.crear(jwt, id, request));
  }

  @PutMapping("/api/comunidad/respuestas/{id}")
  public RespuestaResponse editar(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
      @RequestBody EditarRespuestaRequest request) {
    return servicio.editar(jwt, id, request);
  }

  @DeleteMapping("/api/comunidad/respuestas/{id}")
  public ResponseEntity<Void> eliminar(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
    servicio.eliminar(jwt, id);
    return ResponseEntity.noContent().build();
  }
}
