package com.example.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "resena")
public class Resena {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_resena")
    private Long idResena;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario", nullable = false)
    private Usuario usuario;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_producto", nullable = false)
    private Producto producto;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String comentario;

    @Column(nullable = false)
    private Integer puntuacion = 5;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion = LocalDateTime.now();

    @Column(nullable = false)
    private Boolean estado = true;

    @Column(name = "oculta_por_reportes", nullable = false)
    private Boolean ocultaPorReportes = false;

    @Column(name = "oculta_por_moderacion", nullable = false)
    private Boolean ocultaPorModeracion = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "moderada_por")
    private Usuario moderadaPor;

    @Column(name = "fecha_moderacion")
    private LocalDateTime fechaModeracion;

    @Column(name = "motivo_moderacion", columnDefinition = "TEXT")
    private String motivoModeracion;

    public Long getIdResena() { return idResena; }
    public void setIdResena(Long idResena) { this.idResena = idResena; }

    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }

    public Producto getProducto() { return producto; }
    public void setProducto(Producto producto) { this.producto = producto; }

    public String getComentario() { return comentario; }
    public void setComentario(String comentario) { this.comentario = comentario; }

    public Integer getPuntuacion() { return puntuacion; }
    public void setPuntuacion(Integer puntuacion) { this.puntuacion = puntuacion; }

    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }

    public Boolean getEstado() { return estado; }
    public void setEstado(Boolean estado) { this.estado = estado; }

    public Boolean getOcultaPorReportes() { return ocultaPorReportes; }
    public void setOcultaPorReportes(Boolean ocultaPorReportes) { this.ocultaPorReportes = ocultaPorReportes; }

    public Boolean getOcultaPorModeracion() { return ocultaPorModeracion; }
    public void setOcultaPorModeracion(Boolean ocultaPorModeracion) { this.ocultaPorModeracion = ocultaPorModeracion; }

    public Usuario getModeradaPor() { return moderadaPor; }
    public void setModeradaPor(Usuario moderadaPor) { this.moderadaPor = moderadaPor; }

    public LocalDateTime getFechaModeracion() { return fechaModeracion; }
    public void setFechaModeracion(LocalDateTime fechaModeracion) { this.fechaModeracion = fechaModeracion; }

    public String getMotivoModeracion() { return motivoModeracion; }
    public void setMotivoModeracion(String motivoModeracion) { this.motivoModeracion = motivoModeracion; }
}
