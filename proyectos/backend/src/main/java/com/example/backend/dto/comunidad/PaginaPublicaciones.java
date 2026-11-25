package com.example.backend.dto.comunidad;

import java.util.List;

/** Página por cursor; {@code nextCursor} es nulo en la última. {@code total} cuenta las visibles. */
public record PaginaPublicaciones(List<PublicacionResumenResponse> items, String nextCursor, long total) {
}
