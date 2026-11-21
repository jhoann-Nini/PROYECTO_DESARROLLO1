package com.example.backend.controller;

import com.example.backend.dto.ResumenOfertasProductoResponse;
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

  /**
   * Fase 4 (H-04): resumen de ofertas disponibles de todos los productos,
   * para mostrar la disponibilidad real en catálogo y comparador.
   */
  @GetMapping("/resumen-ofertas")
  public List<ResumenOfertasProductoResponse> resumirOfertas() {
    return tiendaProductoService.resumirOfertas();
  }

  @GetMapping("/{idProducto}/establecimientos")
  public List<TiendaProductoResponse> listarTiendas(
    @PathVariable Long idProducto) {

    return tiendaProductoService.listarPorProducto(idProducto);
  }
}
