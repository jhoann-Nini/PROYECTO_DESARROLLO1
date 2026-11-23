package com.example.backend.entity;

/** Categoría de un término de moderación agregado por administradores (migración 027). */
public enum CategoriaTerminoModeracion {
    AMENAZA("Amenaza"),
    ACOSO("Acoso"),
    DISCRIMINACION("Discriminación"),
    INSULTO("Insulto"),
    SPAM("Spam");

    private final String etiqueta;

    CategoriaTerminoModeracion(String etiqueta) {
        this.etiqueta = etiqueta;
    }

    public String etiqueta() {
        return etiqueta;
    }
}
