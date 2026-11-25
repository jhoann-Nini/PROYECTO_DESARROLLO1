package com.example.backend.service;

import com.example.backend.entity.Usuario;
import com.example.backend.entity.UsuarioRol;

/**
 * Regla única de quién tiene permisos de moderación: un rol activo
 * «Moderador» o «Administrador». La usan {@code ModeratorAuthorizationManager}
 * y los servicios de la comunidad.
 */
public final class RolesModeracion {

  private RolesModeracion() {
  }

  public static boolean tienePermisoModeracion(Usuario usuario) {
    return usuario != null && usuario.getRoles() != null && usuario.getRoles().stream()
      .filter(asignacion -> Boolean.TRUE.equals(asignacion.getEstado()))
      .map(UsuarioRol::getRol)
      .anyMatch(rol -> rol != null && rol.getNombre() != null
        && ("Moderador".equalsIgnoreCase(rol.getNombre())
        || "Administrador".equalsIgnoreCase(rol.getNombre())));
  }
}
