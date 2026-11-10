package com.example.backend.service;

import com.example.backend.entity.*;
import com.example.backend.exception.ConflictException;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class AdministracionAsignacionesService {
    private static final String ADMIN = "Administrador";

    private final UsuarioRepository usuarios;
    private final RolRepository roles;
    private final EstablecimientoRepository establecimientos;
    private final UsuarioRolRepository usuarioRoles;
    private final UsuarioEstablecimientoRepository usuarioEstablecimientos;
    private final AuditoriaUsuarioRolRepository auditoriaRoles;
    private final AuditoriaUsuarioEstablecimientoRepository auditoriaEstablecimientos;

    public AdministracionAsignacionesService(
            UsuarioRepository usuarios, RolRepository roles,
            EstablecimientoRepository establecimientos,
            UsuarioRolRepository usuarioRoles,
            UsuarioEstablecimientoRepository usuarioEstablecimientos,
            AuditoriaUsuarioRolRepository auditoriaRoles,
            AuditoriaUsuarioEstablecimientoRepository auditoriaEstablecimientos) {
        this.usuarios = usuarios;
        this.roles = roles;
        this.establecimientos = establecimientos;
        this.usuarioRoles = usuarioRoles;
        this.usuarioEstablecimientos = usuarioEstablecimientos;
        this.auditoriaRoles = auditoriaRoles;
        this.auditoriaEstablecimientos = auditoriaEstablecimientos;
    }

    @Transactional
    public UsuarioRol asignarRol(Long usuarioId, Long rolId, String sub, String motivo) {
        Usuario actor = obtenerActor(sub);
        Usuario objetivo = usuarios.findByIdForUpdate(usuarioId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado."));
        if (!Boolean.TRUE.equals(objetivo.getEstado())) throw new ConflictException("No se pueden asignar roles a un usuario inactivo.");
        Rol rol = roles.findById(rolId).orElseThrow(() -> new ResourceNotFoundException("Rol no encontrado."));
        UsuarioRol asignacion = usuarioRoles.findByUsuario_IdUsuarioAndRol_IdRol(usuarioId, rolId).orElse(null);
        String accion;
        if (asignacion == null) {
            asignacion = new UsuarioRol();
            asignacion.setUsuario(objetivo);
            asignacion.setRol(rol);
            accion = "ASIGNADO";
        } else if (Boolean.TRUE.equals(asignacion.getEstado())) {
            throw new ConflictException("El usuario ya tiene este rol activo.");
        } else {
            accion = "REACTIVADO";
        }
        asignacion.setEstado(true);
        asignacion.setFechaAsignacion(LocalDateTime.now());
        asignacion.setAsignadoPor(actor);
        asignacion.setFechaRevocacion(null);
        asignacion.setRevocadoPor(null);
        asignacion.setMotivoRevocacion(null);
        asignacion = usuarioRoles.save(asignacion);
        registrarAuditoriaRol(asignacion, actor, accion, motivo);
        return asignacion;
    }

    @Transactional
    public void revocarRol(Long usuarioId, Long rolId, String sub, String motivo) {
        Usuario actor = obtenerActor(sub);
        usuarios.findByIdForUpdate(usuarioId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado."));
        UsuarioRol asignacion = usuarioRoles.findByUsuario_IdUsuarioAndRol_IdRol(usuarioId, rolId)
                .orElseThrow(() -> new ResourceNotFoundException("La asignación de rol no existe."));
        if (!Boolean.TRUE.equals(asignacion.getEstado())) throw new ConflictException("El rol ya está revocado.");
        if (asignacion.getRol() != null && ADMIN.equalsIgnoreCase(asignacion.getRol().getNombre())) {
            List<UsuarioRol> administradores = usuarioRoles.findAdministradoresActivosForUpdate();
            if (administradores.size() <= 1) throw new ConflictException("No se puede revocar el último rol de Administrador activo.");
        }
        asignacion.setEstado(false);
        asignacion.setFechaRevocacion(LocalDateTime.now());
        asignacion.setRevocadoPor(actor);
        asignacion.setMotivoRevocacion(normalizarMotivo(motivo));
        usuarioRoles.save(asignacion);
        registrarAuditoriaRol(asignacion, actor, "REVOCADO", motivo);
    }

    @Transactional
    public UsuarioEstablecimiento asignarRepresentante(Long usuarioId, Long establecimientoId, String sub, String motivo) {
        Usuario actor = obtenerActor(sub);
        Usuario objetivo = usuarios.findByIdForUpdate(usuarioId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado."));
        if (!Boolean.TRUE.equals(objetivo.getEstado())) throw new ConflictException("No se pueden asignar representantes inactivos.");
        Establecimiento establecimiento = establecimientos.findById(establecimientoId)
                .orElseThrow(() -> new ResourceNotFoundException("Establecimiento no encontrado."));
        if (!Boolean.TRUE.equals(establecimiento.getEstado())) throw new ConflictException("No se pueden asignar representantes a un establecimiento inactivo.");
        UsuarioEstablecimiento asignacion = usuarioEstablecimientos
                .findByUsuario_IdUsuarioAndEstablecimiento_IdEstablecimiento(usuarioId, establecimientoId).orElse(null);
        String accion;
        if (asignacion == null) {
            asignacion = new UsuarioEstablecimiento();
            asignacion.setUsuario(objetivo);
            asignacion.setEstablecimiento(establecimiento);
            accion = "ASIGNADO";
        } else if (Boolean.TRUE.equals(asignacion.getEstado())) {
            throw new ConflictException("El usuario ya representa este establecimiento.");
        } else {
            accion = "REACTIVADO";
        }
        asignacion.setEstado(true);
        asignacion.setFechaAsignacion(LocalDateTime.now());
        asignacion.setAsignadoPor(actor);
        asignacion.setFechaRevocacion(null);
        asignacion.setRevocadoPor(null);
        asignacion.setMotivoRevocacion(null);
        asignacion = usuarioEstablecimientos.save(asignacion);
        registrarAuditoriaEstablecimiento(asignacion, actor, accion, motivo);
        return asignacion;
    }

    @Transactional
    public void revocarRepresentante(Long usuarioId, Long establecimientoId, String sub, String motivo) {
        Usuario actor = obtenerActor(sub);
        usuarios.findByIdForUpdate(usuarioId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado."));
        UsuarioEstablecimiento asignacion = usuarioEstablecimientos
                .findByUsuarioAndEstablecimientoForUpdate(usuarioId, establecimientoId)
                .orElseThrow(() -> new ResourceNotFoundException("La representación no existe."));
        if (!Boolean.TRUE.equals(asignacion.getEstado())) throw new ConflictException("La representación ya está revocada.");
        asignacion.setEstado(false);
        asignacion.setFechaRevocacion(LocalDateTime.now());
        asignacion.setRevocadoPor(actor);
        asignacion.setMotivoRevocacion(normalizarMotivo(motivo));
        usuarioEstablecimientos.save(asignacion);
        registrarAuditoriaEstablecimiento(asignacion, actor, "REVOCADO", motivo);
    }

    private Usuario obtenerActor(String sub) {
        if (sub == null || sub.isBlank()) throw new ConflictException("No fue posible identificar al administrador.");
        Usuario actor = usuarios.findBySupabaseUid(sub)
                .orElseThrow(() -> new ResourceNotFoundException("La cuenta administradora no existe en el sistema."));
        if (!Boolean.TRUE.equals(actor.getEstado())) throw new ConflictException("La cuenta administradora está inactiva.");
        return actor;
    }

    private void registrarAuditoriaRol(UsuarioRol a, Usuario actor, String accion, String motivo) {
        AuditoriaUsuarioRol evento = new AuditoriaUsuarioRol();
        evento.setIdUsuarioRol(a.getIdUsuarioRol());
        evento.setIdUsuario(a.getUsuario().getIdUsuario());
        evento.setIdRol(a.getRol().getIdRol());
        evento.setActorId(actor.getIdUsuario());
        evento.setAccion(accion);
        evento.setFechaEvento(LocalDateTime.now());
        evento.setMotivo(normalizarMotivo(motivo));
        auditoriaRoles.save(evento);
    }

    private void registrarAuditoriaEstablecimiento(UsuarioEstablecimiento a, Usuario actor, String accion, String motivo) {
        AuditoriaUsuarioEstablecimiento evento = new AuditoriaUsuarioEstablecimiento();
        evento.setIdUsuarioEstablecimiento(a.getIdUsuarioEstablecimiento());
        evento.setIdUsuario(a.getUsuario().getIdUsuario());
        evento.setIdEstablecimiento(a.getEstablecimiento().getIdEstablecimiento());
        evento.setActorId(actor.getIdUsuario());
        evento.setAccion(accion);
        evento.setFechaEvento(LocalDateTime.now());
        evento.setMotivo(normalizarMotivo(motivo));
        auditoriaEstablecimientos.save(evento);
    }

    private String normalizarMotivo(String motivo) {
        return motivo == null || motivo.isBlank() ? null : motivo.trim();
    }
}
