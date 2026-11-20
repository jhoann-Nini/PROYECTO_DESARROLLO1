
package com.example.backend.service;

import com.example.backend.dto.TiendaProductoResponse;
import com.example.backend.entity.Establecimiento;
import com.example.backend.entity.ProductoEstablecimiento;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.repository.ProductoEstablecimientoRepository;
import com.example.backend.repository.ProductoRepository;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Servicio para consultar los establecimientos
 * que ofrecen un producto.
 * <p>
 * Ticket: TEC-134.
 */
@Service
public class TiendaProductoService {

  private final ProductoRepository productoRepository;
  private final ProductoEstablecimientoRepository productoEstablecimientoRepository;

  public TiendaProductoService(
    ProductoRepository productoRepository,
    ProductoEstablecimientoRepository productoEstablecimientoRepository) {
    this.productoRepository = productoRepository;
    this.productoEstablecimientoRepository = productoEstablecimientoRepository;
  }

  @Transactional(readOnly = true)
  public List<TiendaProductoResponse> listarPorProducto(Long idProducto) {

    // Validar que el producto exista y esté activo.
    productoRepository.findById(idProducto)
      .filter(producto -> Boolean.TRUE.equals(producto.getEstado()))
      .orElseThrow(() -> new ResourceNotFoundException(
        "Producto no encontrado con id " + idProducto
      ));

    // Consultar las tiendas disponibles para el producto.
    return productoEstablecimientoRepository
      .findTiendasDisponiblesPorProducto(idProducto)
      .stream()
      .map(this::toResponse)
      .toList();
  }

  /**
   * Convierte una relación JPA en un DTO público.
   */
  private TiendaProductoResponse toResponse(
    ProductoEstablecimiento relacion) {

    Establecimiento tienda = relacion.getEstablecimiento();

    return new TiendaProductoResponse(
      tienda.getIdEstablecimiento(),
      tienda.getNombre(),
      tienda.getDireccion(),
      tienda.getTelefono(),
      tienda.getCorreo(),
      tienda.getLatitud(),
      tienda.getLongitud(),
      relacion.getPrecio(),
      relacion.getDisponibilidad()
    );
  }
}
