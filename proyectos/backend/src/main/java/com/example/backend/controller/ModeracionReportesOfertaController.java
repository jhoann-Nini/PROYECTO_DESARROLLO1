package com.example.backend.controller;

import com.example.backend.dto.AccionModeracionRequest;
import com.example.backend.dto.ReporteOfertaModeracionResponse;
import com.example.backend.entity.EstadoReporte;
import com.example.backend.service.ModeracionReportesOfertaService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Cola de moderación de reportes de ofertas (Fase 2, H-05).
 * <p>
 * Las rutas viven bajo /api/moderacion/**, protegidas por
 * ModeratorAuthorizationManager; el servicio vuelve a validar el rol.
 */
@RestController
@RequestMapping("/api/moderacion/ofertas/reportes")
public class ModeracionReportesOfertaController {

  private final ModeracionReportesOfertaService moderacionService;

  public ModeracionReportesOfertaController(ModeracionReportesOfertaService moderacionService) {
    this.moderacionService = moderacionService;
  }

  @GetMapping
  public List<ReporteOfertaModeracionResponse> listar(
    @RequestParam(required = false) EstadoReporte estado,
    @AuthenticationPrincipal Jwt jwt) {
    return moderacionService.listar(estado, jwt);
  }

  @GetMapping("/{idReporte}")
  public ReporteOfertaModeracionResponse obtener(
    @PathVariable Long idReporte,
    @AuthenticationPrincipal Jwt jwt) {
    return moderacionService.obtener(idReporte, jwt);
  }

  @RequestMapping(value = "/{idReporte}/en-revision", method = {RequestMethod.PUT, RequestMethod.POST})
  public ReporteOfertaModeracionResponse tomar(
    @PathVariable Long idReporte,
    @Valid @RequestBody(required = false) AccionModeracionRequest request,
    @AuthenticationPrincipal Jwt jwt) {
    return moderacionService.tomar(idReporte, request, jwt);
  }

  @RequestMapping(value = "/{idReporte}/aceptar", method = {RequestMethod.PUT, RequestMethod.POST})
  public ReporteOfertaModeracionResponse aceptar(
    @PathVariable Long idReporte,
    @Valid @RequestBody(required = false) AccionModeracionRequest request,
    @AuthenticationPrincipal Jwt jwt) {
    return moderacionService.aceptar(idReporte, request, jwt);
  }

  @RequestMapping(value = "/{idReporte}/rechazar", method = {RequestMethod.PUT, RequestMethod.POST})
  public ReporteOfertaModeracionResponse rechazar(
    @PathVariable Long idReporte,
    @Valid @RequestBody(required = false) AccionModeracionRequest request,
    @AuthenticationPrincipal Jwt jwt) {
    return moderacionService.rechazar(idReporte, request, jwt);
  }
}
