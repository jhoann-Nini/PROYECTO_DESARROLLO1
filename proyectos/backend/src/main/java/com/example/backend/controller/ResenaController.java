package com.example.backend.controller;

import com.example.backend.dto.ResenaRequest;
import com.example.backend.dto.ResenaResponse;
import com.example.backend.dto.ResenaUpdateRequest;
import com.example.backend.service.ResenaService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

/**
 * Controlador REST para consultar, publicar y actualizar reseñas de productos.
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
        ResenaRequest requestEfectivo = new ResenaRequest(
                idProducto,
                request.comentario(),
                request.titulo(),
                request.ventajas(),
                request.desventajas()
        );
        return resenaService.crearOActualizar(requestEfectivo, jwt);
    }

    /**
     * Actualización protegida de reseña por ID (S2-17). Requiere autenticación Bearer y ser el autor.
     */
    @PutMapping("/api/resenas/{idResena}")
    public ResenaResponse actualizar(
            @PathVariable Long idResena,
            @Valid @RequestBody ResenaUpdateRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return resenaService.actualizar(idResena, request, jwt);
    }

    /**
     * Actualización protegida de reseña especificando producto y reseña en la ruta (S2-17).
     */
    @PutMapping("/api/productos/{idProducto}/resenas/{idResena}")
    public ResenaResponse actualizarParaProducto(
            @PathVariable Long idProducto,
            @PathVariable Long idResena,
            @Valid @RequestBody ResenaUpdateRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return resenaService.actualizar(idResena, request, jwt);
    }
}
