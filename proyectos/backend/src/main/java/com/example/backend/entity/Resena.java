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

    @Column(length = 150)
    private String titulo;

    @Column(columnDefinition = "TEXT")
    private String ventajas;

    @Column(columnDefinition = "TEXT")
    private String desventajas;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion = LocalDateTime.now();

    @Column(nullable = false)
    private Boolean estado = true;

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
    public String getTitulo() { return titulo; }
    public void setTitulo(String titulo) { this.titulo = titulo; }
    public String getVentajas() { return ventajas; }
    public void setVentajas(String ventajas) { this.ventajas = ventajas; }
    public String getDesventajas() { return desventajas; }
    public void setDesventajas(String desventajas) { this.desventajas = desventajas; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }
    public Boolean getEstado() { return estado; }
    public void setEstado(Boolean estado) { this.estado = estado; }
}
