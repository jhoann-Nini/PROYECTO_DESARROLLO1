package com.example.backend.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Excepción lanzada cuando un usuario supera el límite de solicitudes permitidas en una ventana de tiempo (HTTP 429).
 */
public class TooManyRequestsException extends ResponseStatusException {

    public TooManyRequestsException(String reason) {
        super(HttpStatus.TOO_MANY_REQUESTS, reason);
    }
}
