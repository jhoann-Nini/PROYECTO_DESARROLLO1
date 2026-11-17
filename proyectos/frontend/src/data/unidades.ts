/**
 * Registro de unidades y funciones puras de normalización.
 *
 * Reglas del módulo:
 * - No se lanza ninguna excepción por entradas desconocidas o malformadas.
 * - Se conserva siempre el texto original del dato.
 * - `GB` (decimal) y `GiB` (binario) son unidades distintas.
 * - No se convierten magnitudes de dimensiones diferentes.
 * - Las unidades ambiguas no habilitan comparaciones automáticas.
 *
 * Política de símbolos: el reconocimiento es exacto y sensible a mayúsculas.
 * No se normaliza `gb` a `GB` porque `Gb` puede significar gigabit y `b`
 * puede significar bit. Los alias lingüísticos admitidos se enumeran de forma
 * explícita; las variantes acentuadas solo se aceptan si están registradas.
 */

import type { SistemaUnidades, UnidadCanonica } from "@/types/fichaTecnica";

export type DimensionUnidad =
  | "almacenamiento"
  | "longitud"
  | "frecuencia"
  | "carga_electrica"
  | "energia"
  | "masa"
  | "potencia"
  | "tiempo"
  | "resolucion"
  | "puntuacion"
  | "porcentaje"
  | "brillo";

export interface DefinicionUnidad {
  unidad: UnidadCanonica;
  simbolo: string;
  dimension: DimensionUnidad;
  sistema: SistemaUnidades;
  /** Factor hacia la unidad base de la dimensión. */
  factorBase: number;
  base: string;
  alias: readonly string[];
}

