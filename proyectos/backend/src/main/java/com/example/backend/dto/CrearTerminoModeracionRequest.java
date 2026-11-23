package com.example.backend.dto;

import com.example.backend.entity.CategoriaTerminoModeracion;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Alta de un término de moderación (solo administradores). */
public record CrearTerminoModeracionRequest(
    @NotBlank(message = "Escribe el término.")
    @Size(max = 60, message = "El término no puede superar los 60 caracteres.")
    String termino,
    @NotNull(message = "Elige una categoría.")
    CategoriaTerminoModeracion categoria
) {}
