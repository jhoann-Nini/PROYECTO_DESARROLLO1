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
 * Respuesta del foro (comunidad, migración 029), con profundidad de 0 a 2.
 * En PostgreSQL, las FK compuestas obligan a que la madre y la citada sean de
 * la misma publicación, y los triggers calculan la profundidad e impiden
 * cambiar madre, citada, publicación, autor y profundidad.
 */
@Entity
@Table(name = "respuesta_comunidad")
public class RespuestaComunidad {

    public static final int PROFUNDIDAD_MAXIMA = 2;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_respuesta")
    private Long idRespuesta;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_publicacion", nullable = false, updatable = false)
    private PublicacionComunidad publicacion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_respuesta_padre", updatable = false)
    private RespuestaComunidad padre;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_respuesta_citada", updatable = false)
    private RespuestaComunidad citada;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_autor", nullable = false, updatable = false)
    private Usuario autor;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String contenido;

    @Column(nullable = false, updatable = false)
    private Short profundidad;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_moderacion", nullable = false, length = 20)
    private EstadoModeracion estadoModeracion = EstadoModeracion.PUBLICADA;

    @Column(name = "oculta_por_moderacion", nullable = false)
    private boolean ocultaPorModeracion;

    @Column(name = "oculta_por_reportes", nullable = false)
    private boolean ocultaPorReportes;

    @Column(nullable = false)
    private boolean eliminada;

    @Column(name = "fecha_eliminacion")
    private LocalDateTime fechaEliminacion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "eliminada_por")
    private Usuario eliminadaPor;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion = PublicacionComunidad.ahora();

    @Column(name = "fecha_edicion")
    private LocalDateTime fechaEdicion;

    /** Visible para cualquiera: publicada, no oculta y no eliminada. */
    public boolean esVisiblePublicamente() {
        return !eliminada && estadoModeracion == EstadoModeracion.PUBLICADA
            && !ocultaPorModeracion && !ocultaPorReportes;
    }

    public Long getIdRespuesta() { return idRespuesta; }
    public PublicacionComunidad getPublicacion() { return publicacion; }
    public void setPublicacion(PublicacionComunidad publicacion) { this.publicacion = publicacion; }
    public RespuestaComunidad getPadre() { return padre; }
    public void setPadre(RespuestaComunidad padre) { this.padre = padre; }
    public RespuestaComunidad getCitada() { return citada; }
    public void setCitada(RespuestaComunidad citada) { this.citada = citada; }
    public Usuario getAutor() { return autor; }
    public void setAutor(Usuario autor) { this.autor = autor; }
    public String getContenido() { return contenido; }
    public void setContenido(String contenido) { this.contenido = contenido; }
    public Short getProfundidad() { return profundidad; }
    public void setProfundidad(Short profundidad) { this.profundidad = profundidad; }
    public EstadoModeracion getEstadoModeracion() { return estadoModeracion; }
    public void setEstadoModeracion(EstadoModeracion estadoModeracion) { this.estadoModeracion = estadoModeracion; }
    public boolean isOcultaPorModeracion() { return ocultaPorModeracion; }
    public void setOcultaPorModeracion(boolean ocultaPorModeracion) { this.ocultaPorModeracion = ocultaPorModeracion; }
    public boolean isOcultaPorReportes() { return ocultaPorReportes; }
    public void setOcultaPorReportes(boolean ocultaPorReportes) { this.ocultaPorReportes = ocultaPorReportes; }
    public boolean isEliminada() { return eliminada; }
    public void setEliminada(boolean eliminada) { this.eliminada = eliminada; }
    public LocalDateTime getFechaEliminacion() { return fechaEliminacion; }
    public void setFechaEliminacion(LocalDateTime fechaEliminacion) { this.fechaEliminacion = fechaEliminacion; }
    public Usuario getEliminadaPor() { return eliminadaPor; }
    public void setEliminadaPor(Usuario eliminadaPor) { this.eliminadaPor = eliminadaPor; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }
    public LocalDateTime getFechaEdicion() { return fechaEdicion; }
    public void setFechaEdicion(LocalDateTime fechaEdicion) { this.fechaEdicion = fechaEdicion; }
}
