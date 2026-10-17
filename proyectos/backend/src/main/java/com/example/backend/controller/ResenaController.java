package com.example.backend.controller;

import com.example.backend.dto.ResenaRequest;
import com.example.backend.dto.ResenaResponse;
import com.example.backend.service.ResenaService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

/**
 * Controlador REST para consultar y publicar reseñas de productos.
 */
@RestController
public class ResenaController {

    private final ResenaService resenaService;

    public ResenaController(ResenaService resenaService) {
        this.resenaService = resenaService;
    }

    /**
     * Consulta pública de reseñas. Admite filtrado opcional por idProducto.
     */
    @GetMapping("/api/resenas")
    public List<ResenaResponse> listar(@RequestParam(required = false) Long idProducto) {
        return resenaService.listar(idProducto);
    }

    /**
     * Consulta pública de reseñas asociadas a un producto específico.
     */
    @GetMapping("/api/productos/{idProducto}/resenas")
    public List<ResenaResponse> listarPorProducto(@PathVariable Long idProducto) {
        return resenaService.listar(idProducto);
    }

    /**
     * Publicación protegida de reseña. Requiere autenticación Bearer con token JWT válido de Supabase.
     * La identidad del autor se extrae exclusivamente del JWT.
     */
    @PostMapping("/api/resenas")
    @ResponseStatus(HttpStatus.CREATED)
    public ResenaResponse crear(
            @Valid @RequestBody ResenaRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return resenaService.crearOActualizar(request, jwt);
    }

    /**
     * Publicación protegida de reseña especificando el id del producto en la ruta.
     */
    @PostMapping("/api/productos/{idProducto}/resenas")
    @ResponseStatus(HttpStatus.CREATED)
    public ResenaResponse crearParaProducto(
            @PathVariable Long idProducto,
            @Valid @RequestBody ResenaRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        ResenaRequest requestEfectivo = new ResenaRequest(idProducto, request.comentario());
        return resenaService.crearOActualizar(requestEfectivo, jwt);
    }
}
