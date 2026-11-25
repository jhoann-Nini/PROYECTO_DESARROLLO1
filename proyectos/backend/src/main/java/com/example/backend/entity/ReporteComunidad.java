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
 * Reporte de una publicación o una respuesta de la comunidad (migración 030).
 * Destino exclusivo: solo una de las dos FK. La base de datos impide el
 * autorreporte, el duplicado abierto y reportar lo eliminado, y exige el
 * historial en cada cambio de estado. La columna generada tipo_contenido no
 * se mapea: el tipo se deduce de la FK presente.
 */
@Entity
@DynamicUpdate
@Table(name = "reporte_comunidad")
public class ReporteComunidad {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_reporte")
    private Long idReporte;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_publicacion", updatable = false)
    private PublicacionComunidad publicacion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_respuesta", updatable = false)
    private RespuestaComunidad respuesta;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_usuario", nullable = false, updatable = false)
    private Usuario usuario;

    @Column(nullable = false, length = 30, updatable = false)
    private String motivo;

    @Column(columnDefinition = "TEXT", updatable = false)
    private String descripcion;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoReporte estado = EstadoReporte.PENDIENTE;

    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion = PublicacionComunidad.ahora();

    @Column(name = "fecha_actualizacion", nullable = false)
    private LocalDateTime fechaActualizacion = fechaCreacion;

    public Long getIdReporte() { return idReporte; }
    public PublicacionComunidad getPublicacion() { return publicacion; }
    public void setPublicacion(PublicacionComunidad publicacion) { this.publicacion = publicacion; }
    public RespuestaComunidad getRespuesta() { return respuesta; }
    public void setRespuesta(RespuestaComunidad respuesta) { this.respuesta = respuesta; }
    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }
    public String getMotivo() { return motivo; }
    public void setMotivo(String motivo) { this.motivo = motivo; }
    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
    public EstadoReporte getEstado() { return estado; }
    public void setEstado(EstadoReporte estado) { this.estado = estado; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public LocalDateTime getFechaActualizacion() { return fechaActualizacion; }
    public void setFechaActualizacion(LocalDateTime fechaActualizacion) { this.fechaActualizacion = PublicacionComunidad.micros(fechaActualizacion); }

    /** Autor del contenido reportado. */
    public Usuario autorDelContenido() {
        return publicacion != null ? publicacion.getAutor() : respuesta.getAutor();
    }
}
