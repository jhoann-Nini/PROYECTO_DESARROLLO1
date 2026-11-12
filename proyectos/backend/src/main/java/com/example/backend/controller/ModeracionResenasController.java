package com.example.backend.controller;

import com.example.backend.dto.AccionModeracionRequest;
import com.example.backend.dto.ReporteResenaResponse;
import com.example.backend.dto.ResenaReportadaResponse;
import com.example.backend.entity.EstadoReporte;
import com.example.backend.service.ReporteResenaService;
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
 * Controlador REST para la moderación de reseñas y consulta de reseñas pendientes y reportadas.
 * Tareas:
 * - S2-42 Endpoint para listar reseñas pendientes y reportadas (Moderadores y Administradores).
 * - S2-43 Acciones publicar, ocultar y rechazar (solo Administradores).
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
    @GetMapping({
            "/api/moderacion/resenas/reportadas",
            "/api/resenas/reportadas",
            "/api/admin/resenas/reportadas"
    })
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
    @GetMapping({
            "/api/moderacion/resenas/pendientes",
            "/api/resenas/pendientes",
            "/api/admin/resenas/pendientes"
    })
    public List<ResenaReportadaResponse> listarResenasPendientes(
            @RequestParam(required = false) Boolean oculta,
            @RequestParam(required = false) Long idProducto,
            @AuthenticationPrincipal Jwt jwt) {
        return reporteResenaService.listarResenasReportadas(EstadoReporte.PENDIENTE, oculta, idProducto, jwt);
    }

    /**
     * Consulta plana de la cola de reportes de moderación.
     */
    @GetMapping({
            "/api/moderacion/reportes",
            "/api/admin/reportes"
    })
    public List<ReporteResenaResponse> listarReportes(
            @RequestParam(required = false) EstadoReporte estado,
            @AuthenticationPrincipal Jwt jwt) {
        return reporteResenaService.listarReportesModeracion(estado, jwt);
    }

    /**
     * S2-43: Oculta una reseña reportada marcándola como oculta_por_reportes = true.
     * Acción reservada exclusivamente para Administradores.
     */
    @RequestMapping(
            value = {
                    "/api/admin/resenas/{idResena}/ocultar",
                    "/api/moderacion/resenas/{idResena}/ocultar"
            },
            method = {RequestMethod.PUT, RequestMethod.POST}
    )
    public ResenaReportadaResponse ocultarResena(
            @PathVariable Long idResena,
            @RequestBody(required = false) AccionModeracionRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return reporteResenaService.ocultarResena(idResena, request, jwt);
    }

    /**
     * S2-43: Restaura la visibilidad de una reseña reportada (oculta_por_reportes = false).
     * Si la reseña fue eliminada lógicamente por su autor, no se permite su publicación (HTTP 409).
     * Acción reservada exclusivamente para Administradores.
     */
    @RequestMapping(
            value = {
                    "/api/admin/resenas/{idResena}/publicar",
                    "/api/moderacion/resenas/{idResena}/publicar"
            },
            method = {RequestMethod.PUT, RequestMethod.POST}
    )
    public ResenaReportadaResponse publicarResena(
            @PathVariable Long idResena,
            @RequestBody(required = false) AccionModeracionRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return reporteResenaService.publicarResena(idResena, request, jwt);
    }

    /**
     * S2-43: Rechaza todos los reportes pendientes/en revisión de una reseña.
     * Restablece automáticamente la visibilidad si los reportes activos quedan en menos de 3.
     * Acción reservada exclusivamente para Administradores.
     */
    @RequestMapping(
            value = {
                    "/api/admin/resenas/{idResena}/rechazar-reportes",
                    "/api/admin/resenas/{idResena}/rechazar",
                    "/api/moderacion/resenas/{idResena}/rechazar-reportes",
                    "/api/moderacion/resenas/{idResena}/rechazar"
            },
            method = {RequestMethod.PUT, RequestMethod.POST}
    )
    public ResenaReportadaResponse rechazarReportesDeResena(
            @PathVariable Long idResena,
            @RequestBody(required = false) AccionModeracionRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return reporteResenaService.rechazarReportesDeResena(idResena, request, jwt);
    }

    /**
     * S2-43: Rechaza un reporte individual de una reseña.
     * Si los reportes no rechazados quedan en menos de 3, restablece automáticamente la visibilidad de la reseña.
     * Acción reservada exclusivamente para Administradores.
     */
    @RequestMapping(
            value = {
                    "/api/admin/reportes/{idReporte}/rechazar",
                    "/api/moderacion/reportes/{idReporte}/rechazar"
            },
            method = {RequestMethod.PUT, RequestMethod.POST}
    )
    public ReporteResenaResponse rechazarReporteIndividual(
            @PathVariable Long idReporte,
            @RequestBody(required = false) AccionModeracionRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return reporteResenaService.rechazarReporteIndividual(idReporte, request, jwt);
    }
}

