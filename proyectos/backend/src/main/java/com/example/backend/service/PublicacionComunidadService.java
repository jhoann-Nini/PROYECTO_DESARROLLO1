package com.example.backend.service;

import com.example.backend.dto.comunidad.CrearPublicacionRequest;
import com.example.backend.dto.comunidad.EditarPublicacionRequest;
import com.example.backend.dto.comunidad.PaginaPublicaciones;
import com.example.backend.dto.comunidad.PublicacionDetalleResponse;
import com.example.backend.dto.comunidad.PublicacionResumenResponse;
import com.example.backend.entity.Producto;
import com.example.backend.entity.PublicacionComunidad;
import com.example.backend.entity.TipoPublicacion;
import com.example.backend.entity.Usuario;
import com.example.backend.exception.ConflictException;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.repository.ProductoRepository;
import com.example.backend.repository.PublicacionComunidadRepository;
import com.example.backend.repository.ReaccionPublicacionRepository;
import com.example.backend.repository.RespuestaComunidadRepository;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Publicaciones de la comunidad (fase 1). Lecturas públicas; escrituras del
 * autor. En la fase 1 el moderador no elimina contenido ajeno: esa acción
 * llega en la fase 2 con su auditoría (RN-11).
 */
@Service
public class PublicacionComunidadService {

  public static final String ORDEN_ACTIVIDAD = "actividad";
  public static final String ORDEN_RECIENTES = "recientes";
  static final int LIMITE_POR_DEFECTO = 20;
  static final int LIMITE_MAXIMO = 50;
  private static final int LARGO_EXTRACTO = 200;

  private final PublicacionComunidadRepository publicacionRepository;
  private final RespuestaComunidadRepository respuestaRepository;
  private final ReaccionPublicacionRepository reaccionRepository;
  private final ProductoRepository productoRepository;
  private final UsuarioService usuarioService;
  private final PermisosComunidad permisos;
  private final LimiteContenidoComunidadService limites;
  private final ModeracionComunidad moderacion;

  public PublicacionComunidadService(PublicacionComunidadRepository publicacionRepository,
      RespuestaComunidadRepository respuestaRepository, ReaccionPublicacionRepository reaccionRepository,
      ProductoRepository productoRepository, UsuarioService usuarioService, PermisosComunidad permisos,
      LimiteContenidoComunidadService limites, ModeracionComunidad moderacion) {
    this.publicacionRepository = publicacionRepository;
    this.respuestaRepository = respuestaRepository;
    this.reaccionRepository = reaccionRepository;
    this.productoRepository = productoRepository;
    this.usuarioService = usuarioService;
    this.permisos = permisos;
    this.limites = limites;
    this.moderacion = moderacion;
  }

  @Transactional
  public PublicacionDetalleResponse crear(Jwt jwt, CrearPublicacionRequest request) {
    Usuario autor = usuarioService.obtenerUsuarioDesdeJwt(jwt);
    permisos.verificarPuedePublicar(autor);

    TipoPublicacion tipo = tipo(request.tipo());
    Producto producto = null;
    if (tipo == TipoPublicacion.GENERAL && request.idProducto() != null) {
      throw ModeracionComunidad.invalido("Una publicación general no lleva producto.");
    }
    if (tipo == TipoPublicacion.PRODUCTO) {
      if (request.idProducto() == null) {
        throw ModeracionComunidad.invalido("Una publicación de producto necesita el producto.");
      }
      producto = productoRepository.findById(request.idProducto())
        .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado con id " + request.idProducto()));
      if (!Boolean.TRUE.equals(producto.getEstado())) {
        throw new ConflictException("El producto está desactivado y no admite publicaciones nuevas.");
      }
    }
    String titulo = ModeracionComunidad.titulo(request.titulo());
    String contenido = ModeracionComunidad.texto(request.contenido(), ModeracionComunidad.PUBLICACION_MAX);

    limites.verificarPublicacion(autor);

    PublicacionComunidad publicacion = new PublicacionComunidad();
    publicacion.setTipo(tipo);
    publicacion.setProducto(producto);
    publicacion.setAutor(autor);
    publicacion.setTitulo(titulo);
    publicacion.setContenido(contenido);
    publicacion.setEstadoModeracion(
      moderacion.estadoInicial(titulo + "\n" + contenido, permisos.requiereRevisionPrevia(autor)));
    return detalle(publicacionRepository.save(publicacion), autor);
  }

