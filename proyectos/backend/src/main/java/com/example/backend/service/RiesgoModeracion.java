package com.example.backend.service;

/**
 * Nivel de riesgo que asigna el filtro automático a un comentario (Caso 6).
 * <ul>
 *   <li>NINGUNO y BAJO: se publica. BAJO son palabras ambiguas en contexto de
 *       producto («odio que la batería…»); el frontend solo avisa.</li>
 *   <li>MEDIO: queda en revisión (insultos, vulgaridad, enlaces, spam).</li>
 *   <li>ALTO: queda en revisión con prioridad (amenazas o acoso).</li>
 * </ul>
 * El orden importa: se compara con {@code compareTo}.
 */
public enum RiesgoModeracion {
  NINGUNO,
  BAJO,
  MEDIO,
  ALTO;

  public boolean requiereRevision() {
    return compareTo(MEDIO) >= 0;
  }
}
