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
 * Evento del historial de un reporte de la comunidad (migración 030), de solo
 * inserción. id_transaccion lo pone la base de datos y no se mapea.
 */
@Entity
@Table(name = "reporte_comunidad_historial")
public class ReporteComunidadHistorial {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_historial")
    private Long idHistorial;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_reporte", nullable = false, updatable = false)
    private ReporteComunidad reporte;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_moderador", nullable = false, updatable = false)
    private Usuario moderador;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_anterior", nullable = false, length = 20, updatable = false)
    private EstadoReporte estadoAnterior;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_nuevo", nullable = false, length = 20, updatable = false)
    private EstadoReporte estadoNuevo;

    @Column(nullable = false, columnDefinition = "TEXT", updatable = false)
    private String justificacion;

    @Column(name = "fecha_evento", nullable = false, updatable = false)
    private LocalDateTime fechaEvento = PublicacionComunidad.ahora();

    protected ReporteComunidadHistorial() {
    }

    public ReporteComunidadHistorial(ReporteComunidad reporte, Usuario moderador, EstadoReporte estadoNuevo, String justificacion) {
        this.reporte = reporte;
        this.moderador = moderador;
        this.estadoAnterior = reporte.getEstado();
        this.estadoNuevo = estadoNuevo;
        this.justificacion = justificacion;
    }

    public Long getIdHistorial() { return idHistorial; }
    public ReporteComunidad getReporte() { return reporte; }
    public Usuario getModerador() { return moderador; }
    public EstadoReporte getEstadoAnterior() { return estadoAnterior; }
    public EstadoReporte getEstadoNuevo() { return estadoNuevo; }
    public String getJustificacion() { return justificacion; }
    public LocalDateTime getFechaEvento() { return fechaEvento; }
}
