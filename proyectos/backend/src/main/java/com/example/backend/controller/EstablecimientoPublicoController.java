package com.example.backend.controller;

import com.example.backend.dto.EstablecimientoResponse;
import com.example.backend.dto.EstablecimientoUpdateRequest;
import com.example.backend.service.EstablecimientoService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Consulta pública del catálogo de establecimientos y administración
 * de sus datos básicos. Las lecturas son anónimas; las escrituras
 * requieren el rol Administrador según SecurityConfig.
 */
@RestController
@RequestMapping("/api/establecimientos")
public class EstablecimientoPublicoController {

    private final EstablecimientoService establecimientoService;

    public EstablecimientoPublicoController(EstablecimientoService establecimientoService) {
        this.establecimientoService = establecimientoService;
    }

    @GetMapping
    public List<EstablecimientoResponse> listar() {
        return establecimientoService.listarPublicos();
    }

    @GetMapping("/{idEstablecimiento}")
    public EstablecimientoResponse obtener(@PathVariable Long idEstablecimiento) {
        return establecimientoService.obtenerPublico(idEstablecimiento);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public EstablecimientoResponse crear(@Valid @RequestBody EstablecimientoUpdateRequest request) {
        return establecimientoService.crear(request);
    }

    @PutMapping("/{idEstablecimiento}")
    public EstablecimientoResponse actualizar(
            @PathVariable Long idEstablecimiento,
            @Valid @RequestBody EstablecimientoUpdateRequest request) {
        return establecimientoService.actualizarAdministrativo(idEstablecimiento, request);
    }

    @DeleteMapping("/{idEstablecimiento}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable Long idEstablecimiento) {
        establecimientoService.eliminar(idEstablecimiento);
    }
}
