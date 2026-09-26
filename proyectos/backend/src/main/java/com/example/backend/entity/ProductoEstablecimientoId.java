package com.example.backend.entity;

import java.io.Serializable;
import java.util.Objects;

public class ProductoEstablecimientoId implements Serializable {

    private Long producto;
    private Long establecimiento;

    public ProductoEstablecimientoId() {}

    public ProductoEstablecimientoId(Long producto, Long establecimiento) {
        this.producto = producto;
        this.establecimiento = establecimiento;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ProductoEstablecimientoId that)) return false;
        return Objects.equals(producto, that.producto) && Objects.equals(establecimiento, that.establecimiento);
    }

    @Override
    public int hashCode() {
        return Objects.hash(producto, establecimiento);
    }
}
