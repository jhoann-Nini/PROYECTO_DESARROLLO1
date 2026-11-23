package com.example.backend.service;

import com.example.backend.dto.CambioEstadoCuentaRequest;
import com.example.backend.dto.UsuarioAdminResponse;
import com.example.backend.entity.AuditoriaUsuarioEstado;
import com.example.backend.entity.Usuario;
import com.example.backend.exception.ConflictException;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.repository.AuditoriaUsuarioEstadoRepository;
import com.example.backend.repository.ResenaModeracionAuditoriaRepository;
import com.example.backend.dto.CuentaReincidenteResponse;
import com.example.backend.repository.UsuarioRepository;
import java.time.LocalDateTime;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Suspensión y reactivación de cuentas (Caso 6, migración 024).
 * <p>
 * Una cuenta suspendida (usuario.estado = false) no puede publicar reseñas,
 * reportar ni moderar: esas validaciones ya existían, pero no había forma de
 * suspender. Cada cambio registra primero su evento en
 * auditoria_usuario_estado y después cambia el estado, en la misma
 * transacción; PostgreSQL lo exige con un trigger diferido.
 */
@Service
public class AdministracionCuentasService {

  private final UsuarioRepository usuarioRepository;
  private final AuditoriaUsuarioEstadoRepository auditoriaRepository;
  private final UsuarioService usuarioService;
  private final AdministracionConsultasService consultasService;
  private final ResenaModeracionAuditoriaRepository moderacionAuditoriaRepository;

  public AdministracionCuentasService(
    UsuarioRepository usuarioRepository,
    AuditoriaUsuarioEstadoRepository auditoriaRepository,
    UsuarioService usuarioService,
    AdministracionConsultasService consultasService,
    ResenaModeracionAuditoriaRepository moderacionAuditoriaRepository) {
    this.moderacionAuditoriaRepository = moderacionAuditoriaRepository;
    this.usuarioRepository = usuarioRepository;
    this.auditoriaRepository = auditoriaRepository;
    this.usuarioService = usuarioService;
    this.consultasService = consultasService;
  }

  /**
   * Caso 6: cuentas activas con {@link ReincidenciaService#MIN_FALTAS_ADMIN}
   * faltas o más en la ventana, para que un administrador decida si suspenderlas.
   */
  @Transactional(readOnly = true)
  public java.util.List<CuentaReincidenteResponse> listarReincidentes(Jwt jwt) {
    Usuario administrador = usuarioService.obtenerUsuarioDesdeJwt(jwt);
    if (!Boolean.TRUE.equals(administrador.getEstado()) || !tieneRolActivo(administrador, "Administrador")) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Se requiere un rol activo de Administrador.");
    }
    return moderacionAuditoriaRepository.findCuentasReincidentes(
      java.time.LocalDateTime.now().minusDays(ReincidenciaService.VENTANA_DIAS),
      ReincidenciaService.MIN_FALTAS_ADMIN);
  }

  @Transactional
  public UsuarioAdminResponse cambiarEstado(Long idUsuario, CambioEstadoCuentaRequest request, Jwt jwt) {
    Usuario administrador = usuarioService.obtenerUsuarioDesdeJwt(jwt);
    if (!Boolean.TRUE.equals(administrador.getEstado()) || !tieneRolActivo(administrador, "Administrador")) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Se requiere un rol activo de Administrador.");
    }

    Usuario usuario = usuarioRepository.findByIdForUpdate(idUsuario)
      .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con id " + idUsuario));

    if (usuario.getIdUsuario().equals(administrador.getIdUsuario())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No puedes cambiar el estado de tu propia cuenta.");
    }
    boolean activo = request.activo();
    boolean estadoActual = Boolean.TRUE.equals(usuario.getEstado());
    if (estadoActual == activo) {
      throw new ConflictException(activo ? "La cuenta ya está activa." : "La cuenta ya está suspendida.");
    }
    if (!activo && tieneRolActivo(usuario, "Administrador")) {
      throw new ConflictException("No se puede suspender a un administrador activo; primero retira su rol.");
    }

    // Evento primero, mientras la cuenta conserva su estado anterior.
    AuditoriaUsuarioEstado evento = new AuditoriaUsuarioEstado();
    evento.setUsuario(usuario);
    evento.setAdministrador(administrador);
    evento.setEstadoAnterior(estadoActual);
    evento.setEstadoNuevo(activo);
    evento.setMotivo(request.motivo().trim());
    evento.setFechaEvento(LocalDateTime.now());
    auditoriaRepository.saveAndFlush(evento);

    usuario.setEstado(activo);
    return consultasService.toResponse(usuarioRepository.saveAndFlush(usuario));
  }

  /** Solo asignaciones activas, igual que fn_usuario_tiene_rol_activo en PostgreSQL. */
  private static boolean tieneRolActivo(Usuario usuario, String rol) {
    return usuario.getRoles() != null && usuario.getRoles().stream()
      .filter(asignacion -> Boolean.TRUE.equals(asignacion.getEstado()))
      .map(asignacion -> asignacion.getRol())
      .anyMatch(r -> r != null && rol.equalsIgnoreCase(r.getNombre()));
  }
}
