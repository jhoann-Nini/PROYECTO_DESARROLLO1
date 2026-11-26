package com.example.backend.controller;

import com.example.backend.dto.comunidad.CrearReporteComunidadRequest;
import com.example.backend.dto.comunidad.ReporteComunidadResponse;
import com.example.backend.service.ReporteComunidadService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/** Reportes de la comunidad. Requieren sesión (SecurityConfig: escrituras autenticadas). */
@RestController
public class ComunidadReportesController {

  private final ReporteComunidadService servicio;

  public ComunidadReportesController(ReporteComunidadService servicio) {
    this.servicio = servicio;
  }

  @PostMapping("/api/comunidad/publicaciones/{id}/reportes")
  public ResponseEntity<ReporteComunidadResponse> reportarPublicacion(@AuthenticationPrincipal Jwt jwt,
      @PathVariable Long id, @RequestBody CrearReporteComunidadRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(servicio.reportarPublicacion(jwt, id, request));
  }

  @PostMapping("/api/comunidad/respuestas/{id}/reportes")
  public ResponseEntity<ReporteComunidadResponse> reportarRespuesta(@AuthenticationPrincipal Jwt jwt,
      @PathVariable Long id, @RequestBody CrearReporteComunidadRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(servicio.reportarRespuesta(jwt, id, request));
  }
}