const DEFINICIONES_BASE = [
  {
    unidad: "B",
    simbolo: "B",
    dimension: "almacenamiento",
    sistema: "decimal",
    factorBase: 1,
    base: "B",
    alias: ["B", "byte", "bytes"],
  },
  {
    unidad: "kB",
    simbolo: "kB",
    dimension: "almacenamiento",
    sistema: "decimal",
    factorBase: 1_000,
    base: "B",
    alias: ["kB", "kilobyte", "kilobytes"],
  },
  {
    unidad: "MB",
    simbolo: "MB",
    dimension: "almacenamiento",
    sistema: "decimal",
    factorBase: 1_000_000,
    base: "B",
    alias: ["MB", "megabyte", "megabytes"],
  },
  {
    unidad: "GB",
    simbolo: "GB",
    dimension: "almacenamiento",
    sistema: "decimal",
    factorBase: 1_000_000_000,
    base: "B",
    alias: ["GB", "gigabyte", "gigabytes"],
  },
  {
    unidad: "TB",
    simbolo: "TB",
    dimension: "almacenamiento",
    sistema: "decimal",
    factorBase: 1_000_000_000_000,
    base: "B",
    alias: ["TB", "terabyte", "terabytes"],
  },
  {
    unidad: "KiB",
    simbolo: "KiB",
    dimension: "almacenamiento",
    sistema: "binario",
    factorBase: 1_024,
    base: "B",
    alias: ["KiB", "kibibyte", "kibibytes"],
  },
  {
    unidad: "MiB",
    simbolo: "MiB",
    dimension: "almacenamiento",
    sistema: "binario",
    factorBase: 1_048_576,
    base: "B",
    alias: ["MiB", "mebibyte", "mebibytes"],
  },
  {
    unidad: "GiB",
    simbolo: "GiB",
    dimension: "almacenamiento",
    sistema: "binario",
    factorBase: 1_073_741_824,
    base: "B",
    alias: ["GiB", "gibibyte", "gibibytes"],
  },
  {
    unidad: "TiB",
    simbolo: "TiB",
    dimension: "almacenamiento",
    sistema: "binario",
    factorBase: 1_099_511_627_776,
    base: "B",
    alias: ["TiB", "tebibyte", "tebibytes"],
  },
  {
    unidad: "mm",
    simbolo: "mm",
    dimension: "longitud",
    sistema: "internacional",
    factorBase: 1,
    base: "mm",
    alias: ["mm", "milimetro", "milimetros", "milímetro", "milímetros"],
  },
  {
    unidad: "cm",
    simbolo: "cm",
    dimension: "longitud",
    sistema: "internacional",
    factorBase: 10,
    base: "mm",
    alias: ["cm", "centimetro", "centimetros", "centímetro", "centímetros"],
  },
  {
    unidad: "in",
    simbolo: "in",
    dimension: "longitud",
    sistema: "imperial",
    factorBase: 25.4,
    base: "mm",
    alias: ["in", "pulgada", "pulgadas", "″", '"'],
  },
  {
    unidad: "Hz",
    simbolo: "Hz",
    dimension: "frecuencia",
    sistema: "internacional",
    factorBase: 1,
    base: "Hz",
    alias: ["Hz", "hertz"],
  },
  {
    unidad: "kHz",
    simbolo: "kHz",
    dimension: "frecuencia",
    sistema: "internacional",
    factorBase: 1_000,
    base: "Hz",
    alias: ["kHz", "kilohertz"],
  },
  {
    unidad: "MHz",
    simbolo: "MHz",
    dimension: "frecuencia",
    sistema: "internacional",
    factorBase: 1_000_000,
    base: "Hz",
    alias: ["MHz", "megahertz"],
  },
  {
    unidad: "GHz",
    simbolo: "GHz",
    dimension: "frecuencia",
    sistema: "internacional",
    factorBase: 1_000_000_000,
    base: "Hz",
    alias: ["GHz", "gigahertz"],
  },
  {
    unidad: "mAh",
    simbolo: "mAh",
    dimension: "carga_electrica",
    sistema: "internacional",
    factorBase: 1,
    base: "mAh",
    alias: ["mAh", "miliamperio-hora", "miliamperios-hora"],
  },
  {
    unidad: "Ah",
    simbolo: "Ah",
    dimension: "carga_electrica",
    sistema: "internacional",
    factorBase: 1_000,
    base: "mAh",
    alias: ["Ah", "amperio-hora", "amperios-hora"],
  },
  {
    unidad: "mWh",
    simbolo: "mWh",
    dimension: "energia",
    sistema: "internacional",
    factorBase: 0.001,
    base: "Wh",
    alias: ["mWh", "milivatio-hora"],
  },
  {
    unidad: "Wh",
    simbolo: "Wh",
    dimension: "energia",
    sistema: "internacional",
    factorBase: 1,
    base: "Wh",
    alias: ["Wh", "vatio-hora"],
  },
  {
    unidad: "kWh",
    simbolo: "kWh",
    dimension: "energia",
    sistema: "internacional",
    factorBase: 1_000,
    base: "Wh",
    alias: ["kWh", "kilovatio-hora"],
  },
  {
    unidad: "mg",
    simbolo: "mg",
    dimension: "masa",
    sistema: "internacional",
    factorBase: 0.001,
    base: "g",
    alias: ["mg", "miligramo", "miligramos"],
  },
  {
    unidad: "g",
    simbolo: "g",
    dimension: "masa",
    sistema: "internacional",
    factorBase: 1,
    base: "g",
    alias: ["g", "gramo", "gramos"],
  },
  {
    unidad: "kg",
    simbolo: "kg",
    dimension: "masa",
    sistema: "internacional",
    factorBase: 1_000,
    base: "g",
    alias: ["kg", "kilogramo", "kilogramos"],
  },
  {
    unidad: "mW",
    simbolo: "mW",
    dimension: "potencia",
    sistema: "internacional",
    factorBase: 0.001,
    base: "W",
    alias: ["mW", "milivatio", "milivatios"],
  },
  {
    unidad: "W",
    simbolo: "W",
    dimension: "potencia",
    sistema: "internacional",
    factorBase: 1,
    base: "W",
    alias: ["W", "vatio", "vatios"],
  },
  {
    unidad: "ms",
    simbolo: "ms",
    dimension: "tiempo",
    sistema: "internacional",
    factorBase: 1,
    base: "ms",
    alias: ["ms", "milisegundo", "milisegundos"],
  },
  {
    unidad: "s",
    simbolo: "s",
    dimension: "tiempo",
    sistema: "internacional",
    factorBase: 1_000,
    base: "ms",
    alias: ["s", "segundo", "segundos"],
  },
  {
    unidad: "min",
    simbolo: "min",
    dimension: "tiempo",
    sistema: "internacional",
    factorBase: 60_000,
    base: "ms",
    alias: ["min", "minuto", "minutos"],
  },
  {
    unidad: "h",
    simbolo: "h",
    dimension: "tiempo",
    sistema: "internacional",
    factorBase: 3_600_000,
    base: "ms",
    alias: ["h", "hora", "horas"],
  },
  {
    unidad: "mpx",
    simbolo: "mpx",
    dimension: "resolucion",
    sistema: "sin_sistema",
    factorBase: 1,
    base: "mpx",
    alias: ["mpx", "MP", "megapixel", "megapixeles", "megapíxel", "megapíxeles"],
  },
  {
    unidad: "puntos",
    simbolo: "puntos",
    dimension: "puntuacion",
    sistema: "sin_sistema",
    factorBase: 1,
    base: "puntos",
    alias: ["puntos", "punto", "pts"],
  },
  {
    unidad: "%",
    simbolo: "%",
    dimension: "porcentaje",
    sistema: "sin_sistema",
    factorBase: 1,
    base: "%",
    alias: ["%", "por ciento", "porcentaje"],
  },
  {
    unidad: "nits",
    simbolo: "nits",
    dimension: "brillo",
    sistema: "sin_sistema",
    factorBase: 1,
    base: "nits",
    alias: ["nits", "nit"],
  },
] as const satisfies readonly DefinicionUnidad[];

