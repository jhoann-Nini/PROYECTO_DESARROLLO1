package com.example.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Vinculación individual entre una cuenta y un establecimiento.
 * Permite varios representantes por establecimiento y varias tiendas por cuenta.
 */
@Entity
@Table(
    name = "usuario_establecimiento",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_usuario_establecimiento",
        columnNames = {"id_usuario", "id_establecimiento"}
    ),
    indexes = {
        @Index(name = "idx_usuario_establecimiento_usuario_estado", columnList = "id_usuario, estado"),
        @Index(name = "idx_usuario_establecimiento_establecimiento_estado", columnList = "id_establecimiento, estado")
    }
)
public class UsuarioEstablecimiento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_usuario_establecimiento")
    private Long idUsuarioEstablecimiento;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_usuario", nullable = false)
    private Usuario usuario;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_establecimiento", nullable = false)
    private Establecimiento establecimiento;

    @Column(nullable = false)
    private Boolean estado = true;

    @Column(name = "fecha_asignacion", nullable = false)
    private LocalDateTime fechaAsignacion = LocalDateTime.now();

    public Long getIdUsuarioEstablecimiento() { return idUsuarioEstablecimiento; }
    public void setIdUsuarioEstablecimiento(Long idUsuarioEstablecimiento) { this.idUsuarioEstablecimiento = idUsuarioEstablecimiento; }
    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }
    public Establecimiento getEstablecimiento() { return establecimiento; }
    public void setEstablecimiento(Establecimiento establecimiento) { this.establecimiento = establecimiento; }
    public Boolean getEstado() { return estado; }
    public void setEstado(Boolean estado) { this.estado = estado; }
    public LocalDateTime getFechaAsignacion() { return fechaAsignacion; }
    public void setFechaAsignacion(LocalDateTime fechaAsignacion) { this.fechaAsignacion = fechaAsignacion; }
}
