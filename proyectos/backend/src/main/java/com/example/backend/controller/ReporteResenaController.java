package com.example.backend.controller;

import com.example.backend.dto.ReporteResenaRequest;
import com.example.backend.dto.ReporteResenaResponse;
import com.example.backend.dto.ReporteResenaDecisionAuditoriaResponse;
import com.example.backend.entity.EstadoReporte;
import com.example.backend.service.ReporteResenaService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Controlador REST para el registro y consulta de reportes de reseñas.
 * Requiere autenticación con JWT emitido por Supabase.
 */
@RestController
public class ReporteResenaController {

    private final ReporteResenaService reporteResenaService;

    public ReporteResenaController(ReporteResenaService reporteResenaService) {
        this.reporteResenaService = reporteResenaService;
    }

    /**
     * Registra un reporte sobre una reseña específica.
     * La identidad del reportante se extrae exclusivamente del JWT autenticado.
     */
    @PostMapping({
            "/api/resenas/{idResena}/reportes",
            "/api/reportes/resenas/{idResena}"
    })
    @ResponseStatus(HttpStatus.CREATED)
    public ReporteResenaResponse crear(
            @PathVariable Long idResena,
            @Valid @RequestBody ReporteResenaRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return reporteResenaService.crearReporte(idResena, request, jwt);
    }

    /**
     * Registra un reporte recibiendo el identificador de la reseña en el cuerpo.
     */
    @PostMapping("/api/reportes")
    @ResponseStatus(HttpStatus.CREATED)
    public ReporteResenaResponse crearDesdeBody(
            @Valid @RequestBody ReporteResenaRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        Long idResena = request.idResena();
        if (idResena == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "El identificador de la reseña es obligatorio."
            );
        }
        return reporteResenaService.crearReporte(idResena, request, jwt);
    }

    /**
     * Avanza o resuelve un reporte según las transiciones permitidas por el servicio.
     */
    @PatchMapping("/api/moderacion/reportes/{idReporte}/estado")
    public ReporteResenaResponse actualizarEstadoModeracion(
            @PathVariable Long idReporte,
            @RequestParam EstadoReporte estado,
            @RequestParam(required = false) String observacion,
            @AuthenticationPrincipal Jwt jwt) {
        return reporteResenaService.actualizarEstadoModeracion(idReporte, estado, observacion, jwt);
    }

    /**
     * Consulta el historial inmutable de decisiones sobre un reporte.
     */
    @GetMapping("/api/moderacion/reportes/{idReporte}/historial")
    public List<ReporteResenaDecisionAuditoriaResponse> listarHistorialModeracion(
            @PathVariable Long idReporte,
            @AuthenticationPrincipal Jwt jwt) {
        return reporteResenaService.listarHistorialModeracion(idReporte, jwt);
    }

    /**
     * Consulta los reportes realizados por el usuario autenticado.
     */
    @GetMapping("/api/reportes/mis-reportes")
    public List<ReporteResenaResponse> listarMisReportes(@AuthenticationPrincipal Jwt jwt) {
        return reporteResenaService.listarMisReportes(jwt);
    }
}

