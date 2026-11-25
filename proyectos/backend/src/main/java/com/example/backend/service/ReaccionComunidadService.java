package com.example.backend.service;

import com.example.backend.dto.comunidad.MeGustaResponse;
import com.example.backend.entity.ReaccionPublicacion;
import com.example.backend.entity.ReaccionRespuesta;
import com.example.backend.entity.Usuario;
import com.example.backend.repository.ReaccionPublicacionRepository;
import com.example.backend.repository.ReaccionRespuestaRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * «Me gusta» de la comunidad (RN-08). Dar y retirar son idempotentes y
 * devuelven el conteo. Una cuenta suspendida no reacciona; el bloqueo por
 * reincidencia no lo impide (RN-15).
 * <p>
 * En PostgreSQL, dar es un {@code INSERT … ON CONFLICT DO NOTHING}: dos clics
 * simultáneos dejan uno sin error. H2, usado en las pruebas, no tiene
 * {@code ON CONFLICT}; ahí se comprueba antes de insertar.
 */
@Service
public class ReaccionComunidadService {

  private final ReaccionPublicacionRepository reaccionPublicacionRepository;
  private final ReaccionRespuestaRepository reaccionRespuestaRepository;
  private final PublicacionComunidadService publicacionService;
  private final RespuestaComunidadService respuestaService;
  private final UsuarioService usuarioService;
  private final PermisosComunidad permisos;
  private final boolean postgres;

  public ReaccionComunidadService(ReaccionPublicacionRepository reaccionPublicacionRepository,
      ReaccionRespuestaRepository reaccionRespuestaRepository, PublicacionComunidadService publicacionService,
      RespuestaComunidadService respuestaService, UsuarioService usuarioService, PermisosComunidad permisos,
      @Value("${spring.datasource.url:}") String urlBaseDatos) {
    this.reaccionPublicacionRepository = reaccionPublicacionRepository;
    this.reaccionRespuestaRepository = reaccionRespuestaRepository;
    this.publicacionService = publicacionService;
    this.respuestaService = respuestaService;
    this.usuarioService = usuarioService;
    this.permisos = permisos;
    this.postgres = urlBaseDatos.startsWith("jdbc:postgresql");
  }

  @Transactional
  public MeGustaResponse darMeGustaPublicacion(Jwt jwt, Long id) {
    Usuario usuario = lector(jwt);
    publicacionService.visibleParaEscribir(id, usuario);
    if (postgres) {
      reaccionPublicacionRepository.darSiNoExiste(id, usuario.getIdUsuario());
    } else if (!reaccionPublicacionRepository.existsById(new ReaccionPublicacion.Clave(id, usuario.getIdUsuario()))) {
      reaccionPublicacionRepository.saveAndFlush(new ReaccionPublicacion(id, usuario.getIdUsuario()));
    }
    return new MeGustaResponse(reaccionPublicacionRepository.countByIdPublicacion(id), true);
  }

  @Transactional
  public MeGustaResponse retirarMeGustaPublicacion(Jwt jwt, Long id) {
    Usuario usuario = lector(jwt);
    publicacionService.visibleParaEscribir(id, usuario);
    reaccionPublicacionRepository.retirar(id, usuario.getIdUsuario());
    return new MeGustaResponse(reaccionPublicacionRepository.countByIdPublicacion(id), false);
  }

  @Transactional
  public MeGustaResponse darMeGustaRespuesta(Jwt jwt, Long id) {
    Usuario usuario = lector(jwt);
    respuestaService.visibleParaReaccionar(id, usuario);
    if (postgres) {
      reaccionRespuestaRepository.darSiNoExiste(id, usuario.getIdUsuario());
    } else if (!reaccionRespuestaRepository.existsById(new ReaccionRespuesta.Clave(id, usuario.getIdUsuario()))) {
      reaccionRespuestaRepository.saveAndFlush(new ReaccionRespuesta(id, usuario.getIdUsuario()));
    }
    return new MeGustaResponse(reaccionRespuestaRepository.countByIdRespuesta(id), true);
  }

  @Transactional
  public MeGustaResponse retirarMeGustaRespuesta(Jwt jwt, Long id) {
    Usuario usuario = lector(jwt);
    respuestaService.visibleParaReaccionar(id, usuario);
    reaccionRespuestaRepository.retirar(id, usuario.getIdUsuario());
    return new MeGustaResponse(reaccionRespuestaRepository.countByIdRespuesta(id), false);
  }

  private Usuario lector(Jwt jwt) {
    Usuario usuario = usuarioService.obtenerUsuarioDesdeJwt(jwt);
    permisos.verificarPuedeEscribir(usuario);
    return usuario;
  }
}