  @Transactional
  public PublicacionDetalleResponse editar(Jwt jwt, Long id, EditarPublicacionRequest request) {
    Usuario usuario = usuarioService.obtenerUsuarioDesdeJwt(jwt);
    PublicacionComunidad publicacion = noEliminada(id);
    if (!esAutor(publicacion, usuario)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo el autor puede editar la publicación.");
    }
    permisos.verificarPuedePublicar(usuario);
    if (publicacion.isOcultaPorModeracion()) {
      throw new ConflictException("La publicación está oculta por moderación y no se puede editar.");
    }
    String titulo = ModeracionComunidad.titulo(request.titulo());
    String contenido = ModeracionComunidad.texto(request.contenido(), ModeracionComunidad.PUBLICACION_MAX);
    publicacion.setTitulo(titulo);
    publicacion.setContenido(contenido);
    publicacion.setFechaEdicion(PublicacionComunidad.ahora());
    publicacion.setEstadoModeracion(moderacion.estadoTrasEdicion(publicacion.getEstadoModeracion(),
      titulo + "\n" + contenido, permisos.requiereRevisionPrevia(usuario)));
    return detalle(publicacion, usuario);
  }

  @Transactional
  public void eliminar(Jwt jwt, Long id) {
    Usuario usuario = usuarioService.obtenerUsuarioDesdeJwt(jwt);
    PublicacionComunidad publicacion = noEliminada(id);
    if (!esAutor(publicacion, usuario)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo el autor puede eliminar la publicación.");
    }
    permisos.verificarPuedeEscribir(usuario);
    publicacion.setEliminada(true);
    publicacion.setFechaEliminacion(PublicacionComunidad.ahora());
    publicacion.setEliminadaPor(usuario);
  }

  @Transactional
  public PublicacionDetalleResponse detalle(Jwt jwt, Long id) {
    Usuario usuario = jwt == null ? null : usuarioService.obtenerUsuarioDesdeJwt(jwt);
    PublicacionComunidad publicacion = publicacionRepository.findById(id)
      .filter(p -> puedeVer(p, usuario))
      .orElseThrow(() -> noEncontrada(id));
    return detalle(publicacion, usuario);
  }

  @Transactional
  public PaginaPublicaciones listarGeneral(Jwt jwt, String orden, String cursor, Integer limite) {
    return listar(jwt, null, orden, cursor, limite);
  }

  @Transactional
  public PaginaPublicaciones listarPorProducto(Jwt jwt, Long idProducto, String orden, String cursor, Integer limite) {
    if (!productoRepository.existsById(idProducto)) {
      throw new ResourceNotFoundException("Producto no encontrado con id " + idProducto);
    }
    return listar(jwt, idProducto, orden, cursor, limite);
  }

  /** Publicación visible para quien pide (RN-12): moderadores y autor ven lo pendiente u oculto. */
  boolean puedeVer(PublicacionComunidad publicacion, Usuario usuario) {
    if (publicacion.esVisiblePublicamente()) {
      return true;
    }
    if (publicacion.isEliminada() || usuario == null) {
      return false;
    }
    return esAutor(publicacion, usuario) || permisos.esModerador(usuario);
  }

  /** La publicación existe, no está eliminada y es visible para el usuario; si no, 404. */
  PublicacionComunidad visibleParaEscribir(Long id, Usuario usuario) {
    return publicacionRepository.findById(id)
      .filter(p -> !p.isEliminada() && puedeVer(p, usuario))
      .orElseThrow(() -> noEncontrada(id));
  }

  private PaginaPublicaciones listar(Jwt jwt, Long idProducto, String orden, String cursor, Integer limite) {
    Usuario usuario = jwt == null ? null : usuarioService.obtenerUsuarioDesdeJwt(jwt);
    String ordenValido = orden(orden);
    int tamano = limite(limite);
    CursorComunidad.Posicion desde = cursor == null || cursor.isBlank()
      ? CursorComunidad.INICIO_DESCENDENTE
      : CursorComunidad.decodificar(cursor, ordenValido);
    PageRequest pagina = PageRequest.of(0, tamano + 1);
    boolean actividad = ORDEN_ACTIVIDAD.equals(ordenValido);

    List<PublicacionComunidad> encontradas;
    long total;
    if (idProducto == null) {
      encontradas = actividad
        ? publicacionRepository.generalesPorActividad(desde.instante(), desde.id(), pagina)
        : publicacionRepository.generalesRecientes(desde.instante(), desde.id(), pagina);
      total = publicacionRepository.contarGeneralesVisibles();
    } else {
      encontradas = actividad
        ? publicacionRepository.deProductoPorActividad(idProducto, desde.instante(), desde.id(), pagina)
        : publicacionRepository.deProductoRecientes(idProducto, desde.instante(), desde.id(), pagina);
      total = publicacionRepository.contarVisiblesDeProducto(idProducto);
    }

    boolean hayMas = encontradas.size() > tamano;
    List<PublicacionComunidad> items = hayMas ? encontradas.subList(0, tamano) : encontradas;
    String siguiente = null;
    if (hayMas) {
      PublicacionComunidad ultima = items.get(items.size() - 1);
      siguiente = CursorComunidad.codificar(ordenValido,
        actividad ? ultima.getFechaUltimaActividad() : ultima.getFechaCreacion(), ultima.getIdPublicacion());
    }

    List<Long> ids = items.stream().map(PublicacionComunidad::getIdPublicacion).toList();
    Map<Long, Long> respuestas = ids.isEmpty() ? Map.of() : conteo(respuestaRepository.contarVisiblesPorPublicacion(ids));
    Map<Long, Long> meGusta = ids.isEmpty() ? Map.of() : conteo(reaccionRepository.contarPorPublicacion(ids));
    List<PublicacionResumenResponse> resumen = items.stream().map(p -> new PublicacionResumenResponse(
      p.getIdPublicacion(), p.getTipo().name(),
      p.getProducto() == null ? null : p.getProducto().getIdProducto(),
      p.getProducto() == null ? null : p.getProducto().getNombre(),
      p.getTitulo(), extracto(p.getContenido()), p.getAutor().getNombre(),
      p.getFechaCreacion(), p.getFechaUltimaActividad(),
      respuestas.getOrDefault(p.getIdPublicacion(), 0L), meGusta.getOrDefault(p.getIdPublicacion(), 0L),
      verEstado(p, usuario) ? p.getEstadoModeracion().name() : null, p.isCerrada())).toList();
    return new PaginaPublicaciones(resumen, siguiente, total);
  }

