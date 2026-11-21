import { normalizarTexto } from "./productoViewModel";
import type { EstadoModeracionResena } from "@/types/moderacion";

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
 * plurales simples. El backend (`ResenaModerationService`) es la autoridad
 * final y debe mantener la misma lista y las mismas reglas.
 *
 * "spam", "estafa" y "fraude" se retiraron: describen experiencias de compra
 * legítimas ("la tienda fue una estafa") y no son lenguaje ofensivo.
 */
export const PALABRAS_NO_PERMITIDAS = [
  "timo",
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
 * Estrategia: se normaliza el texto (minúsculas, sin tildes) y se busca cada
 * palabra completa dos veces: en el texto tal cual y con las sustituciones
 * leet más comunes (@, $, !, 0, 1, 3, 4 y €). La doble pasada detecta "1diota"
 * sin perder "idiota!", donde el "!" final no forma parte de la palabra.
 * Se detectan plurales simples con "s" o "es" y se evitan los falsos
 * positivos por subcadenas.
 */
export function obtenerPalabrasDetectadas(texto: string): string[] {
  const sinTildes = normalizarTexto(texto);
  if (!sinTildes.trim()) return [];

  const conLeet = sinTildes.replace(
    /[@$!0134€]/g,
    (simbolo) => SUSTITUCIONES_LEET[simbolo] ?? simbolo,
  );

  return PALABRAS_NO_PERMITIDAS.filter(
    (_, indice) =>
      PATRONES_PALABRAS[indice].test(sinTildes) ||
      PATRONES_PALABRAS[indice].test(conLeet),
  );
}

/**
 * Comprueba de forma simple el lenguaje no permitido antes de enviar una reseña.
 * El backend sigue siendo la autoridad final.
 */
export function contieneLenguajeNoPermitido(texto: string): boolean {
  return obtenerPalabrasDetectadas(texto).length > 0;
}

export const MENSAJE_RESENA_EN_REVISION =
  "Recibimos tu opinión. Quedó en revisión y se publicará cuando un moderador la apruebe.";

export const MENSAJE_RESENA_EDITADA_EN_REVISION =
  "Guardamos tus cambios. Tu opinión quedó en revisión y no será visible hasta que un moderador la apruebe.";

/** Una reseña es pública solo si el backend la marcó PUBLICADA (o es un registro previo sin estado). */
export function esResenaPublica(resena: { estadoModeracion?: EstadoModeracionResena | null }): boolean {
  return resena.estadoModeracion === undefined
    || resena.estadoModeracion === null
    || resena.estadoModeracion === "PUBLICADA";
}

/**
 * Inserta al inicio una reseña recién creada en una lista pública.
 * Si quedó en revisión no se muestra: el resto de usuarios no la verá todavía.
 */
export function agregarResenaCreada<T extends { idResena: number; estadoModeracion?: EstadoModeracionResena | null }>(
  lista: T[],
  nueva: T,
): T[] {
  const sinDuplicado = lista.filter((resena) => resena.idResena !== nueva.idResena);
  return esResenaPublica(nueva) ? [nueva, ...sinDuplicado] : sinDuplicado;
}

/**
 * Reemplaza una reseña editada en una lista pública. Si tras editarla quedó en
 * revisión, se retira de la lista para no mostrarla como publicada.
 */
export function aplicarResenaEditada<T extends { idResena: number; estadoModeracion?: EstadoModeracionResena | null }>(
  lista: T[],
  editada: T,
): T[] {
  if (!esResenaPublica(editada)) {
    return lista.filter((resena) => resena.idResena !== editada.idResena);
  }
  return lista.map((resena) => (resena.idResena === editada.idResena ? editada : resena));
}
