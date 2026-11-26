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
import org.hibernate.annotations.DynamicUpdate;

/**
 * Apelación de una decisión de moderación de la comunidad (migración 031).
 * Los triggers hacen cumplir el plazo, la autoría, una por decisión, la
 * resolución única y el conflicto de interés; al resolver, la base fija la
 * fecha e id_transaccion_resolucion (no se mapea).
 */
@Entity
@DynamicUpdate
@Table(name = "apelacion_comunidad")
public class ApelacionComunidad {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_apelacion")
    private Long idApelacion;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_auditoria", nullable = false, unique = true, updatable = false)
    private ModeracionComunidadAuditoria decision;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_autor", nullable = false, updatable = false)
    private Usuario autor;

    @Column(nullable = false, columnDefinition = "TEXT", updatable = false)
    private String motivo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoApelacion estado = EstadoApelacion.PENDIENTE;

    @Column(name = "fecha_solicitud", nullable = false, updatable = false)
    private LocalDateTime fechaSolicitud = PublicacionComunidad.ahora();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_moderador")
    private Usuario moderador;

    @Column(columnDefinition = "TEXT")
    private String respuesta;

    @Column(name = "fecha_resolucion")
    private LocalDateTime fechaResolucion;

    protected ApelacionComunidad() {
    }

    public ApelacionComunidad(ModeracionComunidadAuditoria decision, Usuario autor, String motivo) {
        this.decision = decision;
        this.autor = autor;
        this.motivo = motivo;
    }

    /** Resuelve la apelación una sola vez; el trigger de la 031 vuelve a validarlo. */
    public void resolver(EstadoApelacion nuevo, Usuario moderador, String respuesta) {
        this.estado = nuevo;
        this.moderador = moderador;
        this.respuesta = respuesta;
        this.fechaResolucion = PublicacionComunidad.ahora();
    }

    public Long getIdApelacion() { return idApelacion; }
    public ModeracionComunidadAuditoria getDecision() { return decision; }
    public Usuario getAutor() { return autor; }
    public String getMotivo() { return motivo; }
    public EstadoApelacion getEstado() { return estado; }
    public LocalDateTime getFechaSolicitud() { return fechaSolicitud; }
    public Usuario getModerador() { return moderador; }
    public String getRespuesta() { return respuesta; }
    public LocalDateTime getFechaResolucion() { return fechaResolucion; }
}
