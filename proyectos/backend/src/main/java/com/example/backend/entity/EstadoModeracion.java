
package com.example.backend.entity;

/**
 * Estados de moderación del contenido de una reseña.
 * Es independiente del estado de eliminación lógica
 * y del ocultamiento manual o por reportes.
 * <ul>
 *   <li>PUBLICADA: visible públicamente.</li>
 *   <li>PENDIENTE: retenida por el filtro automático, en espera de revisión humana.</li>
 *   <li>RECHAZADA: un moderador revisó el contenido y no lo publicó (migración 020).</li>
 * </ul>
 * Salir de PENDIENTE exige un evento APROBAR o RECHAZAR en resena_moderacion_auditoria.
 */
public enum EstadoModeracion {
  PUBLICADA,
  PENDIENTE,
  RECHAZADA
}
