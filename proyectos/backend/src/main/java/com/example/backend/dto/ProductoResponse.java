package com.example.backend.dto;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Datos que la API devuelve al consultar un producto.
 * Se exponen los IDs relacionados para mantener la respuesta simple.
 * caracteristicas expone especificaciones técnicas estructuradas (JSONB).
 */
public record ProductoResponse(
        Long idProducto,
        String nombre,
        String descripcion,
        Long idCategoria,
        Long idMarca,
        String imagen,
        BigDecimal precioReferencia,
        Boolean estado,
        Map<String, Object> caracteristicas
) {
        /**
         * Constructor de compatibilidad hacia atrás para pruebas o código
         * que no requiera especificar características.
         */
        public ProductoResponse(
                Long idProducto,
                String nombre,
                String descripcion,
                Long idCategoria,
                Long idMarca,
                String imagen,
                BigDecimal precioReferencia,
                Boolean estado) {
                this(idProducto, nombre, descripcion, idCategoria, idMarca, imagen, precioReferencia, estado, null);
        }
}