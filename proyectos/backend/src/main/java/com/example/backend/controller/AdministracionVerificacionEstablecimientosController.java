
package com.example.backend.controller;

import com.example.backend.dto.EstablecimientoResponse;
import com.example.backend.dto.EstablecimientoVerificacionRequest;
import com.example.backend.service.EstablecimientoService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Gestión administrativa de la verificación de establecimientos.
 * Ticket TEC-151 / HU-S2-15.
 */
@RestController
@RequestMapping("/api/admin/establecimientos")
public class AdministracionVerificacionEstablecimientosController {

  private final EstablecimientoService establecimientoService;

  public AdministracionVerificacionEstablecimientosController(
    EstablecimientoService establecimientoService) {
    this.establecimientoService = establecimientoService;
  }

  /**
   * Verifica o retira la verificación de un establecimiento.
   * <p>
   * El acceso a /api/admin/** está restringido a administradores
   * mediante SecurityConfig.
   */
  @PutMapping("/{idEstablecimiento}/verificacion")
  public EstablecimientoResponse actualizarVerificacion(
    @PathVariable Long idEstablecimiento,
    @Valid @RequestBody EstablecimientoVerificacionRequest request) {

    return establecimientoService.actualizarVerificacion(
      idEstablecimiento,
      request.verificado()
    );
  }
}
