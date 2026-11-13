package com.example.backend.controller;

import com.example.backend.dto.ReporteResenaResponse;
import com.example.backend.dto.ResenaReportadaResponse;
import com.example.backend.entity.EstadoReporte;
import com.example.backend.service.ReporteResenaService;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controlador REST para la moderación de reseñas y consulta de reseñas pendientes y reportadas.
 * Tarea: S2-42 Endpoint para listar reseñas pendientes y reportadas.
 * Requiere autenticación Bearer con rol Moderador o Administrador activo.
 */
@RestController
public class ModeracionResenasController {

    private final ReporteResenaService reporteResenaService;

    public ModeracionResenasController(ReporteResenaService reporteResenaService) {
        this.reporteResenaService = reporteResenaService;
    }

    /**
     * S2-42: Lista las reseñas reportadas con sus métricas y detalle de reportes asociados.
     * Admite filtrado opcional por estado de reporte (ej. PENDIENTE), ocultaPorReportes y producto.
     */
    @GetMapping("/api/moderacion/resenas/reportadas")
    public List<ResenaReportadaResponse> listarResenasReportadas(
            @RequestParam(required = false) EstadoReporte estado,
            @RequestParam(required = false) Boolean oculta,
            @RequestParam(required = false) Long idProducto,
            @AuthenticationPrincipal Jwt jwt) {
        return reporteResenaService.listarResenasReportadas(estado, oculta, idProducto, jwt);
    }

    /**
     * S2-42: Atajo para consultar reseñas con reportes pendientes de revisión.
     */
    @GetMapping("/api/moderacion/resenas/pendientes")
    public List<ResenaReportadaResponse> listarResenasPendientes(
            @RequestParam(required = false) Boolean oculta,
            @RequestParam(required = false) Long idProducto,
            @AuthenticationPrincipal Jwt jwt) {
        return reporteResenaService.listarResenasReportadas(EstadoReporte.PENDIENTE, oculta, idProducto, jwt);
    }

    /**
     * S2-42: Consulta plana de la cola de reportes de moderación.
     * Conserva compatibilidad con Fase 2: si no se envía 'estado', filtra por PENDIENTE por defecto.
     */
    @GetMapping("/api/moderacion/reportes")
    public List<ReporteResenaResponse> listarReportes(
            @RequestParam(defaultValue = "PENDIENTE") EstadoReporte estado,
            @AuthenticationPrincipal Jwt jwt) {
        return reporteResenaService.listarReportesModeracion(estado, jwt);
    }
}

