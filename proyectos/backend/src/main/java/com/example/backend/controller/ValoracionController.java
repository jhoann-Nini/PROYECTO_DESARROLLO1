package com.example.backend.controller;

import com.example.backend.dto.ValoracionPublicaStats;
import com.example.backend.dto.ValoracionRequest;
import com.example.backend.dto.ValoracionResponse;
import com.example.backend.repository.ResenaRepository;
import com.example.backend.service.ValoracionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Controlador REST para registrar y consultar valoraciones de productos con autenticación JWT de Supabase.
 */
@RestController
public class ValoracionController {

    private final ValoracionService valoracionService;
    private final ResenaRepository resenaRepository;

    public ValoracionController(ValoracionService valoracionService, ResenaRepository resenaRepository) {
        this.valoracionService = valoracionService;
        this.resenaRepository = resenaRepository;
    }

    /**
     * Endpoint protegido para registrar o actualizar la valoración activa del usuario para un producto.
     */
    @PostMapping("/api/valoraciones")
    @ResponseStatus(HttpStatus.GONE)
    public void crearOActualizar(
            @Valid @RequestBody ValoracionRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        // Compatibility endpoint: no operation performed.
        // Returns HTTP 410 Gone to indicate deprecation.
    }

    /**
     * Endpoint protegido para consultar la valoración que el usuario actual ha emitido sobre un producto.
     */
    @GetMapping("/api/valoraciones/mi-valoracion")
    public ResponseEntity<ValoracionResponse> obtenerMiValoracion(
            @RequestParam Long idProducto,
            @AuthenticationPrincipal Jwt jwt) {
        return valoracionService.obtenerMiValoracion(idProducto, jwt)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    /**
     * Endpoint público para consultar el promedio y la cantidad de valoraciones activas de un producto.
     * No requiere autenticación. Se utiliza en la ficha técnica de cada producto.
     *
     * @param idProducto Identificador único del producto.
     * @return Estadísticas de valoración: promedio (escala 1-5) y total de valoraciones activas.
     */
    @GetMapping("/api/productos/{idProducto}/valoracion-stats")
    public ValoracionPublicaStats obtenerValoracionStats(@PathVariable Long idProducto) {
        Double promedio = resenaRepository.findPromedioByProducto(idProducto);
        Long cantidad = resenaRepository.countByProducto(idProducto);

        Double promedioRedondeado = (promedio != null)
                ? BigDecimal.valueOf(promedio).setScale(2, RoundingMode.HALF_UP).doubleValue()
                : null;

        return new ValoracionPublicaStats(
                idProducto,
                promedioRedondeado,
                cantidad != null ? cantidad : 0L
        );
    }
}

