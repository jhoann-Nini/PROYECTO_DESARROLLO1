package com.example.backend.service;

import com.example.backend.entity.Usuario;
import com.example.backend.repository.UsuarioRepository;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/**
 * Quién puede hacer qué en la comunidad (RN-15). Una cuenta suspendida no
 * escribe ni reacciona; el bloqueo por reincidencia impide publicar,
 * responder y editar, pero no dar o retirar «Me gusta».
 */
@Component
public class PermisosComunidad {

  private final ReincidenciaService reincidenciaService;
  private final UsuarioRepository usuarioRepository;

  public PermisosComunidad(ReincidenciaService reincidenciaService, UsuarioRepository usuarioRepository) {
    this.reincidenciaService = reincidenciaService;
    this.usuarioRepository = usuarioRepository;
  }

  /**
   * Lecturas públicas: el usuario si existe, o null (anónimo). No aprovisiona
   * cuentas ni rechaza la lectura: un GET no debe crear usuarios.
   */
  public Usuario lectorOpcional(Jwt jwt) {
    if (jwt == null || jwt.getSubject() == null) {
      return null;
    }
    // Una cuenta suspendida lee como anónima: sin privilegios de autor ni de moderación.
    return usuarioRepository.findBySupabaseUid(jwt.getSubject())
      .filter(u -> Boolean.TRUE.equals(u.getEstado()))
      .orElse(null);
  }

  public boolean esModerador(Usuario usuario) {
    return RolesModeracion.tienePermisoModeracion(usuario);
  }

  /** 403 si la cuenta está suspendida. Basta para reaccionar. */
  public void verificarPuedeEscribir(Usuario usuario) {
    if (!Boolean.TRUE.equals(usuario.getEstado())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Usuario inactivo o suspendido.");
    }
  }

  /** Lo anterior y, además, sin bloqueo por reincidencia: publicar, responder y editar. */
  public void verificarPuedePublicar(Usuario usuario) {
    verificarPuedeEscribir(usuario);
    reincidenciaService.verificarPuedePublicar(usuario.getIdUsuario());
  }

  /** Con revisión previa por reincidencia, todo lo nuevo queda PENDIENTE. */
  public boolean requiereRevisionPrevia(Usuario usuario) {
    return reincidenciaService.requiereRevisionPrevia(usuario.getIdUsuario());
  }
}
