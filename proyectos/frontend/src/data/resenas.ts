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
 * Filtro de moderación automática (TEC-96, ampliado en el Caso 6). Es un
 * filtro por reglas, sin IA. Debe mantenerse alineado con el backend
 * (`ResenaModerationService`): mismas listas, normalizaciones y niveles. El
 * corpus compartido `proyectos/fixtures/moderacion/corpus-moderacion.json`
 * lo comprueba en las dos suites de pruebas. El backend es la autoridad final.
 *
 * Niveles: «ninguno» y «bajo» se publican (bajo = palabra ambigua sobre el
 * producto, solo se avisa); «medio» y «alto» impiden publicar desde el
 * formulario y, si alguien se salta el frontend, el backend las retiene.
 */
export type RiesgoModeracion = "ninguno" | "bajo" | "medio" | "alto";

/**
 * Palabras ambiguas: en una crítica al producto se publican; dirigidas a una
 * persona («eres una basura») suben a «medio». "spam", "estafa" y "fraude"
 * se retiraron antes: describen experiencias de compra legítimas.
 */
export const PALABRAS_AMBIGUAS = [
  "timo", "insulto", "odio", "tonto", "basura", "inutil", "perra", "asqueroso",
] as const;

/** Insultos y vulgaridades: siempre impiden publicar. */
export const PALABRAS_OFENSIVAS = [
  "estupido", "estupida", "idiota", "mierda", "puta", "cabron",
] as const;

export const PALABRAS_NO_PERMITIDAS = [...PALABRAS_AMBIGUAS, ...PALABRAS_OFENSIVAS] as const;

/** Expresiones de amenaza o acoso, ya normalizadas. */
export const FRASES_AMENAZA = [
  "te voy a matar", "voy a matarte", "te mato", "te matare", "ojala te mueras",
  "muerete", "se donde vives", "voy a ir a tu casa", "te voy a buscar",
  "te voy a encontrar", "te voy a partir la cara", "te voy a romper",
] as const;

const SUSTITUCIONES_LEET: Record<string, string> = {
  "@": "a", 4: "a", $: "s", 5: "s", "!": "i", "¡": "i", "|": "i", 1: "i",
  0: "o", 3: "e", "€": "e", 7: "t", 8: "b", 9: "g",
};

/** Letras de otros alfabetos que se ven iguales a las latinas. */
const HOMOGLIFOS: Record<string, string> = {
  // Cirílico
  "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "у": "y", "х": "x", "і": "i",
  "ј": "j", "ѕ": "s", "ԁ": "d", "ӏ": "l", "т": "t", "м": "m", "к": "k", "в": "b",
  // Griego
  "α": "a", "ε": "e", "ο": "o", "ι": "i", "κ": "k", "ν": "v", "ρ": "p", "τ": "t",
  "υ": "u", "χ": "x",
};

const PATRON_HOMOGLIFOS = new RegExp(`[${Object.keys(HOMOGLIFOS).join("")}]`, "g");
const PATRON_LEET = /[@4$5!¡|1037€89]/g;

