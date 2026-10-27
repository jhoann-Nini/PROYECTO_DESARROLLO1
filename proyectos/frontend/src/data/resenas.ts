/**
 * Contrato de reglas para el backend (TEC-89 / TEC-90/91/92).
 * El backend es la autoridad final; estas constantes definen la regla
 * acordada y los mensajes oficiales centrados en el usuario.
 */
export const MAX_RESENAS_POR_HORA = 5;

export const MENSAJE_RESENA_DUPLICADA =
  "Ya has valorado este producto. Puedes editar tu reseña existente.";

export const MENSAJE_LIMITE_RESENAS =
  "Has alcanzado el límite de " +
  `${MAX_RESENAS_POR_HORA} reseñas por hora. Intenta de nuevo más tarde.`;

export interface ReglaResenas {
  maxPorHora: number;
  mensajes: {
    duplicada: string;
    limite: string;
  };
}

export const REGLAS_RESENAS: ReglaResenas = {
  maxPorHora: MAX_RESENAS_POR_HORA,
  mensajes: {
    duplicada: MENSAJE_RESENA_DUPLICADA,
    limite: MENSAJE_LIMITE_RESENAS,
  },
};
export const PALABRAS_NO_PERMITIDAS = [
  "spam",
  "insulto",
  "estafa",
  "odio",
  "tonto",
  "idiota",
  "fraude",
  "mierda",
  "puta",
] as const;

/**
 * Comprueba de forma simple el lenguaje no permitido antes de enviar una reseña.
 * El backend sigue siendo la autoridad final.
 */
export function contieneLenguajeNoPermitido(texto: string): boolean {
  const normalizado = texto.toLowerCase();
  return PALABRAS_NO_PERMITIDAS.some((palabra) =>
    normalizado.includes(palabra),
  );
}
