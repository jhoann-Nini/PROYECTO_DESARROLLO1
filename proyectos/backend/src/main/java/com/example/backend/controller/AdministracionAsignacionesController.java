package com.example.backend.controller;

import com.example.backend.dto.AsignacionRequest;
import com.example.backend.service.AdministracionAsignacionesService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
public class AdministracionAsignacionesController {
    private final AdministracionAsignacionesService service;

    public AdministracionAsignacionesController(AdministracionAsignacionesService service) {
        this.service = service;
    }

    @PostMapping("/usuarios/{usuarioId}/roles/{rolId}")
    @ResponseStatus(HttpStatus.CREATED)
    public void asignarRol(@PathVariable Long usuarioId, @PathVariable Long rolId,
                           @Valid @RequestBody(required = false) AsignacionRequest request,
                           @AuthenticationPrincipal Jwt jwt) {
        service.asignarRol(usuarioId, rolId, jwt.getSubject(), request == null ? null : request.motivo());
    }

    @DeleteMapping("/usuarios/{usuarioId}/roles/{rolId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revocarRol(@PathVariable Long usuarioId, @PathVariable Long rolId,
                           @Valid @RequestBody(required = false) AsignacionRequest request,
                           @AuthenticationPrincipal Jwt jwt) {
        service.revocarRol(usuarioId, rolId, jwt.getSubject(), request == null ? null : request.motivo());
    }

    @PostMapping("/usuarios/{usuarioId}/establecimientos/{establecimientoId}/representacion")
    @ResponseStatus(HttpStatus.CREATED)
    public void asignarRepresentante(@PathVariable Long usuarioId, @PathVariable Long establecimientoId,
                                     @Valid @RequestBody(required = false) AsignacionRequest request,
                                     @AuthenticationPrincipal Jwt jwt) {
        service.asignarRepresentante(usuarioId, establecimientoId, jwt.getSubject(),
                request == null ? null : request.motivo());
    }

    @DeleteMapping("/usuarios/{usuarioId}/establecimientos/{establecimientoId}/representacion")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revocarRepresentante(@PathVariable Long usuarioId, @PathVariable Long establecimientoId,
                                     @Valid @RequestBody(required = false) AsignacionRequest request,
                                     @AuthenticationPrincipal Jwt jwt) {
        service.revocarRepresentante(usuarioId, establecimientoId, jwt.getSubject(),
                request == null ? null : request.motivo());
    }
}
