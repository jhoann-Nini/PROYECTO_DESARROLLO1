package com.example.backend.controller;

import com.example.backend.dto.ProductoRequest;
import com.example.backend.dto.ProductoResponse;
import com.example.backend.service.ProductoService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/productos")
public class ProductoController {

  private final ProductoService productoService;

  public ProductoController(ProductoService productoService) {
    this.productoService = productoService;
  }

  @GetMapping
  public List<ProductoResponse> listar() {
    return productoService.listarActivos();
  }

  @GetMapping("/{id}")
  public ProductoResponse obtener(@PathVariable Long id) {
    return productoService.obtenerPorId(id);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public ProductoResponse crear(@Valid @RequestBody ProductoRequest request) {
    return productoService.crear(request);
  }

  @PutMapping("/{id}")
  public ProductoResponse actualizar(
    @PathVariable Long id,
    @Valid @RequestBody ProductoRequest request) {
    return productoService.actualizar(id, request);
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> eliminar(@PathVariable Long id) {
    productoService.eliminar(id);
    return ResponseEntity.noContent().build();
  }
}
