package com.example.backend.service;

import com.example.backend.dto.OfertaAdminRequest;
import com.example.backend.dto.OfertaAdminResponse;
import com.example.backend.entity.Establecimiento;
import com.example.backend.entity.EstadoReporte;
import com.example.backend.entity.Producto;
import com.example.backend.entity.ProductoEstablecimiento;
import com.example.backend.entity.ProductoEstablecimientoId;
import com.example.backend.entity.Usuario;
import com.example.backend.exception.ConflictException;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.repository.EstablecimientoRepository;
import com.example.backend.repository.ProductoEstablecimientoRepository;
import com.example.backend.repository.ProductoRepository;
import com.example.backend.repository.ReporteOfertaRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Administración de ofertas: precio, disponibilidad y enlace de un producto
 * en una tienda (Fase 3, H-06). Completa TEC-116, que solo cubría el CRUD de
 * tiendas.
 * <p>
 * /api/admin/** ya exige rol de administrador en SecurityConfig; el servicio
 * vuelve a comprobar la cuenta y el rol activos.
 */
@Service
public class AdministracionOfertasService {

  static final String MENSAJE_OFERTA_CON_REPORTES =
    "La oferta tiene reportes asociados y no se puede eliminar. Márcala como no disponible.";

  private static final List<EstadoReporte> ESTADOS_ABIERTOS =
    List.of(EstadoReporte.PENDIENTE, EstadoReporte.EN_REVISION);

  private final ProductoEstablecimientoRepository ofertaRepository;
  private final ProductoRepository productoRepository;
  private final EstablecimientoRepository establecimientoRepository;
  private final ReporteOfertaRepository reporteOfertaRepository;
  private final UsuarioService usuarioService;

  public AdministracionOfertasService(
    ProductoEstablecimientoRepository ofertaRepository,
    ProductoRepository productoRepository,
    EstablecimientoRepository establecimientoRepository,
    ReporteOfertaRepository reporteOfertaRepository,
    UsuarioService usuarioService) {
    this.ofertaRepository = ofertaRepository;
    this.productoRepository = productoRepository;
    this.establecimientoRepository = establecimientoRepository;
    this.reporteOfertaRepository = reporteOfertaRepository;
    this.usuarioService = usuarioService;
  }

  @Transactional(readOnly = true)
  public List<OfertaAdminResponse> listar(Long idProducto, Jwt jwt) {
    validarAdministrador(jwt);
    return ofertaRepository.findParaAdministracion(idProducto).stream()
      .map(this::toResponse)
      .toList();
  }

  /**
   * Crea la oferta si no existe o la actualiza si ya existe.
   */
  @Transactional
  public OfertaAdminResponse guardar(
    Long idProducto, Long idEstablecimiento, OfertaAdminRequest request, Jwt jwt) {
    validarAdministrador(jwt);

    Producto producto = productoRepository.findById(idProducto)
      .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado con id " + idProducto));
    Establecimiento establecimiento = establecimientoRepository.findById(idEstablecimiento)
      .orElseThrow(() -> new ResourceNotFoundException(
        "Establecimiento no encontrado con id " + idEstablecimiento));

    String url = request.urlOferta() == null || request.urlOferta().isBlank()
      ? null
      : request.urlOferta().trim();

    ProductoEstablecimiento oferta = ofertaRepository
      .findById(new ProductoEstablecimientoId(idProducto, idEstablecimiento))
      .orElseGet(() -> {
        ProductoEstablecimiento nueva = new ProductoEstablecimiento();
        nueva.setProducto(producto);
        nueva.setEstablecimiento(establecimiento);
        return nueva;
      });

    boolean cambia = oferta.getPrecio() == null
      || oferta.getPrecio().compareTo(request.precio()) != 0
      || !Objects.equals(oferta.getDisponibilidad(), request.disponibilidad())
      || !Objects.equals(oferta.getUrlOferta(), url);

    oferta.setPrecio(request.precio());
    oferta.setDisponibilidad(request.disponibilidad());
    oferta.setUrlOferta(url);
    if (cambia) {
      // En PostgreSQL el trigger de la migración 022 fija la fecha definitiva.
      oferta.setFechaActualizacionPrecio(LocalDateTime.now());
    }

    try {
      return toResponse(ofertaRepository.saveAndFlush(oferta));
    } catch (DataIntegrityViolationException ex) {
      // Dos administradores crearon la misma oferta a la vez.
      throw new ConflictException("La oferta se modificó al mismo tiempo. Vuelve a intentarlo.");
    }
  }

  @Transactional
  public void eliminar(Long idProducto, Long idEstablecimiento, Jwt jwt) {
    validarAdministrador(jwt);

    ProductoEstablecimientoId id = new ProductoEstablecimientoId(idProducto, idEstablecimiento);
    if (!ofertaRepository.existsById(id)) {
      throw new ResourceNotFoundException("No existe una oferta para el producto y establecimiento indicados.");
    }
    if (reporteOfertaRepository.existsByProductoIdProductoAndEstablecimientoIdEstablecimiento(
      idProducto, idEstablecimiento)) {
      throw new ConflictException(MENSAJE_OFERTA_CON_REPORTES);
    }
    ofertaRepository.deleteById(id);
  }

  private OfertaAdminResponse toResponse(ProductoEstablecimiento oferta) {
    Producto producto = oferta.getProducto();
    Establecimiento tienda = oferta.getEstablecimiento();
    return new OfertaAdminResponse(
      producto.getIdProducto(),
      producto.getNombre(),
      tienda.getIdEstablecimiento(),
      tienda.getNombre(),
      Boolean.TRUE.equals(tienda.getEstado()),
      Boolean.TRUE.equals(tienda.getVerificado()),
      oferta.getPrecio(),
      oferta.getDisponibilidad(),
      oferta.getUrlOferta(),
      oferta.getFechaActualizacionPrecio(),
      reporteOfertaRepository.countByProductoIdProductoAndEstablecimientoIdEstablecimientoAndEstadoIn(
        producto.getIdProducto(), tienda.getIdEstablecimiento(), ESTADOS_ABIERTOS));
  }

  private void validarAdministrador(Jwt jwt) {
    Usuario usuario = usuarioService.obtenerUsuarioDesdeJwt(jwt);
    if (!Boolean.TRUE.equals(usuario.getEstado())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Usuario inactivo o suspendido.");
    }
    boolean administrador = usuario.getRoles() != null && usuario.getRoles().stream()
      .filter(asignacion -> Boolean.TRUE.equals(asignacion.getEstado()))
      .map(asignacion -> asignacion.getRol())
      .anyMatch(rol -> rol != null && "Administrador".equalsIgnoreCase(rol.getNombre()));
    if (!administrador) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN,
        "Se requiere un rol activo de Administrador.");
    }
  }
}
