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
