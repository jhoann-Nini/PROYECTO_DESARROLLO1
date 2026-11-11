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

const SUSTITUCIONES_LEET: Record<string, string> = {
  "@": "a",
  $: "s",
  "!": "i",
  0: "o",
  1: "i",
  3: "e",
  4: "a",
  "€": "e",
};

function escaparRegex(valor: string): string {
  return valor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Cada término se busca como palabra completa. Entre sus letras se permite
 * cualquier separador para tolerar evasiones como "est@fa", "ESTU-PIDO" o
 * "m i e r d a", pero los extremos deben coincidir con límites de palabra.
 * Así "computadora" no activa "puta" ni "último" activa "timo".
 */
const PATRONES_PALABRAS = PALABRAS_NO_PERMITIDAS.map((palabra) => {
  const cuerpo = normalizarTexto(palabra)
    .split("")
    .map(escaparRegex)
    .join("[^a-z]*");

  return new RegExp(`(?:^|[^a-z])${cuerpo}(?:es|s)?(?![a-z])`);
});

/**
 * Devuelve las palabras prohibidas presentes en el texto, en su forma
 * canónica de la lista oficial. Texto limpio devuelve un arreglo vacío.
 *
 * Estrategia: se normaliza el texto (minúsculas, sin tildes), se aplican las
 * sustituciones leet más comunes (@, $, !, 0, 1, 3, 4 y €) y se exige una
 * coincidencia de palabra completa. Se detectan plurales simples con "s" o
 * "es" y se evitan los falsos positivos por subcadenas.
 */
export function obtenerPalabrasDetectadas(texto: string): string[] {
  const sinTildes = normalizarTexto(texto);
  if (!sinTildes.trim()) return [];

  const normalizado = sinTildes.replace(
    /[@$!0134€]/g,
    (simbolo) => SUSTITUCIONES_LEET[simbolo] ?? simbolo,
  );

  return PALABRAS_NO_PERMITIDAS.filter((_, indice) =>
    PATRONES_PALABRAS[indice].test(normalizado),
  );
}

/**
 * Comprueba de forma simple el lenguaje no permitido antes de enviar una reseña.
 * El backend sigue siendo la autoridad final.
 */
export function contieneLenguajeNoPermitido(texto: string): boolean {
  return obtenerPalabrasDetectadas(texto).length > 0;
}
