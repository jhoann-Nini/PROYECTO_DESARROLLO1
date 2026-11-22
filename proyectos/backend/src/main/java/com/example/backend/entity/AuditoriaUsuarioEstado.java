package com.example.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

/**
 * Evento append-only de suspensión o reactivación de una cuenta (Caso 6,
 * migración 024). id_transaccion no se mapea: PostgreSQL la rellena con
 * txid_current() para exigir el evento en la misma transacción del cambio.
 */
@Entity
@Table(name = "auditoria_usuario_estado")
public class AuditoriaUsuarioEstado {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "id_auditoria")
  private Long idAuditoria;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "id_usuario", nullable = false, updatable = false)
  private Usuario usuario;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "id_administrador", nullable = false, updatable = false)
  private Usuario administrador;

  @Column(name = "estado_anterior", nullable = false, updatable = false)
  private Boolean estadoAnterior;

  @Column(name = "estado_nuevo", nullable = false, updatable = false)
  private Boolean estadoNuevo;

  @Column(nullable = false, columnDefinition = "TEXT", updatable = false)
  private String motivo;

  @Column(name = "fecha_evento", nullable = false, updatable = false)
  private LocalDateTime fechaEvento = LocalDateTime.now();

  public Long getIdAuditoria() { return idAuditoria; }
  public Usuario getUsuario() { return usuario; }
  public void setUsuario(Usuario usuario) { this.usuario = usuario; }
  public Usuario getAdministrador() { return administrador; }
  public void setAdministrador(Usuario administrador) { this.administrador = administrador; }
  public Boolean getEstadoAnterior() { return estadoAnterior; }
  public void setEstadoAnterior(Boolean estadoAnterior) { this.estadoAnterior = estadoAnterior; }
  public Boolean getEstadoNuevo() { return estadoNuevo; }
  public void setEstadoNuevo(Boolean estadoNuevo) { this.estadoNuevo = estadoNuevo; }
  public String getMotivo() { return motivo; }
  public void setMotivo(String motivo) { this.motivo = motivo; }
  public LocalDateTime getFechaEvento() { return fechaEvento; }
  public void setFechaEvento(LocalDateTime fechaEvento) { this.fechaEvento = fechaEvento; }
}
