package com.example.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "auditoria_usuario_establecimiento")
public class AuditoriaUsuarioEstablecimiento {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_auditoria_usuario_establecimiento")
    private Long id;
    @Column(name = "id_usuario_establecimiento") private Long idUsuarioEstablecimiento;
    @Column(name = "id_usuario", nullable = false) private Long idUsuario;
    @Column(name = "id_establecimiento", nullable = false) private Long idEstablecimiento;
    @Column(name = "actor_id") private Long actorId;
    @Column(nullable = false, length = 20) private String accion;
    @Column(name = "fecha_evento", nullable = false) private LocalDateTime fechaEvento = LocalDateTime.now();
    @Column(columnDefinition = "TEXT") private String motivo;
    public Long getId() { return id; }
    public Long getIdUsuarioEstablecimiento() { return idUsuarioEstablecimiento; }
    public void setIdUsuarioEstablecimiento(Long v) { idUsuarioEstablecimiento = v; }
    public Long getIdUsuario() { return idUsuario; }
    public void setIdUsuario(Long v) { idUsuario = v; }
    public Long getIdEstablecimiento() { return idEstablecimiento; }
    public void setIdEstablecimiento(Long v) { idEstablecimiento = v; }
    public Long getActorId() { return actorId; }
    public void setActorId(Long v) { actorId = v; }
    public String getAccion() { return accion; }
    public void setAccion(String v) { accion = v; }
    public LocalDateTime getFechaEvento() { return fechaEvento; }
    public void setFechaEvento(LocalDateTime v) { fechaEvento = v; }
    public String getMotivo() { return motivo; }
    public void setMotivo(String v) { motivo = v; }
}
