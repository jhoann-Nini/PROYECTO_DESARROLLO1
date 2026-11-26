package com.example.backend.controller;

import com.example.backend.dto.comunidad.AuditoriaModeracionComunidadResponse;
import com.example.backend.dto.comunidad.ContenidoModeradoResponse;
import com.example.backend.dto.comunidad.DecisionModeracionComunidadRequest;
import com.example.backend.dto.comunidad.ElementoRevisionComunidadResponse;
import com.example.backend.dto.comunidad.ReporteModeracionComunidadResponse;
import com.example.backend.dto.comunidad.ReporteResueltoComunidadResponse;
import com.example.backend.dto.comunidad.ResolverReporteComunidadRequest;
import com.example.backend.entity.AccionModeracionComunidad;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.service.ModeracionComunidadService;
import java.util.List;
import java.util.Map;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Moderación de la comunidad. /api/moderacion/** exige rol de moderación en
 * SecurityConfig y el servicio lo vuelve a comprobar.
 */
@RestController
@RequestMapping("/api/moderacion/comunidad")
public class ModeracionComunidadController {

  private static final Map<String, AccionModeracionComunidad> ACCIONES = Map.of(
    "aprobar", AccionModeracionComunidad.APROBAR,
    "rechazar", AccionModeracionComunidad.RECHAZAR,
    "ocultar", AccionModeracionComunidad.OCULTAR,
    "restaurar", AccionModeracionComunidad.RESTAURAR,
    "eliminar", AccionModeracionComunidad.ELIMINAR_MODERADOR);

  private final ModeracionComunidadService servicio;

  public ModeracionComunidadController(ModeracionComunidadService servicio) {
    this.servicio = servicio;
  }

  @GetMapping("/en-revision")
  public List<ElementoRevisionComunidadResponse> enRevision(@AuthenticationPrincipal Jwt jwt) {
    return servicio.colaEnRevision(jwt);
  }

  @PutMapping("/publicaciones/{id}/{accion}")
  public ContenidoModeradoResponse decidirPublicacion(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
      @PathVariable String accion, @RequestBody DecisionModeracionComunidadRequest request) {
    return servicio.decidirPublicacion(jwt, id, accion(accion), request.motivo());
  }

  @PutMapping("/respuestas/{id}/{accion}")
  public ContenidoModeradoResponse decidirRespuesta(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
      @PathVariable String accion, @RequestBody DecisionModeracionComunidadRequest request) {
    return servicio.decidirRespuesta(jwt, id, accion(accion), request.motivo());
  }

  @GetMapping("/publicaciones/{id}/historial")
  public List<AuditoriaModeracionComunidadResponse> historialPublicacion(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
    return servicio.historialPublicacion(jwt, id);
  }

  @GetMapping("/respuestas/{id}/historial")
  public List<AuditoriaModeracionComunidadResponse> historialRespuesta(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
    return servicio.historialRespuesta(jwt, id);
  }

  @GetMapping("/reportes")
  public List<ReporteModeracionComunidadResponse> reportes(@AuthenticationPrincipal Jwt jwt,
      @RequestParam(required = false) String estado) {
    return servicio.reportes(jwt, estado);
  }

  @PutMapping("/reportes/{id}/en-revision")
  public ReporteResueltoComunidadResponse enRevision(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
      @RequestBody ResolverReporteComunidadRequest request) {
    return servicio.ponerEnRevision(jwt, id, request);
  }

  @PutMapping("/reportes/{id}/aceptar")
  public ReporteResueltoComunidadResponse aceptar(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
      @RequestBody ResolverReporteComunidadRequest request) {
    return servicio.aceptar(jwt, id, request);
  }

  @PutMapping("/reportes/{id}/rechazar")
  public ReporteResueltoComunidadResponse rechazar(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
      @RequestBody ResolverReporteComunidadRequest request) {
    return servicio.rechazar(jwt, id, request);
  }

  private static AccionModeracionComunidad accion(String valor) {
    AccionModeracionComunidad accion = ACCIONES.get(valor);
    if (accion == null) {
      throw new ResourceNotFoundException("Acción de moderación desconocida: " + valor);
    }
    return accion;
  }
}
