package com.example.backend.controller;

import com.example.backend.dto.ValoracionPublicaStats;
import com.example.backend.dto.ValoracionRequest;
import com.example.backend.dto.ValoracionResponse;
import com.example.backend.repository.ValoracionRepository;
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
    private final ValoracionRepository valoracionRepository;

    public ValoracionController(ValoracionService valoracionService, ValoracionRepository valoracionRepository) {
        this.valoracionService = valoracionService;
        this.valoracionRepository = valoracionRepository;
    }

    /**
     * Endpoint protegido para registrar o actualizar la valoración activa del usuario para un producto.
     */
    @PostMapping("/api/valoraciones")
    @ResponseStatus(HttpStatus.CREATED)
    public ValoracionResponse crearOActualizar(
            @Valid @RequestBody ValoracionRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return valoracionService.crearOActualizar(request, jwt);
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
        Double promedio = valoracionRepository.findPromedioByProducto(idProducto);
        Long cantidad = valoracionRepository.countByProducto(idProducto);

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

