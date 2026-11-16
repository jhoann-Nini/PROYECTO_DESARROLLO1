
package com.example.backend.entity;

/**
 * Estados de moderación automática de una reseña.
 * Es independiente del estado de eliminación lógica
 * y de los mecanismos de moderación manual.
 */
public enum EstadoModeracion {
  PUBLICADA,
  PENDIENTE
}
