package com.example.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Asignación individual de un rol a una cuenta.
 * La revocación se representa mediante estado=false para conservar historial.
 */
@Entity
@Table(
    name = "usuario_rol",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_usuario_rol_usuario_rol",
        columnNames = {"id_usuario", "id_rol"}
    ),
    indexes = {
        @Index(name = "idx_usuario_rol_usuario_estado", columnList = "id_usuario, estado"),
        @Index(name = "idx_usuario_rol_rol_estado", columnList = "id_rol, estado")
    }
)
public class UsuarioRol {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_usuario_rol")
    private Long idUsuarioRol;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_usuario", nullable = false)
    private Usuario usuario;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_rol", nullable = false)
    private Rol rol;

    @Column(nullable = false)
    private Boolean estado = true;

    @Column(name = "fecha_asignacion", nullable = false)
    private LocalDateTime fechaAsignacion = LocalDateTime.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asignado_por")
    private Usuario asignadoPor;

    @Column(name = "fecha_revocacion")
    private LocalDateTime fechaRevocacion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "revocado_por")
    private Usuario revocadoPor;

    @Column(name = "motivo_revocacion", columnDefinition = "TEXT")
    private String motivoRevocacion;

    public Long getIdUsuarioRol() { return idUsuarioRol; }
    public void setIdUsuarioRol(Long idUsuarioRol) { this.idUsuarioRol = idUsuarioRol; }
    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }
    public Rol getRol() { return rol; }
    public void setRol(Rol rol) { this.rol = rol; }
    public Boolean getEstado() { return estado; }
    public void setEstado(Boolean estado) { this.estado = estado; }
    public LocalDateTime getFechaAsignacion() { return fechaAsignacion; }
    public void setFechaAsignacion(LocalDateTime fechaAsignacion) { this.fechaAsignacion = fechaAsignacion; }
    public Usuario getAsignadoPor() { return asignadoPor; }
    public void setAsignadoPor(Usuario asignadoPor) { this.asignadoPor = asignadoPor; }
    public LocalDateTime getFechaRevocacion() { return fechaRevocacion; }
    public void setFechaRevocacion(LocalDateTime fechaRevocacion) { this.fechaRevocacion = fechaRevocacion; }
    public Usuario getRevocadoPor() { return revocadoPor; }
    public void setRevocadoPor(Usuario revocadoPor) { this.revocadoPor = revocadoPor; }
    public String getMotivoRevocacion() { return motivoRevocacion; }
    public void setMotivoRevocacion(String motivoRevocacion) { this.motivoRevocacion = motivoRevocacion; }
}
