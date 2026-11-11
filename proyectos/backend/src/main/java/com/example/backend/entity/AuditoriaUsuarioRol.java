package com.example.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "auditoria_usuario_rol")
public class AuditoriaUsuarioRol {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_auditoria_usuario_rol")
    private Long id;
    @Column(name = "id_usuario_rol") private Long idUsuarioRol;
    @Column(name = "id_usuario", nullable = false) private Long idUsuario;
    @Column(name = "id_rol", nullable = false) private Long idRol;
    @Column(name = "actor_id") private Long actorId;
    @Column(nullable = false, length = 20) private String accion;
    @Column(name = "fecha_evento", nullable = false) private LocalDateTime fechaEvento = LocalDateTime.now();
    @Column(columnDefinition = "TEXT") private String motivo;
    public Long getId() { return id; }
    public Long getIdUsuarioRol() { return idUsuarioRol; }
    public void setIdUsuarioRol(Long v) { idUsuarioRol = v; }
    public Long getIdUsuario() { return idUsuario; }
    public void setIdUsuario(Long v) { idUsuario = v; }
    public Long getIdRol() { return idRol; }
    public void setIdRol(Long v) { idRol = v; }
    public Long getActorId() { return actorId; }
    public void setActorId(Long v) { actorId = v; }
    public String getAccion() { return accion; }
    public void setAccion(String v) { accion = v; }
    public LocalDateTime getFechaEvento() { return fechaEvento; }
    public void setFechaEvento(LocalDateTime v) { fechaEvento = v; }
    public String getMotivo() { return motivo; }
    public void setMotivo(String v) { motivo = v; }
}
