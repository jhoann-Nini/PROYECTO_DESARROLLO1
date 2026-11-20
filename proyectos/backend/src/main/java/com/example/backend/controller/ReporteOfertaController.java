
package com.example.backend.controller;

import com.example.backend.dto.ReporteOfertaRequest;
import com.example.backend.dto.ReporteOfertaResponse;
import com.example.backend.service.ReporteOfertaService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ReporteOfertaController {

  private final ReporteOfertaService reporteOfertaService;

  public ReporteOfertaController(
    ReporteOfertaService reporteOfertaService) {
    this.reporteOfertaService = reporteOfertaService;
  }

  /**
   * TEC-147: Registrar un reporte de precio o enlace incorrecto.
   * <p>
   * Requiere un JWT válido de Supabase.
   */
  @PostMapping("/api/reportes/ofertas")
  @ResponseStatus(HttpStatus.CREATED)
  public ReporteOfertaResponse crear(
    @Valid @RequestBody ReporteOfertaRequest request,
    @AuthenticationPrincipal Jwt jwt) {

    return reporteOfertaService.crearReporte(request, jwt);
  }
}