  private PublicacionDetalleResponse detalle(PublicacionComunidad p, Usuario usuario) {
    Long id = p.getIdPublicacion();
    long respuestas = conteo(respuestaRepository.contarVisiblesPorPublicacion(List.of(id))).getOrDefault(id, 0L);
    long meGusta = reaccionRepository.countByIdPublicacion(id);
    boolean propio = usuario != null && !reaccionRepository.propias(usuario.getIdUsuario(), List.of(id)).isEmpty();
    return new PublicacionDetalleResponse(id, p.getTipo().name(),
      p.getProducto() == null ? null : p.getProducto().getIdProducto(),
      p.getProducto() == null ? null : p.getProducto().getNombre(),
      p.getTitulo(), p.getContenido(), p.getAutor().getNombre(),
      p.getFechaCreacion(), p.getFechaEdicion(), p.getFechaUltimaActividad(),
      respuestas, meGusta, propio, esAutor(p, usuario),
      verEstado(p, usuario) ? p.getEstadoModeracion().name() : null, p.isCerrada());
  }

  private boolean verEstado(PublicacionComunidad p, Usuario usuario) {
    return usuario != null && (esAutor(p, usuario) || permisos.esModerador(usuario));
  }

  private PublicacionComunidad noEliminada(Long id) {
    return publicacionRepository.findById(id).filter(p -> !p.isEliminada()).orElseThrow(() -> noEncontrada(id));
  }

  static boolean esAutor(PublicacionComunidad p, Usuario usuario) {
    return usuario != null && p.getAutor().getIdUsuario().equals(usuario.getIdUsuario());
  }

  static Map<Long, Long> conteo(List<Object[]> filas) {
    Map<Long, Long> mapa = new HashMap<>();
    for (Object[] fila : filas) {
      mapa.put(((Number) fila[0]).longValue(), ((Number) fila[1]).longValue());
    }
    return mapa;
  }


  static int limite(Integer limite) {
    int valor = limite == null ? LIMITE_POR_DEFECTO : limite;
    if (valor < 1 || valor > LIMITE_MAXIMO) {
      throw ModeracionComunidad.invalido("El límite debe estar entre 1 y " + LIMITE_MAXIMO + ".");
    }
    return valor;
  }

  private static String orden(String orden) {
    String valor = orden == null || orden.isBlank() ? ORDEN_ACTIVIDAD : orden;
    if (!ORDEN_ACTIVIDAD.equals(valor) && !ORDEN_RECIENTES.equals(valor)) {
      throw ModeracionComunidad.invalido("El orden debe ser «actividad» o «recientes».");
    }
    return valor;
  }

  private static TipoPublicacion tipo(String tipo) {
    try {
      return TipoPublicacion.valueOf(tipo == null ? "" : tipo.trim());
    } catch (IllegalArgumentException e) {
      throw ModeracionComunidad.invalido("El tipo debe ser GENERAL o PRODUCTO.");
    }
  }

  private static String extracto(String contenido) {
    return contenido.length() <= LARGO_EXTRACTO ? contenido : contenido.substring(0, LARGO_EXTRACTO - 1) + "…";
  }

  static ResourceNotFoundException noEncontrada(Long id) {
    return new ResourceNotFoundException("Publicación no encontrada con id " + id);
  }
}
