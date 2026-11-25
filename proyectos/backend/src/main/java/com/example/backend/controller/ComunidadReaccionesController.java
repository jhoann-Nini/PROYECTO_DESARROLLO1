package com.example.backend.controller;

import com.example.backend.dto.comunidad.MeGustaResponse;
import com.example.backend.service.ReaccionComunidadService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RestController;

/** «Me gusta» de la comunidad: PUT lo da y DELETE lo retira; ambos idempotentes. */
@RestController
public class ComunidadReaccionesController {

  private final ReaccionComunidadService servicio;

  public ComunidadReaccionesController(ReaccionComunidadService servicio) {
    this.servicio = servicio;
  }

  @PutMapping("/api/comunidad/publicaciones/{id}/me-gusta")
  public MeGustaResponse darPublicacion(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
    return servicio.darMeGustaPublicacion(jwt, id);
  }

  @DeleteMapping("/api/comunidad/publicaciones/{id}/me-gusta")
  public MeGustaResponse retirarPublicacion(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
    return servicio.retirarMeGustaPublicacion(jwt, id);
  }

  @PutMapping("/api/comunidad/respuestas/{id}/me-gusta")
  public MeGustaResponse darRespuesta(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
    return servicio.darMeGustaRespuesta(jwt, id);
  }

  @DeleteMapping("/api/comunidad/respuestas/{id}/me-gusta")
  public MeGustaResponse retirarRespuesta(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
    return servicio.retirarMeGustaRespuesta(jwt, id);
  }
}
