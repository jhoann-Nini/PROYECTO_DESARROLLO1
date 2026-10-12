package com.example.backend.controller;

import com.example.backend.dto.MarcaRequest;
import com.example.backend.dto.MarcaResponse;
import com.example.backend.service.MarcaService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/marcas")
public class MarcaController {

    private final MarcaService marcaService;

    public MarcaController(MarcaService marcaService) {
        this.marcaService = marcaService;
    }

    @GetMapping
    public List<MarcaResponse> listar() {
        return marcaService.listarActivas();
    }

    @GetMapping("/{id}")
    public MarcaResponse obtener(@PathVariable Long id) {
        return marcaService.obtenerPorId(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MarcaResponse crear(@Valid @RequestBody MarcaRequest request) {
        return marcaService.crear(request);
    }

    @PutMapping("/{id}")
    public MarcaResponse actualizar(@PathVariable Long id, @Valid @RequestBody MarcaRequest request) {
        return marcaService.actualizar(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        marcaService.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
