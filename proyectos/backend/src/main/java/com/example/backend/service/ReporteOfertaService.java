
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
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ReporteOfertaService {

  private final ReporteOfertaRepository reporteOfertaRepository;
  private final ProductoEstablecimientoRepository productoEstablecimientoRepository;
  private final UsuarioService usuarioService;

  public ReporteOfertaService(
    ReporteOfertaRepository reporteOfertaRepository,
    ProductoEstablecimientoRepository productoEstablecimientoRepository,
    UsuarioService usuarioService) {

    this.reporteOfertaRepository = reporteOfertaRepository;
    this.productoEstablecimientoRepository = productoEstablecimientoRepository;
    this.usuarioService = usuarioService;
  }

  /**
   * Registra un reporte sobre un precio o enlace incorrecto.
   * El usuario se obtiene del JWT autenticado.
   */
  @Transactional
  public ReporteOfertaResponse crearReporte(
    ReporteOfertaRequest request,
    Jwt jwt) {

    // 1. Obtener al usuario autenticado.
    Usuario usuario = usuarioService.obtenerUsuarioDesdeJwt(jwt);

    // 2. Comprobar que la oferta realmente existe.
    ProductoEstablecimientoId ofertaId =
      new ProductoEstablecimientoId(
        request.idProducto(),
        request.idEstablecimiento()
      );

    if (!productoEstablecimientoRepository.existsById(ofertaId)) {
      throw new ResponseStatusException(
        HttpStatus.NOT_FOUND,
        "No existe una oferta para el producto y establecimiento indicados."
      );
    }

    // 3. Referenciar el producto y el establecimiento.
    Producto producto = new Producto();
    producto.setIdProducto(request.idProducto());

    Establecimiento establecimiento = new Establecimiento();
    establecimiento.setIdEstablecimiento(request.idEstablecimiento());

    // 4. Construir el reporte.
    ReporteOferta reporte = new ReporteOferta();
    reporte.setProducto(producto);
    reporte.setEstablecimiento(establecimiento);
    reporte.setUsuario(usuario);
    reporte.setMotivo(request.motivo());
    reporte.setDescripcion(request.descripcion());
    reporte.setEstado(EstadoReporte.PENDIENTE);

    // 5. Guardar en PostgreSQL.
    ReporteOferta guardado = reporteOfertaRepository.save(reporte);

    // 6. Preparar la respuesta HTTP.
    return new ReporteOfertaResponse(
      guardado.getIdReporte(),
      guardado.getProducto().getIdProducto(),
      guardado.getEstablecimiento().getIdEstablecimiento(),
      guardado.getMotivo(),
      guardado.getDescripcion(),
      guardado.getEstado(),
      guardado.getFechaCreacion()
    );
  }
}
