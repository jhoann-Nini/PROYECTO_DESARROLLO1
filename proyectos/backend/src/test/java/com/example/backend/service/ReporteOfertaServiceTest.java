
package com.example.backend.service;

import com.example.backend.dto.ReporteOfertaRequest;
import com.example.backend.dto.ReporteOfertaResponse;
import com.example.backend.entity.EstadoReporte;
import com.example.backend.entity.Establecimiento;
import com.example.backend.entity.Producto;
import com.example.backend.entity.ProductoEstablecimientoId;
import com.example.backend.entity.ReporteOferta;
import com.example.backend.entity.Usuario;
import com.example.backend.repository.ProductoEstablecimientoRepository;
import com.example.backend.repository.ReporteOfertaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReporteOfertaServiceTest {

  @Mock
  private ReporteOfertaRepository reporteOfertaRepository;

  @Mock
  private ProductoEstablecimientoRepository productoEstablecimientoRepository;

  @Mock
  private UsuarioService usuarioService;

  @Mock
  private Jwt jwt;

  @InjectMocks
  private ReporteOfertaService reporteOfertaService;

  private Usuario usuario;

  @BeforeEach
  void configurar() {
    usuario = new Usuario();
    usuario.setIdUsuario(1L);
  }

  @Test
  void debeCrearReporteDePrecioIncorrecto() {
    ReporteOfertaRequest request = new ReporteOfertaRequest(
      10L, 20L, "precio_incorrecto", "Precio equivocado"
    );

    when(usuarioService.obtenerUsuarioDesdeJwt(jwt))
      .thenReturn(usuario);

    when(productoEstablecimientoRepository.existsById(
      new ProductoEstablecimientoId(10L, 20L)))
      .thenReturn(true);

    when(reporteOfertaRepository.save(any(ReporteOferta.class)))
      .thenAnswer(invocation -> {
        ReporteOferta reporte = invocation.getArgument(0);
        reporte.setIdReporte(100L);
        return reporte;
      });

    ReporteOfertaResponse respuesta =
      reporteOfertaService.crearReporte(request, jwt);

    assertEquals(100L, respuesta.idReporte());
    assertEquals(10L, respuesta.idProducto());
    assertEquals(20L, respuesta.idEstablecimiento());
    assertEquals("precio_incorrecto", respuesta.motivo());
    assertEquals(EstadoReporte.PENDIENTE, respuesta.estado());

    verify(reporteOfertaRepository).save(any(ReporteOferta.class));
  }

  @Test
  void debeCrearReporteDeEnlaceIncorrecto() {
    ReporteOfertaRequest request = new ReporteOfertaRequest(
      10L, 20L, "enlace_incorrecto", "Enlace roto"
    );

    when(usuarioService.obtenerUsuarioDesdeJwt(jwt))
      .thenReturn(usuario);

    when(productoEstablecimientoRepository.existsById(any()))
      .thenReturn(true);

    when(reporteOfertaRepository.save(any(ReporteOferta.class)))
      .thenAnswer(invocation -> {
        ReporteOferta reporte = invocation.getArgument(0);
        reporte.setIdReporte(101L);
        return reporte;
      });

    ReporteOfertaResponse respuesta =
      reporteOfertaService.crearReporte(request, jwt);

    assertEquals("enlace_incorrecto", respuesta.motivo());
    assertEquals(EstadoReporte.PENDIENTE, respuesta.estado());
  }

  @Test
  void debeRechazarOfertaInexistente() {
    ReporteOfertaRequest request = new ReporteOfertaRequest(
      999L, 888L, "precio_incorrecto", "No existe"
    );

    when(usuarioService.obtenerUsuarioDesdeJwt(jwt))
      .thenReturn(usuario);

    when(productoEstablecimientoRepository.existsById(any()))
      .thenReturn(false);

    ResponseStatusException exception = assertThrows(
      ResponseStatusException.class,
      () -> reporteOfertaService.crearReporte(request, jwt)
    );

    assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());

    verify(reporteOfertaRepository, never()).save(any());
  }

  @Test
  void debeGuardarUsuarioAutenticado() {
    ReporteOfertaRequest request = new ReporteOfertaRequest(
      10L, 20L, "precio_incorrecto", "Precio incorrecto"
    );

    when(usuarioService.obtenerUsuarioDesdeJwt(jwt))
      .thenReturn(usuario);

    when(productoEstablecimientoRepository.existsById(any()))
      .thenReturn(true);

    when(reporteOfertaRepository.save(any(ReporteOferta.class)))
      .thenAnswer(invocation -> {
        ReporteOferta reporte = invocation.getArgument(0);
        assertSame(usuario, reporte.getUsuario());
        reporte.setIdReporte(102L);
        return reporte;
      });

    reporteOfertaService.crearReporte(request, jwt);

    verify(usuarioService).obtenerUsuarioDesdeJwt(jwt);
    verify(reporteOfertaRepository).save(any(ReporteOferta.class));
  }
}
