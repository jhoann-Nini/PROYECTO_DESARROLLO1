package com.example.backend.controller;

import com.example.backend.dto.ReporteResenaRequest;
import com.example.backend.dto.ReporteResenaResponse;
import com.example.backend.service.ReporteResenaService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Controlador REST para el registro y consulta de reportes de reseñas.
 * Tarea S2-39: Endpoint para reportar reseñas.
 * Requiere autenticación con JWT emitido por Supabase.
 */
@RestController
public class ReporteResenaController {

    private final ReporteResenaService reporteResenaService;

    public ReporteResenaController(ReporteResenaService reporteResenaService) {
        this.reporteResenaService = reporteResenaService;
    }

    /**
     * S2-39: Registra un reporte sobre una reseña específica mediante path variable.
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
     * S2-39: Registra un reporte sobre una reseña enviando el ID de la reseña en el payload.
     * La identidad del reportante se extrae exclusivamente del JWT autenticado.
     */
    @PostMapping("/api/reportes")
    @ResponseStatus(HttpStatus.CREATED)
    public ReporteResenaResponse crearDesdeBody(
            @Valid @RequestBody ReporteResenaRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        Long idResena = request.idResena();
        if (idResena == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El ID de la reseña es obligatorio.");
        }
        return reporteResenaService.crearReporte(idResena, request, jwt);
    }

    /**
     * Consulta los reportes realizados por el usuario autenticado.
     */
    @GetMapping("/api/reportes/mis-reportes")
    public List<ReporteResenaResponse> listarMisReportes(@AuthenticationPrincipal Jwt jwt) {
        return reporteResenaService.listarMisReportes(jwt);
    }
}

