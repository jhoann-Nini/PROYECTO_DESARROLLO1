package com.example.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Término agregado por un administrador al filtro automático (Caso 6,
 * migración 027). Solo lo evalúa el backend. No se borra: se desactiva.
 */
@Entity
@Table(name = "termino_moderacion")
public class TerminoModeracion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_termino")
    private Long idTermino;

    @Column(nullable = false, length = 60)
    private String termino;

    @Column(name = "termino_normalizado", nullable = false, length = 60)
    private String terminoNormalizado;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CategoriaTerminoModeracion categoria;

    @Column(nullable = false)
    private Boolean activo = true;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_creado_por", nullable = false)
    private Usuario creadoPor;

    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion = LocalDateTime.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_desactivado_por")
    private Usuario desactivadoPor;

    @Column(name = "fecha_desactivacion")
    private LocalDateTime fechaDesactivacion;

    public Long getIdTermino() { return idTermino; }
    public String getTermino() { return termino; }
    public void setTermino(String termino) { this.termino = termino; }
    public String getTerminoNormalizado() { return terminoNormalizado; }
    public void setTerminoNormalizado(String terminoNormalizado) { this.terminoNormalizado = terminoNormalizado; }
    public CategoriaTerminoModeracion getCategoria() { return categoria; }
    public void setCategoria(CategoriaTerminoModeracion categoria) { this.categoria = categoria; }
    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo; }
    public Usuario getCreadoPor() { return creadoPor; }
    public void setCreadoPor(Usuario creadoPor) { this.creadoPor = creadoPor; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public Usuario getDesactivadoPor() { return desactivadoPor; }
    public void setDesactivadoPor(Usuario desactivadoPor) { this.desactivadoPor = desactivadoPor; }
    public LocalDateTime getFechaDesactivacion() { return fechaDesactivacion; }
    public void setFechaDesactivacion(LocalDateTime fechaDesactivacion) { this.fechaDesactivacion = fechaDesactivacion; }
}
