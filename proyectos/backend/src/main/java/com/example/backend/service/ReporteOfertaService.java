
package com.example.backend.service;

import com.example.backend.dto.ReporteOfertaRequest;
import com.example.backend.dto.ReporteOfertaResponse;
import com.example.backend.entity.EstadoReporte;
import com.example.backend.entity.Establecimiento;
import com.example.backend.entity.Producto;
import com.example.backend.entity.ProductoEstablecimientoId;
import com.example.backend.entity.ReporteOferta;
import com.example.backend.entity.Usuario;
import com.example.backend.exception.ConflictException;
import com.example.backend.repository.ProductoEstablecimientoRepository;
import com.example.backend.repository.ReporteOfertaRepository;
import java.util.List;
import org.springframework.dao.DataIntegrityViolationException;
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
  private final LimiteReportesService limiteReportesService;
  private final ReincidenciaService reincidenciaService;

  static final String MENSAJE_REPORTE_ABIERTO =
    "Ya tienes un reporte abierto sobre esta oferta. Espera a que moderación lo revise.";

  private static final List<EstadoReporte> ESTADOS_ABIERTOS =
    List.of(EstadoReporte.PENDIENTE, EstadoReporte.EN_REVISION);

  public ReporteOfertaService(
    ReporteOfertaRepository reporteOfertaRepository,
    ProductoEstablecimientoRepository productoEstablecimientoRepository,
    UsuarioService usuarioService,
    LimiteReportesService limiteReportesService,
    ReincidenciaService reincidenciaService) {
    this.reincidenciaService = reincidenciaService;

    this.reporteOfertaRepository = reporteOfertaRepository;
    this.productoEstablecimientoRepository = productoEstablecimientoRepository;
    this.usuarioService = usuarioService;
    this.limiteReportesService = limiteReportesService;
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
    if (!Boolean.TRUE.equals(usuario.getEstado())) {
      throw new ResponseStatusException(
        HttpStatus.FORBIDDEN, "Usuario inactivo o suspendido.");
    }
    // Caso 6: con bloqueo por reincidencia no se reporta.
    reincidenciaService.verificarPuedePublicar(usuario.getIdUsuario());

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

    // 3. Un solo reporte abierto por usuario y oferta (migración 021),
    //    y no más de 10 reportes por hora entre reseñas y ofertas.
    if (reporteOfertaRepository
      .existsByUsuarioIdUsuarioAndProductoIdProductoAndEstablecimientoIdEstablecimientoAndEstadoIn(
        usuario.getIdUsuario(), request.idProducto(), request.idEstablecimiento(), ESTADOS_ABIERTOS)) {
      throw new ConflictException(MENSAJE_REPORTE_ABIERTO);
    }
    limiteReportesService.verificarLimite(usuario);

    // 4. Referenciar el producto y el establecimiento.
    Producto producto = new Producto();
    producto.setIdProducto(request.idProducto());

    Establecimiento establecimiento = new Establecimiento();
    establecimiento.setIdEstablecimiento(request.idEstablecimiento());

    // 5. Construir el reporte.
    ReporteOferta reporte = new ReporteOferta();
    reporte.setProducto(producto);
    reporte.setEstablecimiento(establecimiento);
    reporte.setUsuario(usuario);
    reporte.setMotivo(request.motivo());
    reporte.setDescripcion(request.descripcion());
    reporte.setEstado(EstadoReporte.PENDIENTE);

    // 6. Guardar en PostgreSQL. El índice único parcial cubre la carrera
    //    entre dos peticiones simultáneas del mismo usuario.
    ReporteOferta guardado;
    try {
      guardado = reporteOfertaRepository.save(reporte);
      reporteOfertaRepository.flush();
    } catch (DataIntegrityViolationException ex) {
      if (esReporteAbiertoDuplicado(ex)) {
        throw new ConflictException(MENSAJE_REPORTE_ABIERTO);
      }
      throw ex;
    }

    // 7. Preparar la respuesta HTTP.
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

  private static boolean esReporteAbiertoDuplicado(DataIntegrityViolationException ex) {
    String mensaje = ex.getMostSpecificCause().getMessage();
    return mensaje != null
      && mensaje.toLowerCase().contains("uq_reporte_oferta_abierto_usuario");
  }
}
