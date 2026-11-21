package com.example.backend.controller;

import com.example.backend.dto.AccionModeracionRequest;
import com.example.backend.dto.ResenaEnRevisionResponse;
import com.example.backend.service.RevisionResenasService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

/**
 * Cola de revisión de reseñas retenidas por el filtro automático.
 * <p>
 * Es distinta de la cola de reportes: aquí ningún usuario ha reportado la
 * reseña; el filtro la retuvo antes de publicarla. Las rutas viven bajo
 * /api/moderacion/**, protegidas por ModeratorAuthorizationManager.
 */
@RestController
@RequestMapping("/api/moderacion/resenas")
public class RevisionResenasController {

    private final RevisionResenasService revisionResenasService;

    public RevisionResenasController(RevisionResenasService revisionResenasService) {
        this.revisionResenasService = revisionResenasService;
    }

    @GetMapping("/en-revision")
    public List<ResenaEnRevisionResponse> listarPendientes(@AuthenticationPrincipal Jwt jwt) {
        return revisionResenasService.listarPendientes(jwt);
    }

    @RequestMapping(
            value = "/{idResena}/revision/aprobar",
            method = {RequestMethod.PUT, RequestMethod.POST}
    )
    public ResenaEnRevisionResponse aprobar(
            @PathVariable Long idResena,
            @Valid @RequestBody(required = false) AccionModeracionRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return revisionResenasService.aprobar(idResena, request, jwt);
    }

    @RequestMapping(
            value = "/{idResena}/revision/rechazar",
            method = {RequestMethod.PUT, RequestMethod.POST}
    )
    public ResenaEnRevisionResponse rechazar(
            @PathVariable Long idResena,
            @Valid @RequestBody(required = false) AccionModeracionRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return revisionResenasService.rechazar(idResena, request, jwt);
    }
}
