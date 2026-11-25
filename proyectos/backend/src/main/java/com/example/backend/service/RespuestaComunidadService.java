package com.example.backend.service;

import com.example.backend.dto.comunidad.CrearRespuestaRequest;
import com.example.backend.dto.comunidad.EditarRespuestaRequest;
import com.example.backend.dto.comunidad.PaginaRespuestas;
import com.example.backend.dto.comunidad.RespuestaResponse;
import com.example.backend.entity.EstadoModeracion;
import com.example.backend.entity.PublicacionComunidad;
import com.example.backend.entity.RespuestaComunidad;
import com.example.backend.entity.TipoPublicacion;
import com.example.backend.entity.Usuario;
import com.example.backend.exception.ConflictException;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.repository.PublicacionComunidadRepository;
import com.example.backend.repository.ReaccionRespuestaRepository;
import com.example.backend.repository.RespuestaComunidadRepository;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Respuestas de la comunidad en tres niveles (P1). Responder a una respuesta
 * de nivel 2 crea una hermana en el nivel 2 que la cita. En PostgreSQL, los
 * triggers de la 029 son la garantía final de profundidad, cita y cierre.
 */
@Service
public class RespuestaComunidadService {

  static final String ORDEN_RESPUESTAS = "respuestas";

  private final RespuestaComunidadRepository respuestaRepository;
  private final ReaccionRespuestaRepository reaccionRepository;
  private final PublicacionComunidadRepository publicacionRepository;
  private final PublicacionComunidadService publicacionService;
  private final UsuarioService usuarioService;
  private final PermisosComunidad permisos;
  private final LimiteContenidoComunidadService limites;
  private final ModeracionComunidad moderacion;

  public RespuestaComunidadService(RespuestaComunidadRepository respuestaRepository,
      ReaccionRespuestaRepository reaccionRepository, PublicacionComunidadRepository publicacionRepository,
      PublicacionComunidadService publicacionService,
      UsuarioService usuarioService, PermisosComunidad permisos, LimiteContenidoComunidadService limites,
      ModeracionComunidad moderacion) {
    this.respuestaRepository = respuestaRepository;
    this.reaccionRepository = reaccionRepository;
    this.publicacionRepository = publicacionRepository;
    this.publicacionService = publicacionService;
    this.usuarioService = usuarioService;
    this.permisos = permisos;
    this.limites = limites;
    this.moderacion = moderacion;
  }

  @Transactional
  public RespuestaResponse crear(Jwt jwt, Long idPublicacion, CrearRespuestaRequest request) {
    Usuario autor = usuarioService.obtenerUsuarioDesdeJwt(jwt);
    permisos.verificarPuedePublicar(autor);
    PublicacionComunidad publicacion = publicacionService.visibleParaEscribir(idPublicacion, autor);
    if (publicacion.isCerrada()) {
      throw new ConflictException("La publicación está cerrada y no admite respuestas nuevas.");
    }
    if (publicacion.getTipo() == TipoPublicacion.PRODUCTO
        && !Boolean.TRUE.equals(publicacion.getProducto().getEstado())) {
      throw new ConflictException("El producto está desactivado y no admite respuestas nuevas.");
    }
    String contenido = ModeracionComunidad.texto(request.contenido(), ModeracionComunidad.RESPUESTA_MAX);

    RespuestaComunidad padre = null;
    RespuestaComunidad citada = null;
    if (request.idRespuestaPadre() != null) {
      RespuestaComunidad madre = respuestaRepository.findById(request.idRespuestaPadre())
        .filter(r -> r.getPublicacion().getIdPublicacion().equals(publicacion.getIdPublicacion()))
        .orElseThrow(() -> ModeracionComunidad.invalido("La respuesta a la que respondes no es de esta publicación."));
      if (madre.isEliminada() || !puedeLeer(madre, autor)) {
        throw new ConflictException("La respuesta a la que respondes ya no admite respuestas.");
      }
      if (madre.getProfundidad() >= RespuestaComunidad.PROFUNDIDAD_MAXIMA) {
        padre = madre.getPadre();
        citada = madre;
      } else {
        padre = madre;
      }
    }

    limites.verificarRespuesta(autor);

    RespuestaComunidad respuesta = new RespuestaComunidad();
    respuesta.setPublicacion(publicacion);
    respuesta.setPadre(padre);
    respuesta.setCitada(citada);
    respuesta.setAutor(autor);
    respuesta.setContenido(contenido);
    respuesta.setProfundidad((short) (padre == null ? 0 : padre.getProfundidad() + 1));
    respuesta.setEstadoModeracion(moderacion.estadoInicial(contenido, permisos.requiereRevisionPrevia(autor)));
    respuesta = respuestaRepository.save(respuesta);
    if (respuesta.getEstadoModeracion() == EstadoModeracion.PUBLICADA) {
      publicacionRepository.registrarActividad(publicacion.getIdPublicacion(), respuesta.getFechaCreacion());
    }
    return respuesta(respuesta, autor, 0L, 0L, false);
  }

