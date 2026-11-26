package com.example.backend.service;

import com.example.backend.entity.Usuario;
import com.example.backend.exception.TooManyRequestsException;
import com.example.backend.repository.PublicacionComunidadRepository;
import com.example.backend.repository.RespuestaComunidadRepository;
import com.example.backend.repository.UsuarioRepository;
import java.time.LocalDateTime;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Cuotas de la comunidad (P3, RN-14): 5 publicaciones y 20 respuestas en 60
 * minutos, contando las eliminadas. Bloquea la fila del usuario para que dos
 * peticiones simultáneas no superen la cuota; debe llamarse dentro de la
 * transacción que inserta el contenido.
 */
@Service
public class LimiteContenidoComunidadService {

  public static final int MAX_PUBLICACIONES_POR_HORA = 5;
  public static final int MAX_RESPUESTAS_POR_HORA = 20;

  private final UsuarioRepository usuarioRepository;
  private final PublicacionComunidadRepository publicacionRepository;
  private final RespuestaComunidadRepository respuestaRepository;

  public LimiteContenidoComunidadService(UsuarioRepository usuarioRepository,
      PublicacionComunidadRepository publicacionRepository,
      RespuestaComunidadRepository respuestaRepository) {
    this.usuarioRepository = usuarioRepository;
    this.publicacionRepository = publicacionRepository;
    this.respuestaRepository = respuestaRepository;
  }

  @Transactional(propagation = Propagation.MANDATORY)
  public void verificarPublicacion(Usuario usuario) {
    usuarioRepository.findByIdForUpdate(usuario.getIdUsuario());
    long recientes = publicacionRepository.contarDelAutorDesde(usuario.getIdUsuario(), haceUnaHora());
    if (recientes >= MAX_PUBLICACIONES_POR_HORA) {
      throw new TooManyRequestsException("Alcanzaste el límite de " + MAX_PUBLICACIONES_POR_HORA
        + " publicaciones por hora. Intenta más tarde.");
    }
  }

  @Transactional(propagation = Propagation.MANDATORY)
  public void verificarRespuesta(Usuario usuario) {
    usuarioRepository.findByIdForUpdate(usuario.getIdUsuario());
    long recientes = respuestaRepository.contarDelAutorDesde(usuario.getIdUsuario(), haceUnaHora());
    if (recientes >= MAX_RESPUESTAS_POR_HORA) {
      throw new TooManyRequestsException("Alcanzaste el límite de " + MAX_RESPUESTAS_POR_HORA
        + " respuestas por hora. Intenta más tarde.");
    }
  }

  private static LocalDateTime haceUnaHora() {
    return LocalDateTime.now().minusMinutes(60);
  }
}
