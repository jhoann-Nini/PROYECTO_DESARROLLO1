package com.example.backend.dto.comunidad;

import java.util.List;

/** Un nivel de respuestas por cursor; {@code nextCursor} es nulo en la última página. */
public record PaginaRespuestas(List<RespuestaResponse> items, String nextCursor) {
}