/**
 * Copia congelada del registro. Se congelan también los alias para que una
 * mutación externa no pueda desincronizar el índice de búsqueda.
 */
export const DEFINICIONES_UNIDAD: readonly Readonly<DefinicionUnidad>[] =
  Object.freeze(
    DEFINICIONES_BASE.map((definicion) =>
      Object.freeze({
        ...definicion,
        alias: Object.freeze([...definicion.alias]),
      }),
    ),
  );

type UnidadRegistrada = (typeof DEFINICIONES_BASE)[number]["unidad"];

/**
 * Verificación en tiempo de compilación: si se añade una unidad canónica sin
 * definición, `UnidadesFaltantes` deja de ser `never` y la asignación falla.
 */
type UnidadesFaltantes = Exclude<UnidadCanonica, UnidadRegistrada>;
const VERIFICACION_COBERTURA_UNIDADES: UnidadesFaltantes extends never
  ? true
  : never = true;
void VERIFICACION_COBERTURA_UNIDADES;

/**
 * Símbolos que no identifican una unidad de forma inequívoca. Se mantienen
 * fuera de las comparaciones automáticas en lugar de adivinar su significado.
 */
const SIMBOLOS_AMBIGUOS = new Set<string>([
  "b",
  "bit",
  "bits",
  "k",
  "K",
  "m",
  "M",
  "G",
  "t",
  "T",
  "KB",
  "kb",
  "mb",
  "tb",
  "Gb",
  "Gbps",
  "Mbps",
]);

const INDICE_EXACTO = new Map<string, DefinicionUnidad>();
for (const definicion of DEFINICIONES_UNIDAD) {
  INDICE_EXACTO.set(definicion.simbolo, definicion);
  for (const alias of definicion.alias) {
    INDICE_EXACTO.set(alias, definicion);
  }
}

export type EstadoNormalizacionUnidad =
  | "reconocida"
  | "ambigua"
  | "desconocida";

export type ResultadoUnidad =
  | {
      estado: "reconocida";
      textoOriginal: string;
      unidad: UnidadCanonica;
      definicion: DefinicionUnidad;
    }
  | {
      estado: "ambigua";
      textoOriginal: string;
      unidad: null;
      motivo: string;
    }
  | {
      estado: "desconocida";
      textoOriginal: string;
      unidad: null;
      motivo: string;
    };

