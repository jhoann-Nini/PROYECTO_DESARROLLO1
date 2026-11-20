package com.example.backend.controller;

import com.example.backend.dto.TiendaProductoResponse;
import com.example.backend.service.TiendaProductoService;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoint público para consultar las tiendas
 * que ofrecen un producto.
 * <p>
 * Ticket: TEC-134
 */
@RestController
@RequestMapping("/api/productos")
public class TiendaProductoController {

  private final TiendaProductoService tiendaProductoService;

  public TiendaProductoController(
    TiendaProductoService tiendaProductoService) {
    this.tiendaProductoService = tiendaProductoService;
  }

  @GetMapping("/{idProducto}/establecimientos")
  public List<TiendaProductoResponse> listarTiendas(
    @PathVariable Long idProducto) {

    return tiendaProductoService.listarPorProducto(idProducto);
  }
}
