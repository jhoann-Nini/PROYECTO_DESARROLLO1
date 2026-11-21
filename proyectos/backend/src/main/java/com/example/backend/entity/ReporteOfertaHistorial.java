package com.example.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

/**
 * Evento append-only de cambio de estado de un reporte de oferta (migración 021).
 * <p>
 * La columna id_transaccion no se mapea: PostgreSQL la rellena con
 * txid_current() y la usa para exigir que cada cambio de estado tenga su
 * evento en la misma transacción.
 */
@Entity
@Table(name = "reporte_oferta_historial")
public class ReporteOfertaHistorial {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "id_historial")
  private Long idHistorial;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "id_reporte", nullable = false, updatable = false)
  private ReporteOferta reporte;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "id_moderador", nullable = false, updatable = false)
  private Usuario moderador;

  @Enumerated(EnumType.STRING)
  @Column(name = "estado_anterior", nullable = false, length = 20, updatable = false)
  private EstadoReporte estadoAnterior;

  @Enumerated(EnumType.STRING)
  @Column(name = "estado_nuevo", nullable = false, length = 20, updatable = false)
  private EstadoReporte estadoNuevo;

  @Column(columnDefinition = "TEXT", updatable = false)
  private String justificacion;

  @Column(name = "fecha_evento", nullable = false, updatable = false)
  private LocalDateTime fechaEvento = LocalDateTime.now();

  public Long getIdHistorial() { return idHistorial; }
  public void setIdHistorial(Long idHistorial) { this.idHistorial = idHistorial; }
  public ReporteOferta getReporte() { return reporte; }
  public void setReporte(ReporteOferta reporte) { this.reporte = reporte; }
  public Usuario getModerador() { return moderador; }
  public void setModerador(Usuario moderador) { this.moderador = moderador; }
  public EstadoReporte getEstadoAnterior() { return estadoAnterior; }
  public void setEstadoAnterior(EstadoReporte estadoAnterior) { this.estadoAnterior = estadoAnterior; }
  public EstadoReporte getEstadoNuevo() { return estadoNuevo; }
  public void setEstadoNuevo(EstadoReporte estadoNuevo) { this.estadoNuevo = estadoNuevo; }
  public String getJustificacion() { return justificacion; }
  public void setJustificacion(String justificacion) { this.justificacion = justificacion; }
  public LocalDateTime getFechaEvento() { return fechaEvento; }
  public void setFechaEvento(LocalDateTime fechaEvento) { this.fechaEvento = fechaEvento; }
}