function textoDe(valor: unknown): string {
  if (typeof valor === "string") return valor;
  if (valor === null || valor === undefined) return "";
  try {
    return String(valor);
  } catch {
    // Objetos sin conversión primitiva no deben romper las funciones puras.
    return "";
  }
}

/**
 * Normaliza un símbolo de unidad. Nunca lanza excepciones.
 * El `textoOriginal` devuelto es exactamente el valor recibido.
 */
export function normalizarUnidad(texto: unknown): ResultadoUnidad {
  const textoOriginal = textoDe(texto);
  const limpio = textoOriginal.trim();

  if (!limpio) {
    return {
      estado: "desconocida",
      textoOriginal,
      unidad: null,
      motivo: "La unidad está vacía.",
    };
  }

  const coincidencia = INDICE_EXACTO.get(limpio);
  if (coincidencia && !SIMBOLOS_AMBIGUOS.has(limpio)) {
    return {
      estado: "reconocida",
      textoOriginal,
      unidad: coincidencia.unidad,
      definicion: coincidencia,
    };
  }

  if (SIMBOLOS_AMBIGUOS.has(limpio)) {
    return {
      estado: "ambigua",
      textoOriginal,
      unidad: null,
      motivo: `La unidad "${limpio}" es ambigua y no se normaliza automáticamente.`,
    };
  }

  return {
    estado: "desconocida",
    textoOriginal,
    unidad: null,
    motivo: `La unidad "${limpio}" no está registrada.`,
  };
}

export function esUnidadReconocida(texto: unknown): boolean {
  return normalizarUnidad(texto).estado === "reconocida";
}

export function esUnidadAmbigua(texto: unknown): boolean {
  return normalizarUnidad(texto).estado === "ambigua";
}

export function definicionDeUnidad(
  texto: unknown,
): DefinicionUnidad | null {
  const resultado = normalizarUnidad(texto);
  return resultado.estado === "reconocida" ? resultado.definicion : null;
}

export function unidadCanonicaDe(texto: unknown): UnidadCanonica | null {
  return definicionDeUnidad(texto)?.unidad ?? null;
}

function ajustarArtefactoDePuntoFlotante(valor: number): number {
  if (!Number.isFinite(valor)) return valor;
  if (Object.is(valor, -0)) return 0;
  // Los enteros dentro del rango seguro se conservan sin tocarlos.
  if (Number.isInteger(valor)) return valor;
  if (Math.abs(valor) > Number.MAX_SAFE_INTEGER) return valor;

  // Solo se absorben diferencias del orden del error de representación
  // binario; no se redondea un valor con precisión legítima.
  const decimal = Number(valor.toPrecision(15));
  const tolerancia = Number.EPSILON * Math.max(1, Math.abs(valor)) * 4;
  return Math.abs(decimal - valor) <= tolerancia ? decimal : valor;
}

/**
 * Dimensiones físicas que no admiten valores negativos en las especificaciones
 * técnicas del catálogo (almacenamiento, batería, peso, dimensiones, etc.).
 */
const DIMENSIONES_NO_NEGATIVAS: ReadonlySet<DimensionUnidad> =
  new Set<DimensionUnidad>([
    "almacenamiento",
    "longitud",
    "frecuencia",
    "carga_electrica",
    "energia",
    "masa",
    "potencia",
    "tiempo",
    "resolucion",
    "puntuacion",
    "porcentaje",
    "brillo",
  ]);

export function admiteValoresNegativos(dimension: DimensionUnidad): boolean {
  return !DIMENSIONES_NO_NEGATIVAS.has(dimension);
}

export type MotivoConversion =
  | "unidad_desconocida"
  | "unidad_ambigua"
  | "dimensiones_incompatibles"
  | "valor_invalido";

export type ResultadoConversionUnidad =
  | {
      ok: true;
      valor: number;
      valorOriginal: number;
      unidadOrigen: UnidadCanonica;
      unidadDestino: UnidadCanonica;
      dimension: DimensionUnidad;
      textoOriginal: string;
    }
  | {
      ok: false;
      motivo: MotivoConversion;
      mensaje: string;
      textoOriginal: string;
    };

