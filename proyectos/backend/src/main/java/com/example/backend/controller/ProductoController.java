package com.example.backend.controller;

import com.example.backend.dto.ProductoRequest;
import com.example.backend.dto.ProductoResponse;
import com.example.backend.service.CsvExportService;
import com.example.backend.service.ProductoService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@RestController
@RequestMapping("/api/productos")
public class ProductoController {

    private final ProductoService productoService;
    private final CsvExportService csvExportService;

    public ProductoController(ProductoService productoService) {
        this(productoService, (CsvExportService) null);
    }

    @Autowired
    public ProductoController(ProductoService productoService, @Autowired(required = false) CsvExportService csvExportService) {
        this.productoService = productoService;
        this.csvExportService = csvExportService;
    }

    @GetMapping("/exportar-csv")
    public ResponseEntity<byte[]> exportarCsv() {
        if (csvExportService == null) {
            throw new IllegalStateException("El servicio de exportación CSV no está disponible.");
        }
        byte[] csvBytes = csvExportService.exportarCatalogoCsv();
        String fecha = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
        String nombreArchivo = "catalogo_productos_" + fecha + ".csv";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/csv; charset=UTF-8"));
        headers.setContentDisposition(ContentDisposition.attachment().filename(nombreArchivo).build());
        headers.setCacheControl(CacheControl.noCache());

        return new ResponseEntity<>(csvBytes, headers, HttpStatus.OK);
    }

    @GetMapping
    public List<ProductoResponse> listar(
            @RequestParam(required = false) Long idCategoria,
            @RequestParam(required = false) Long idMarca) {

        if (idCategoria != null) {
            return productoService.listarPorCategoria(idCategoria);
        }

        if (idMarca != null) {
            return productoService.listarPorMarca(idMarca);
        }

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