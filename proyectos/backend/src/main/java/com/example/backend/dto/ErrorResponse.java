package com.example.backend.dto;

import java.time.Instant;

/**
 * Estructura estándar de respuesta de error para toda la API REST de
 * TecnoReview.
 */
public record ErrorResponse(
        Instant timestamp,
        int status,
        String error,
        String message,
        String path) {

    public static ErrorResponse of(int status, String error, String message, String path) {
        return new ErrorResponse(Instant.now(), status, error, message, path);
    }
}