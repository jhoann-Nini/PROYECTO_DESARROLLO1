package com.example.backend.controller;

import com.example.backend.dto.AccionModeracionRequest;
import com.example.backend.dto.ReporteResenaResponse;
import com.example.backend.dto.ResenaReportadaResponse;
import com.example.backend.entity.EstadoReporte;
import com.example.backend.service.ReporteResenaService;
import jakarta.validation.Valid;
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
 * Controlador REST para la moderación de reseñas y reportes.
 * Tareas:
 * - S2-42: Consulta de reseñas pendientes, reportadas y cola de moderación.
 * - S2-43: Acciones operativas de moderación (ocultar, publicar, rechazar reportes).
 *
 * Requiere autenticación Bearer con cuenta activa y rol Moderador o Administrador activo.
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

    /**
     * S2-43: Oculta manualmente una reseña por incumplimiento de normas.
     * Establece ocultaPorModeracion = true sin alterar ocultaPorReportes.
     */
    @RequestMapping(
            value = "/api/moderacion/resenas/{idResena}/ocultar",
            method = {RequestMethod.PUT, RequestMethod.POST}
    )
    public ResenaReportadaResponse ocultarResena(
            @PathVariable Long idResena,
            @Valid @RequestBody(required = false) AccionModeracionRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return reporteResenaService.ocultarResena(idResena, request, jwt);
    }

    /**
     * S2-43: Restaura la visibilidad de una reseña oculta por moderación (ocultaPorModeracion = false).
     */
    @RequestMapping(
            value = "/api/moderacion/resenas/{idResena}/publicar",
            method = {RequestMethod.PUT, RequestMethod.POST}
    )
    public ResenaReportadaResponse publicarResena(
            @PathVariable Long idResena,
            @Valid @RequestBody(required = false) AccionModeracionRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return reporteResenaService.publicarResena(idResena, request, jwt);
    }

    /**
     * S2-43: Rechaza en lote los reportes en revisión de una reseña.
     * Si los reportes no rechazados bajan de 3, restablece ocultaPorReportes = false.
     */
    @RequestMapping(
            value = {
                    "/api/moderacion/resenas/{idResena}/rechazar-reportes",
                    "/api/moderacion/resenas/{idResena}/rechazar"
            },
            method = {RequestMethod.PUT, RequestMethod.POST}
    )
    public ResenaReportadaResponse rechazarReportesDeResena(
            @PathVariable Long idResena,
            @Valid @RequestBody(required = false) AccionModeracionRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return reporteResenaService.rechazarReportesDeResena(idResena, request, jwt);
    }

    /**
     * S2-43: Rechaza un reporte individual específico en estado EN_REVISION.
     */
    @RequestMapping(
            value = "/api/moderacion/reportes/{idReporte}/rechazar",
            method = {RequestMethod.PUT, RequestMethod.POST}
    )
    public ReporteResenaResponse rechazarReporteIndividual(
            @PathVariable Long idReporte,
            @Valid @RequestBody(required = false) AccionModeracionRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return reporteResenaService.rechazarReporteIndividual(idReporte, request, jwt);
    }
}
