package com.example.backend.controller;

import com.example.backend.dto.ProductoDeseadoResponse;
import com.example.backend.dto.ProductoMasComentadoResponse;
import com.example.backend.dto.ProductoMejorValoradoResponse;
import com.example.backend.dto.ProductoOfertaResponse;
import com.example.backend.service.RankingService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Controlador REST para consultar rankings calculados a partir de información real
 * almacenada en la base de datos de TecReview.
 *
 * Expone rutas bajo /api/productos/rankings y /api/rankings para máxima compatibilidad REST.
 */
@RestController
@RequestMapping({"/api/productos/rankings", "/api/rankings"})
public class RankingController {

    private final RankingService rankingService;

    public RankingController(RankingService rankingService) {
        this.rankingService = rankingService;
    }

    /**
     * Ranking 1: Productos mejor valorados de acuerdo al promedio de calificaciones de los usuarios.
     */
    @GetMapping({"/mejor-valorados", "/valorados"})
    public List<ProductoMejorValoradoResponse> obtenerMejorValorados(
            @RequestParam(defaultValue = "10") Integer limit) {
        return rankingService.obtenerMejorValorados(limit);
    }

    /**
     * Ranking 2: Productos más deseados.
     * Retorna una lista vacía por fidelidad de datos (sin inventar favoritos ficticios)
     * al no existir actualmente persistencia de favoritos en la base de datos.
     */
    @GetMapping({"/mas-deseados", "/deseados"})
    public List<ProductoDeseadoResponse> obtenerMasDeseados(
            @RequestParam(defaultValue = "10") Integer limit) {
        return rankingService.obtenerMasDeseados(limit);
    }

    /**
     * Ranking 2 alternativo: Productos con mayor interacción de la comunidad (más comentados/reseñados).
     */
    @GetMapping({"/mas-comentados", "/comentados"})
    public List<ProductoMasComentadoResponse> obtenerMasComentados(
            @RequestParam(defaultValue = "10") Integer limit) {
        return rankingService.obtenerMasComentados(limit);
    }

    /**
     * Ranking 3: Ofertas destacadas calculadas comparando precios de establecimientos con el precio de referencia.
     */
    @GetMapping({"/ofertas", "/ofertas-destacadas"})
    public List<ProductoOfertaResponse> obtenerOfertasDestacadas(
            @RequestParam(defaultValue = "10") Integer limit) {
        return rankingService.obtenerOfertasDestacadas(limit);
    }
}