function falloConversion(
  motivo: MotivoConversion,
  mensaje: string,
  textoOriginal: string,
): ResultadoConversionUnidad {
  return { ok: false, motivo, mensaje, textoOriginal };
}

/**
 * Convierte entre unidades de la misma dimensión. No convierte `mAh` a `Wh`
 * porque la carga eléctrica y la energía son dimensiones distintas.
 */
export function convertirUnidad(
  valor: number,
  origen: unknown,
  destino: unknown,
): ResultadoConversionUnidad {
  const textoOriginal = `${textoDe(valor)} ${textoDe(origen)} -> ${textoDe(destino)}`;

  if (typeof valor !== "number" || !Number.isFinite(valor)) {
    return falloConversion(
      "valor_invalido",
      "El valor a convertir debe ser un número finito.",
      textoOriginal,
    );
  }

  const unidadOrigen = normalizarUnidad(origen);
  if (unidadOrigen.estado !== "reconocida") {
    return falloConversion(
      unidadOrigen.estado === "ambigua" ? "unidad_ambigua" : "unidad_desconocida",
      unidadOrigen.motivo,
      textoOriginal,
    );
  }

  const unidadDestino = normalizarUnidad(destino);
  if (unidadDestino.estado !== "reconocida") {
    return falloConversion(
      unidadDestino.estado === "ambigua" ? "unidad_ambigua" : "unidad_desconocida",
      unidadDestino.motivo,
      textoOriginal,
    );
  }

  if (unidadOrigen.definicion.dimension !== unidadDestino.definicion.dimension) {
    return falloConversion(
      "dimensiones_incompatibles",
      `No se puede convertir ${unidadOrigen.definicion.dimension} a ${unidadDestino.definicion.dimension}.`,
      textoOriginal,
    );
  }

  if (!admiteValoresNegativos(unidadOrigen.definicion.dimension) && valor < 0) {
    return falloConversion(
      "valor_invalido",
      `La magnitud "${unidadOrigen.definicion.dimension}" no admite valores negativos.`,
      textoOriginal,
    );
  }

  const enBase = valor * unidadOrigen.definicion.factorBase;
  const convertido = enBase / unidadDestino.definicion.factorBase;

  if (!Number.isFinite(convertido)) {
    return falloConversion(
      "valor_invalido",
      "El resultado de la conversión no es un número finito.",
      textoOriginal,
    );
  }

  return {
    ok: true,
    valor: ajustarArtefactoDePuntoFlotante(convertido),
    valorOriginal: valor,
    unidadOrigen: unidadOrigen.definicion.unidad,
    unidadDestino: unidadDestino.definicion.unidad,
    dimension: unidadOrigen.definicion.dimension,
    textoOriginal,
  };
}

/**
 * La carga eléctrica solo puede expresarse como energía si se conoce el
 * voltaje. Sin voltaje se devuelve `null` en lugar de asumir un valor.
 */
export function convertirCargaAEnergiaWh(
  valorMah: number,
  voltaje: number | null | undefined,
): number | null {
  if (
    typeof valorMah !== "number" ||
    !Number.isFinite(valorMah) ||
    valorMah < 0 ||
    typeof voltaje !== "number" ||
    !Number.isFinite(voltaje) ||
    voltaje <= 0
  ) {
    return null;
  }
  const energia = (valorMah * voltaje) / 1_000;
  if (!Number.isFinite(energia)) return null;
  return ajustarArtefactoDePuntoFlotante(energia);
}

export interface DatoConUnidad {
  valor: number;
  unidad: UnidadCanonica;
  dimension: DimensionUnidad;
  sistema: SistemaUnidades;
  /** Texto original exacto del dato, sin normalizar. */
  textoOriginal: string;
}

export type MotivoDatoConUnidad =
  | "texto_vacio"
  | "formato_invalido"
  | "unidad_ambigua"
  | "unidad_desconocida";

export type ResultadoDatoConUnidad =
  | { ok: true; dato: DatoConUnidad }
  | {
      ok: false;
      motivo: MotivoDatoConUnidad;
      mensaje: string;
      textoOriginal: string;
    };

