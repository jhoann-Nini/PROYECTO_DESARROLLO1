package com.example.backend.dto.comunidad;

/** Estado del «Me gusta» después de darlo o retirarlo. */
public record MeGustaResponse(long meGusta, boolean meGustaPropio) {
}
