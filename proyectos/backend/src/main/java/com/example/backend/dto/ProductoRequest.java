package com.example.backend.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * Datos que el cliente envía para crear o actualizar un producto.
 * idCategoria e idMarca referencian entidades existentes por su id.
 */
public record ProductoRequest(

        @NotBlank(message = "El nombre es obligatorio")
        @Size(max = 150, message = "El nombre no puede superar 150 caracteres")
        String nombre,

        String descripcion,

        @NotNull(message = "La categoría es obligatoria")
        Long idCategoria,

        @NotNull(message = "La marca es obligatoria")
        Long idMarca,

        String imagen,

        @DecimalMin(value = "0.0", inclusive = true, message = "El precio no puede ser negativo")
        BigDecimal precioReferencia
) {
}