  @Transactional
  public RespuestaResponse editar(Jwt jwt, Long id, EditarRespuestaRequest request) {
    Usuario usuario = usuarioService.obtenerUsuarioDesdeJwt(jwt);
    RespuestaComunidad respuesta = noEliminada(id);
    if (!esAutor(respuesta, usuario)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo el autor puede editar la respuesta.");
    }
    permisos.verificarPuedePublicar(usuario);
    if (respuesta.isOcultaPorModeracion()) {
      throw new ConflictException("La respuesta está oculta por moderación y no se puede editar.");
    }
    String contenido = ModeracionComunidad.texto(request.contenido(), ModeracionComunidad.RESPUESTA_MAX);
    respuesta.setContenido(contenido);
    respuesta.setFechaEdicion(PublicacionComunidad.ahora());
    respuesta.setEstadoModeracion(moderacion.estadoTrasEdicion(respuesta.getEstadoModeracion(), contenido,
      permisos.requiereRevisionPrevia(usuario)));
    Long idRespuesta = respuesta.getIdRespuesta();
    long hijas = PublicacionComunidadService.conteo(respuestaRepository.contarHijasPorRespuesta(List.of(idRespuesta)))
      .getOrDefault(idRespuesta, 0L);
    long meGusta = reaccionRepository.countByIdRespuesta(idRespuesta);
    boolean propio = !reaccionRepository.propias(usuario.getIdUsuario(), List.of(idRespuesta)).isEmpty();
    return respuesta(respuesta, usuario, hijas, meGusta, propio);
  }

  @Transactional
  public void eliminar(Jwt jwt, Long id) {
    Usuario usuario = usuarioService.obtenerUsuarioDesdeJwt(jwt);
    RespuestaComunidad respuesta = noEliminada(id);
    if (!esAutor(respuesta, usuario)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo el autor puede eliminar la respuesta.");
    }
    permisos.verificarPuedeEscribir(usuario);
    respuesta.setEliminada(true);
    respuesta.setFechaEliminacion(PublicacionComunidad.ahora());
    respuesta.setEliminadaPor(usuario);
  }

  @Transactional
  public PaginaRespuestas listarNivel(Jwt jwt, Long idPublicacion, Long padre, String cursor, Integer limite) {
    Usuario usuario = jwt == null ? null : usuarioService.obtenerUsuarioDesdeJwt(jwt);
    PublicacionComunidad publicacion = publicacionService.visibleParaEscribir(idPublicacion, usuario);
    int tamano = PublicacionComunidadService.limite(limite);
    CursorComunidad.Posicion desde = cursor == null || cursor.isBlank()
      ? CursorComunidad.INICIO_ASCENDENTE
      : CursorComunidad.decodificar(cursor, ambito(publicacion.getIdPublicacion(), padre));
    PageRequest pagina = PageRequest.of(0, tamano + 1);
    List<RespuestaComunidad> encontradas = padre == null
      ? respuestaRepository.directas(publicacion.getIdPublicacion(), desde.instante(), desde.id(), pagina)
      : respuestaRepository.hijas(publicacion.getIdPublicacion(), padre, desde.instante(), desde.id(), pagina);

    boolean hayMas = encontradas.size() > tamano;
    List<RespuestaComunidad> items = hayMas ? encontradas.subList(0, tamano) : encontradas;
    String siguiente = null;
    if (hayMas) {
      RespuestaComunidad ultima = items.get(items.size() - 1);
      siguiente = CursorComunidad.codificar(ambito(publicacion.getIdPublicacion(), padre),
        ultima.getFechaCreacion(), ultima.getIdRespuesta());
    }
    List<Long> ids = items.stream().map(RespuestaComunidad::getIdRespuesta).toList();
    Map<Long, Long> hijas = ids.isEmpty() ? Map.of()
      : PublicacionComunidadService.conteo(respuestaRepository.contarHijasPorRespuesta(ids));
    Map<Long, Long> meGusta = ids.isEmpty() ? Map.of()
      : PublicacionComunidadService.conteo(reaccionRepository.contarPorRespuesta(ids));
    Set<Long> propias = usuario == null || ids.isEmpty() ? Set.of()
      : new HashSet<>(reaccionRepository.propias(usuario.getIdUsuario(), ids));
    return new PaginaRespuestas(items.stream().map(r -> respuesta(r, usuario,
      hijas.getOrDefault(r.getIdRespuesta(), 0L), meGusta.getOrDefault(r.getIdRespuesta(), 0L),
      propias.contains(r.getIdRespuesta()))).toList(), siguiente);
  }

