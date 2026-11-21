package com.example.backend.controller;

import com.example.backend.dto.OfertaAdminRequest;
import com.example.backend.dto.OfertaAdminResponse;
import com.example.backend.service.AdministracionOfertasService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Administración de ofertas producto–tienda (Fase 3). Rutas bajo
 * /api/admin/**, restringidas a administradores en SecurityConfig.
 */
@RestController
@RequestMapping("/api/admin")
public class AdministracionOfertasController {

  private final AdministracionOfertasService ofertasService;

  public AdministracionOfertasController(AdministracionOfertasService ofertasService) {
    this.ofertasService = ofertasService;
  }

  @GetMapping("/ofertas")
  public List<OfertaAdminResponse> listar(
    @RequestParam(required = false) Long idProducto,
    @AuthenticationPrincipal Jwt jwt) {
    return ofertasService.listar(idProducto, jwt);
  }

  @PutMapping("/productos/{idProducto}/establecimientos/{idEstablecimiento}")
  public OfertaAdminResponse guardar(
    @PathVariable Long idProducto,
    @PathVariable Long idEstablecimiento,
    @Valid @RequestBody OfertaAdminRequest request,
    @AuthenticationPrincipal Jwt jwt) {
    return ofertasService.guardar(idProducto, idEstablecimiento, request, jwt);
  }

  @DeleteMapping("/productos/{idProducto}/establecimientos/{idEstablecimiento}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void eliminar(
    @PathVariable Long idProducto,
    @PathVariable Long idEstablecimiento,
    @AuthenticationPrincipal Jwt jwt) {
    ofertasService.eliminar(idProducto, idEstablecimiento, jwt);
  }
}