/**
 * Un valor como `1.000` o `1,000` es ambiguo entre mil unidades con separador
 * de miles (notación estándar en varios países) o una unidad con tres ceros
 * decimales redundantes. Mientras no exista configuración de locale explícita,
 * se rechaza para evitar interpretar 1000 GB como 1 GB o viceversa.
 *
 * En cambio, valores decimales legítimos con tres cifras significativas como
 * `1.234 kg`, `2.500 GHz`, `3.750 Wh` o `6.875 mm` no son ambiguos y se
 * interpretan como valores decimales válidos.
 */
function esSeparadorDeMilesAmbiguo(valor: string): boolean {
  const coincidencia = /^[+-]?(\d+)[.,](000)$/.exec(valor);
  if (!coincidencia) return false;
  return coincidencia[1] !== "0";
}

/**
 * Extrae un valor numérico y su unidad de un texto como `"6.8 in"`.
 * Conserva el texto original y no adivina unidades ambiguas.
 */
export function parsearDatoConUnidad(
  texto: unknown,
): ResultadoDatoConUnidad {
  const textoOriginal = textoDe(texto);
  const limpio = textoOriginal.trim();

  if (!limpio) {
    return {
      ok: false,
      motivo: "texto_vacio",
      mensaje: "El dato está vacío.",
      textoOriginal,
    };
  }

  const coincidencia = limpio.match(
    /^([+-]?\d+(?:[.,]\d+)?)\s*([^\d\s].*)$/,
  );
  if (!coincidencia) {
    return {
      ok: false,
      motivo: "formato_invalido",
      mensaje: "El dato no tiene el formato '<valor> <unidad>'.",
      textoOriginal,
    };
  }

  const valorCrudo = coincidencia[1];
  if (esSeparadorDeMilesAmbiguo(valorCrudo)) {
    return {
      ok: false,
      motivo: "formato_invalido",
      mensaje:
        "El separador numérico es ambiguo; use un formato sin separadores de miles.",
      textoOriginal,
    };
  }

  const valor = Number(valorCrudo.replace(",", "."));
  if (!Number.isFinite(valor)) {
    return {
      ok: false,
      motivo: "formato_invalido",
      mensaje: "El valor numérico no es finito.",
      textoOriginal,
    };
  }

  const unidad = normalizarUnidad(coincidencia[2]);
  if (unidad.estado !== "reconocida") {
    return {
      ok: false,
      motivo:
        unidad.estado === "ambigua" ? "unidad_ambigua" : "unidad_desconocida",
      mensaje: unidad.motivo,
      textoOriginal,
    };
  }

  if (!admiteValoresNegativos(unidad.definicion.dimension) && valor < 0) {
    return {
      ok: false,
      motivo: "formato_invalido",
      mensaje: `La magnitud "${unidad.definicion.dimension}" no admite valores negativos.`,
      textoOriginal,
    };
  }

  return {
    ok: true,
    dato: {
      valor,
      unidad: unidad.definicion.unidad,
      dimension: unidad.definicion.dimension,
      sistema: unidad.definicion.sistema,
      textoOriginal,
    },
  };
}

/**
 * Indica si dos unidades pueden compararse automáticamente.
 *
 * - Ambas deben ser reconocidas (ni ambiguas ni desconocidas).
 * - Deben pertenecer a la misma dimensión.
 * - Para almacenamiento, el sistema debe coincidir: `GB` y `GiB` no se
 *   comparan automáticamente.
 */
export function sonUnidadesComparables(
  origen: unknown,
  destino: unknown,
): boolean {
  const a = normalizarUnidad(origen);
  const b = normalizarUnidad(destino);
  if (a.estado !== "reconocida" || b.estado !== "reconocida") return false;
  if (a.definicion.dimension !== b.definicion.dimension) return false;
  if (
    a.definicion.dimension === "almacenamiento" &&
    a.definicion.sistema !== b.definicion.sistema
  ) {
    return false;
  }
  return true;
}
