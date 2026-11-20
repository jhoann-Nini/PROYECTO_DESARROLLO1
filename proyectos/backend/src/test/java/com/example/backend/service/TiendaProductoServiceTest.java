package com.example.backend.service;

import com.example.backend.dto.TiendaProductoResponse;
import com.example.backend.entity.Establecimiento;
import com.example.backend.entity.Producto;
import com.example.backend.entity.ProductoEstablecimiento;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.repository.ProductoEstablecimientoRepository;
import com.example.backend.repository.ProductoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TiendaProductoServiceTest {

  @Mock
  private ProductoRepository productoRepository;

  @Mock
  private ProductoEstablecimientoRepository productoEstablecimientoRepository;

  @InjectMocks
  private TiendaProductoService tiendaProductoService;

  private Producto producto;

  @BeforeEach
  void setUp() {
    producto = new Producto();
    producto.setIdProducto(1L);
    producto.setEstado(true);
  }

  @Test
  @DisplayName("Devuelve las tiendas disponibles de un producto")
  void devuelveTiendasDisponibles() {
    Establecimiento tienda = new Establecimiento();
    tienda.setIdEstablecimiento(10L);
    tienda.setNombre("Tienda Central");
    tienda.setDireccion("Calle 10");

    ProductoEstablecimiento relacion = new ProductoEstablecimiento();
    relacion.setProducto(producto);
    relacion.setEstablecimiento(tienda);
    relacion.setPrecio(new BigDecimal("85000.00"));
    relacion.setDisponibilidad(true);

    when(productoRepository.findById(1L))
      .thenReturn(Optional.of(producto));

    when(productoEstablecimientoRepository
      .findTiendasDisponiblesPorProducto(1L))
      .thenReturn(List.of(relacion));

    List<TiendaProductoResponse> resultado =
      tiendaProductoService.listarPorProducto(1L);

    assertEquals(1, resultado.size());
    assertEquals("Tienda Central", resultado.get(0).nombre());
    assertEquals("Calle 10", resultado.get(0).direccion());
    assertEquals(0, new BigDecimal("85000.00")
      .compareTo(resultado.get(0).precio()));
    assertTrue(resultado.get(0).disponibilidad());
  }

  @Test
  @DisplayName("Producto sin tiendas devuelve lista vacía")
  void productoSinTiendas() {
    when(productoRepository.findById(1L))
      .thenReturn(Optional.of(producto));

    when(productoEstablecimientoRepository
      .findTiendasDisponiblesPorProducto(1L))
      .thenReturn(List.of());

    List<TiendaProductoResponse> resultado =
      tiendaProductoService.listarPorProducto(1L);

    assertTrue(resultado.isEmpty());
  }

  @Test
  @DisplayName("Producto inexistente genera excepción")
  void productoInexistente() {
    when(productoRepository.findById(999L))
      .thenReturn(Optional.empty());

    assertThrows(
      ResourceNotFoundException.class,
      () -> tiendaProductoService.listarPorProducto(999L)
    );

    verifyNoInteractions(productoEstablecimientoRepository);
  }

  @Test
  @DisplayName("Producto inactivo genera excepción")
  void productoInactivo() {
    producto.setEstado(false);

    when(productoRepository.findById(1L))
      .thenReturn(Optional.of(producto));

    assertThrows(
      ResourceNotFoundException.class,
      () -> tiendaProductoService.listarPorProducto(1L)
    );

    verifyNoInteractions(productoEstablecimientoRepository);
  }
}
