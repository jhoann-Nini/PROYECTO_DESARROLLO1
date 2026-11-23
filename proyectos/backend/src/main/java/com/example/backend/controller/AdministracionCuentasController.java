package com.example.backend.controller;

import com.example.backend.dto.CambioEstadoCuentaRequest;
import com.example.backend.dto.CuentaReincidenteResponse;
import com.example.backend.dto.UsuarioAdminResponse;
import com.example.backend.service.AdministracionCuentasService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Suspensión y reactivación de cuentas (Caso 6). Rutas bajo /api/admin/**,
 * restringidas a administradores en SecurityConfig; el servicio revalida.
 */
@RestController
@RequestMapping("/api/admin/usuarios")
public class AdministracionCuentasController {

  private final AdministracionCuentasService cuentasService;

  public AdministracionCuentasController(AdministracionCuentasService cuentasService) {
    this.cuentasService = cuentasService;
  }

  /** Caso 6: cuentas activas con 4 faltas o más en los últimos 90 días. */
  @GetMapping("/reincidentes")
  public List<CuentaReincidenteResponse> listarReincidentes(@AuthenticationPrincipal Jwt jwt) {
    return cuentasService.listarReincidentes(jwt);
  }

  @PutMapping("/{idUsuario}/estado")
  public UsuarioAdminResponse cambiarEstado(
    @PathVariable Long idUsuario,
    @Valid @RequestBody CambioEstadoCuentaRequest request,
    @AuthenticationPrincipal Jwt jwt) {
    return cuentasService.cambiarEstado(idUsuario, request, jwt);
  }
}
