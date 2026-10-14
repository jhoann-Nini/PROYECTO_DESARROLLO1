package com.example.backend.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Exception thrown when a request would cause a conflict, e.g., deleting an already inactive resource.
 */
public class ConflictException extends ResponseStatusException {
    public ConflictException(String reason) {
        super(HttpStatus.CONFLICT, reason);
    }
}
