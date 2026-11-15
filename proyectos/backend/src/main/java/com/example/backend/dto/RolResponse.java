package com.example.backend.dto;

/** Datos públicos del catálogo de roles para la administración de asignaciones. */
public record RolResponse(
        Long idRol,
        String nombre,
        String descripcion
) {
}
