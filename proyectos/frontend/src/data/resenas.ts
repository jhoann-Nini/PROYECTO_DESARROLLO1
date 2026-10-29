import { normalizarTexto } from "./productoViewModel";

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
/**
 * Lista oficial de términos bloqueados (TEC-96). La coincidencia ignora
 * mayúsculas, tildes y símbolos o espacios intermedios (evasiones), y detecta
 * plurales simples. La lista es ajustable; el backend (TEC-97) es la
 * autoridad final de la decisión.
 */
export const PALABRAS_NO_PERMITIDAS = [
  "spam",
  "estafa",
  "timo",
  "fraude",
  "insulto",
  "odio",
  "tonto",
  "estupido",
  "estupida",
  "idiota",
  "basura",
  "inutil",
  "mierda",
  "puta",
  "perra",
  "cabron",
  "asqueroso",
] as const;

/**
 * Devuelve las palabras prohibidas presentes en el texto, en su forma
 * canónica de la lista oficial. Texto limpio devuelve un arreglo vacío.
 *
 * Estrategia: se normaliza el texto (minúsculas, sin tildes) y se aplana la
 * separación y los símbolos para tolerar evasiones como "est@fa",
 * "ESTU-PIDO" o "m i e r d a". Las sustituciones leet recogidas son las más
 * comunes (@, $, !, 0, 1, 3, 4 y €); los falsos positivos por subcadenas de
 * palabras válidas son raros porque la lista usa palabras completas.
 */
export function obtenerPalabrasDetectadas(texto: string): string[] {
  const sinTildes = normalizarTexto(texto);
  if (!sinTildes.trim()) return [];

  const continuo = sinTildes
    .replace(/[@$!0134€]/g, (simbolo) =>
      (({ "@": "a", $: "s", "!": "i", 0: "o", 1: "i", 3: "e", 4: "a", "€": "e" })[
        simbolo
      ] ?? simbolo),
    )
    .replace(/[^a-z0-9]+/g, "");
  if (!continuo) return [];

  return PALABRAS_NO_PERMITIDAS.filter((palabra) =>
    continuo.includes(normalizarTexto(palabra)),
  );
}

/**
 * Comprueba de forma simple el lenguaje no permitido antes de enviar una reseña.
 * El backend sigue siendo la autoridad final.
 */
export function contieneLenguajeNoPermitido(texto: string): boolean {
  return obtenerPalabrasDetectadas(texto).length > 0;
}
