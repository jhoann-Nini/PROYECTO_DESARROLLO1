package com.example.backend.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "producto_establecimiento")
@IdClass(ProductoEstablecimientoId.class)
public class ProductoEstablecimiento {

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_producto")
    private Producto producto;

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_establecimiento")
    private Establecimiento establecimiento;

    @Column(precision = 12, scale = 2)
    private BigDecimal precio;

    @Column(nullable = false)
    private Boolean disponibilidad = true;

    /** Enlace a la oferta en la tienda (migración 022). Opcional, http o https. */
    @Column(name = "url_oferta", columnDefinition = "TEXT")
    private String urlOferta;

    /**
     * Último cambio de precio, disponibilidad o enlace (migración 022).
     * En PostgreSQL la fija un trigger; el valor de la aplicación solo
     * aplica donde no hay trigger (H2 en pruebas).
     */
    @Column(name = "fecha_actualizacion_precio", nullable = false)
    private LocalDateTime fechaActualizacionPrecio = LocalDateTime.now();

    public Producto getProducto() { return producto; }
    public void setProducto(Producto producto) { this.producto = producto; }
    public Establecimiento getEstablecimiento() { return establecimiento; }
    public void setEstablecimiento(Establecimiento establecimiento) { this.establecimiento = establecimiento; }
    public BigDecimal getPrecio() { return precio; }
    public void setPrecio(BigDecimal precio) { this.precio = precio; }
    public Boolean getDisponibilidad() { return disponibilidad; }
    public void setDisponibilidad(Boolean disponibilidad) { this.disponibilidad = disponibilidad; }
    public String getUrlOferta() { return urlOferta; }
    public void setUrlOferta(String urlOferta) { this.urlOferta = urlOferta; }
    public LocalDateTime getFechaActualizacionPrecio() { return fechaActualizacionPrecio; }
    public void setFechaActualizacionPrecio(LocalDateTime fechaActualizacionPrecio) {
        this.fechaActualizacionPrecio = fechaActualizacionPrecio;
    }
}
