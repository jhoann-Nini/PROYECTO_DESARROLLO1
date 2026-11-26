package com.example.backend.controller;

import com.example.backend.dto.comunidad.CrearPublicacionRequest;
import com.example.backend.dto.comunidad.EditarPublicacionRequest;
import com.example.backend.dto.comunidad.PaginaPublicaciones;
import com.example.backend.dto.comunidad.PublicacionDetalleResponse;
import com.example.backend.service.PublicacionComunidadService;
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

/**
 * Publicaciones de la comunidad. Las lecturas son públicas (SecurityConfig);
 * con sesión, el detalle informa {@code meGustaPropio} y {@code esAutor}.
 */
@RestController
public class ComunidadPublicacionesController {

  private final PublicacionComunidadService servicio;

  public ComunidadPublicacionesController(PublicacionComunidadService servicio) {
    this.servicio = servicio;
  }

  @GetMapping("/api/comunidad/publicaciones")
  public PaginaPublicaciones listarGeneral(@AuthenticationPrincipal Jwt jwt,
      @RequestParam(required = false) String orden,
      @RequestParam(required = false) String cursor,
      @RequestParam(required = false) Integer limite) {
    return servicio.listarGeneral(jwt, orden, cursor, limite);
  }

  @GetMapping("/api/productos/{idProducto}/comunidad/publicaciones")
  public PaginaPublicaciones listarPorProducto(@AuthenticationPrincipal Jwt jwt,
      @PathVariable Long idProducto,
      @RequestParam(required = false) String orden,
      @RequestParam(required = false) String cursor,
      @RequestParam(required = false) Integer limite) {
    return servicio.listarPorProducto(jwt, idProducto, orden, cursor, limite);
  }

  @GetMapping("/api/comunidad/publicaciones/{id}")
  public PublicacionDetalleResponse detalle(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
    return servicio.detalle(jwt, id);
  }

  @PostMapping("/api/comunidad/publicaciones")
  public ResponseEntity<PublicacionDetalleResponse> crear(@AuthenticationPrincipal Jwt jwt,
      @RequestBody CrearPublicacionRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(servicio.crear(jwt, request));
  }

  @PutMapping("/api/comunidad/publicaciones/{id}")
  public PublicacionDetalleResponse editar(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
      @RequestBody EditarPublicacionRequest request) {
    return servicio.editar(jwt, id, request);
  }

  @DeleteMapping("/api/comunidad/publicaciones/{id}")
  public ResponseEntity<Void> eliminar(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
    servicio.eliminar(jwt, id);
    return ResponseEntity.noContent().build();
  }
}
