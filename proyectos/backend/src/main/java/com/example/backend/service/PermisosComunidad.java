package com.example.backend.service;

import com.example.backend.entity.Usuario;
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

  public PermisosComunidad(ReincidenciaService reincidenciaService) {
    this.reincidenciaService = reincidenciaService;
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