  /** El cursor solo sirve para el mismo nivel de la misma publicación. */
  private static String ambito(Long idPublicacion, Long padre) {
    return ORDEN_RESPUESTAS + ":" + idPublicacion + ":" + (padre == null ? "raiz" : padre);
  }

  /** Respuesta existente, no eliminada y legible por el usuario dentro de una publicación visible; si no, 404. */
  RespuestaComunidad visibleParaReaccionar(Long id, Usuario usuario) {
    RespuestaComunidad respuesta = noEliminada(id);
    publicacionService.visibleParaEscribir(respuesta.getPublicacion().getIdPublicacion(), usuario);
    if (!puedeLeer(respuesta, usuario)) {
      throw noEncontrada(id);
    }
    return respuesta;
  }

  /** El autor y los moderadores leen lo pendiente u oculto; nadie lee lo eliminado. */
  private boolean puedeLeer(RespuestaComunidad r, Usuario usuario) {
    if (r.isEliminada()) {
      return false;
    }
    if (r.esVisiblePublicamente()) {
      return true;
    }
    return usuario != null && (esAutor(r, usuario) || permisos.esModerador(usuario));
  }

  private RespuestaResponse respuesta(RespuestaComunidad r, Usuario usuario, long hijas, long meGusta, boolean propio) {
    boolean legible = puedeLeer(r, usuario);
    String estadoVisible;
    if (legible) {
      estadoVisible = "VISIBLE";
    } else if (r.isEliminada()) {
      estadoVisible = "ELIMINADA";
    } else if (r.getEstadoModeracion() == EstadoModeracion.PENDIENTE) {
      estadoVisible = "EN_REVISION";
    } else {
      estadoVisible = "OCULTA";
    }
    boolean verEstado = usuario != null && !r.isEliminada() && (esAutor(r, usuario) || permisos.esModerador(usuario));
    return new RespuestaResponse(r.getIdRespuesta(),
      r.getPadre() == null ? null : r.getPadre().getIdRespuesta(),
      r.getProfundidad(),
      legible ? r.getContenido() : null,
      legible ? r.getAutor().getNombre() : null,
      legible && r.getCitada() != null && puedeLeer(r.getCitada(), usuario) ? r.getCitada().getAutor().getNombre() : null,
      estadoVisible,
      verEstado ? r.getEstadoModeracion().name() : null,
      hijas, meGusta, propio, esAutor(r, usuario),
      r.getFechaCreacion(), legible ? r.getFechaEdicion() : null);
  }

  private RespuestaComunidad noEliminada(Long id) {
    return respuestaRepository.findById(id).filter(r -> !r.isEliminada()).orElseThrow(() -> noEncontrada(id));
  }

  private static boolean esAutor(RespuestaComunidad r, Usuario usuario) {
    return usuario != null && r.getAutor().getIdUsuario().equals(usuario.getIdUsuario());
  }

  private static ResourceNotFoundException noEncontrada(Long id) {
    return new ResourceNotFoundException("Respuesta no encontrada con id " + id);
  }
}