function escaparRegex(valor: string): string {
  return valor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * NFKC convierte caracteres de compatibilidad (ancho completo); luego
 * minúsculas, homoglifos y, por último, se quitan las tildes.
 */
function normalizarModeracion(texto: string): string {
  return normalizarTexto(
    texto
      .normalize("NFKC")
      .toLowerCase()
      .replace(PATRON_HOMOGLIFOS, (letra) => HOMOGLIFOS[letra] ?? letra),
  );
}

/**
 * Colapsa una letra repetida, aunque tenga separadores entre repeticiones:
 * «idiooooota» → «idiota», «i d i i o t a» → «i d i o t a».
 */
export function colapsarRepeticiones(texto: string): string {
  let resultado = "";
  let separadores = "";
  let ultimaLetra = "";
  for (const caracter of texto) {
    if (caracter >= "a" && caracter <= "z") {
      if (caracter === ultimaLetra) {
        separadores = "";
        continue;
      }
      resultado += separadores + caracter;
      separadores = "";
      ultimaLetra = caracter;
    } else {
      separadores += caracter;
    }
  }
  return resultado + separadores;
}

/**
 * Entre letras se admite cualquier separador («m i e r d a», «p.u.t.a»).
 * Se aceptan plurales con «s» o «es», y los extremos deben ser límite de
 * palabra: «computadora» no activa «puta» ni «último» activa «timo».
 */
function nucleo(palabra: string): string {
  return `${palabra.split("").map(escaparRegex).join("[^a-z]*")}(?:es|s)?(?![a-z])`;
}

/** Antes de una palabra ambigua, la dirigen a una persona. */
const DIRIGIDO =
  "(?:^|[^a-z])(?:(?:eres|sos|son|estas|usted|ustedes|vos|tu)[^a-z]+" +
  "(?:(?:un|una|unos|unas|el|la|los|las|muy|tan|re|todo|toda)[^a-z]+){0,2}" +
  "|(?:pedazo|maldit[oa]s?)[^a-z]+(?:de[^a-z]+)?)";

/**
 * Cada palabra tiene dos patrones: su forma escrita y su forma con letras
 * colapsadas, que se compara con el texto también colapsado («idiooooota»).
 */
function patronesDe(palabra: string, prefijo: string): RegExp[] {
  return [palabra, colapsarRepeticiones(palabra)].map(
    (forma) => new RegExp(prefijo + nucleo(forma)),
  );
}

const PATRONES_PALABRAS = new Map<string, RegExp[]>(
  PALABRAS_NO_PERMITIDAS.map((palabra) => [palabra, patronesDe(palabra, "(?:^|[^a-z])")]),
);
const PATRONES_DIRIGIDOS = new Map<string, RegExp[]>(
  PALABRAS_AMBIGUAS.map((palabra) => [palabra, patronesDe(palabra, DIRIGIDO)]),
);
const PATRONES_AMENAZA = FRASES_AMENAZA.map(
  (frase) => new RegExp(`(?:^|[^a-z])${frase.split(" ").join("[^a-z]+")}(?![a-z])`),
);

/** Texto normalizado, con leet, y ambos con letras repetidas colapsadas. */
function variantes(texto: string): string[] {
  const normalizado = normalizarModeracion(texto);
  const conLeet = normalizado.replace(PATRON_LEET, (simbolo) => SUSTITUCIONES_LEET[simbolo] ?? simbolo);
  return [normalizado, conLeet, colapsarRepeticiones(normalizado), colapsarRepeticiones(conLeet)];
}

function coincide(patrones: RegExp[], textos: string[]): boolean {
  return patrones.some((patron) => textos.some((texto) => patron.test(texto)));
}

export interface ResultadoModeracion {
  riesgo: RiesgoModeracion;
  /** Palabras de la lista presentes, en su forma canónica. */
  palabras: string[];
  amenaza: boolean;
}

/** Clasifica un comentario igual que el backend (sin enlaces ni repeticiones). */
export function analizarComentario(texto: string): ResultadoModeracion {
  if (!texto.trim()) return { riesgo: "ninguno", palabras: [], amenaza: false };
  const textos = variantes(texto);
  const palabras = PALABRAS_NO_PERMITIDAS.filter((palabra) =>
    coincide(PATRONES_PALABRAS.get(palabra)!, textos),
  );
  const amenaza = coincide(PATRONES_AMENAZA, textos);
  const ofensiva = palabras.some((palabra) => (PALABRAS_OFENSIVAS as readonly string[]).includes(palabra));
  const dirigida = PALABRAS_AMBIGUAS.some((palabra) => coincide(PATRONES_DIRIGIDOS.get(palabra)!, textos));

  const riesgo: RiesgoModeracion = amenaza
    ? "alto"
    : ofensiva || dirigida
      ? "medio"
      : palabras.length > 0
        ? "bajo"
        : "ninguno";
  return { riesgo, palabras, amenaza };
}

/**
 * Palabras de la lista presentes en el texto, en su forma canónica. Texto
 * limpio devuelve un arreglo vacío. Detecta mayúsculas, tildes, separadores,
 * leet, homoglifos, letras repetidas y plurales simples.
 */
export function obtenerPalabrasDetectadas(texto: string): string[] {
  return analizarComentario(texto).palabras;
}

/**
 * true si el comentario no se puede publicar desde el formulario (riesgo
 * medio o alto). El backend sigue siendo la autoridad final.
 */
export function contieneLenguajeNoPermitido(texto: string): boolean {
  const { riesgo } = analizarComentario(texto);
  return riesgo === "medio" || riesgo === "alto";
}

/** Mensaje cuando el formulario impide publicar. */
export const MENSAJE_LENGUAJE_NO_PERMITIDO =
  "No pudimos publicar tu opinión: corrige el lenguaje que no se permite.";

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
