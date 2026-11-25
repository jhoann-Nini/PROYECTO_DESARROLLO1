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
import java.time.temporal.ChronoUnit;

/**
 * Publicación del foro, general o de un producto (comunidad, migración 029).
 * La base de datos hace cumplir el tipo y el producto, los largos y que el
 * autor, el tipo y el producto no cambien. La eliminación es lógica.
 */
@Entity
@Table(name = "publicacion_comunidad")
public class PublicacionComunidad {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_publicacion")
    private Long idPublicacion;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10, updatable = false)
    private TipoPublicacion tipo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_producto", updatable = false)
    private Producto producto;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_autor", nullable = false, updatable = false)
    private Usuario autor;

    @Column(nullable = false, length = 150)
    private String titulo;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String contenido;

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

    @Column(nullable = false)
    private boolean cerrada;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion = ahora();

    @Column(name = "fecha_edicion")
    private LocalDateTime fechaEdicion;

    @Column(name = "fecha_ultima_actividad", nullable = false)
    private LocalDateTime fechaUltimaActividad = fechaCreacion;

    /** Microsegundos, la precisión de PostgreSQL: el cursor compara fechas exactas. */
    public static LocalDateTime ahora() {
        return LocalDateTime.now().truncatedTo(ChronoUnit.MICROS);
    }

    /** Visible para cualquiera: publicada, no oculta y no eliminada. */
    public boolean esVisiblePublicamente() {
        return !eliminada && estadoModeracion == EstadoModeracion.PUBLICADA
            && !ocultaPorModeracion && !ocultaPorReportes;
    }

    public Long getIdPublicacion() { return idPublicacion; }
    public TipoPublicacion getTipo() { return tipo; }
    public void setTipo(TipoPublicacion tipo) { this.tipo = tipo; }
    public Producto getProducto() { return producto; }
    public void setProducto(Producto producto) { this.producto = producto; }
    public Usuario getAutor() { return autor; }
    public void setAutor(Usuario autor) { this.autor = autor; }
    public String getTitulo() { return titulo; }
    public void setTitulo(String titulo) { this.titulo = titulo; }
    public String getContenido() { return contenido; }
    public void setContenido(String contenido) { this.contenido = contenido; }
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
    public boolean isCerrada() { return cerrada; }
    public void setCerrada(boolean cerrada) { this.cerrada = cerrada; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }
    public LocalDateTime getFechaEdicion() { return fechaEdicion; }
    public void setFechaEdicion(LocalDateTime fechaEdicion) { this.fechaEdicion = fechaEdicion; }
    public LocalDateTime getFechaUltimaActividad() { return fechaUltimaActividad; }
    public void setFechaUltimaActividad(LocalDateTime fechaUltimaActividad) { this.fechaUltimaActividad = fechaUltimaActividad; }
}
