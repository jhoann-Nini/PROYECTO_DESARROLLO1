package com.example.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Apelación de una decisión de moderación RECHAZAR u OCULTAR (Caso 6,
 * migración 026). Los triggers de PostgreSQL hacen cumplir el plazo, la
 * autoría, el conflicto de interés y la inmutabilidad una vez resuelta.
 */
@Entity
@Table(name = "apelacion")
public class Apelacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_apelacion")
    private Long idApelacion;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_auditoria", nullable = false, unique = true)
    private ResenaModeracionAuditoria decision;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_autor", nullable = false)
    private Usuario autor;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String motivo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoApelacion estado = EstadoApelacion.PENDIENTE;

    @Column(name = "fecha_solicitud", nullable = false, updatable = false)
    private LocalDateTime fechaSolicitud = LocalDateTime.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_moderador")
    private Usuario moderador;

    @Column(columnDefinition = "TEXT")
    private String respuesta;

    @Column(name = "fecha_resolucion")
    private LocalDateTime fechaResolucion;

    public Long getIdApelacion() { return idApelacion; }
    public ResenaModeracionAuditoria getDecision() { return decision; }
    public void setDecision(ResenaModeracionAuditoria decision) { this.decision = decision; }
    public Usuario getAutor() { return autor; }
    public void setAutor(Usuario autor) { this.autor = autor; }
    public String getMotivo() { return motivo; }
    public void setMotivo(String motivo) { this.motivo = motivo; }
    public EstadoApelacion getEstado() { return estado; }
    public void setEstado(EstadoApelacion estado) { this.estado = estado; }
    public LocalDateTime getFechaSolicitud() { return fechaSolicitud; }
    public void setFechaSolicitud(LocalDateTime fechaSolicitud) { this.fechaSolicitud = fechaSolicitud; }
    public Usuario getModerador() { return moderador; }
    public void setModerador(Usuario moderador) { this.moderador = moderador; }
    public String getRespuesta() { return respuesta; }
    public void setRespuesta(String respuesta) { this.respuesta = respuesta; }
    public LocalDateTime getFechaResolucion() { return fechaResolucion; }
    public void setFechaResolucion(LocalDateTime fechaResolucion) { this.fechaResolucion = fechaResolucion; }
}
