/**
 * Identificadores globales de producto.
 *
 * El backend usa IDs numéricos y los mocks usan claves propias. Ambos espacios
 * pueden solaparse (por ejemplo, `api:1` y `mock:1`), por eso nunca se tratan
 * como equivalentes.
 *
 * Gramática de claves mock:
 * - entre 1 y 128 caracteres;
 * - empieza por letra o dígito ASCII;
 * - solo admite letras ASCII, dígitos, punto, guion y guion bajo;
 * - no admite separadores consecutivos ni separador final;
 * - es sensible a mayúsculas.
 */

declare const marcaIdProductoApi: unique symbol;
declare const marcaIdProductoMock: unique symbol;

export type OrigenProducto = "api" | "mock";

/**
 * Tipos branded: solo las fábricas y el parser pueden producir estos valores.
 * El tipo no sustituye la validación runtime, pero impide que una cadena
 * arbitraria se use accidentalmente como ID validado.
 */
export type IdProductoApi = string & {
  readonly [marcaIdProductoApi]: true;
};
export type IdProductoMock = string & {
  readonly [marcaIdProductoMock]: true;
};
export type IdProductoGlobal = IdProductoApi | IdProductoMock;

/**
 * Unión discriminada: cada origen solo puede llevar los campos que le
 * corresponden. No es posible representar `origen: "api"` con `claveMock`.
 */
export type IdGlobalParseado =
  | {
      id: IdProductoApi;
      origen: "api";
      idApi: number;
      claveMock: null;
    }
  | {
      id: IdProductoMock;
      origen: "mock";
      idApi: null;
      claveMock: string;
    };

const PATRON_ID_API = /^api:([1-9]\d*)$/;

function esEnteroPositivoSeguro(valor: number): boolean {
  return Number.isSafeInteger(valor) && valor > 0;
}

function esClaveMockValida(clave: string): boolean {
  if (clave.length === 0 || clave.length > 128) return false;
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(clave)) return false;
  if (/[._-]{2}/.test(clave)) return false;
  if (/[._-]$/.test(clave)) return false;
  return true;
}

/**
 * Construye `api:<id>` para IDs positivos y seguros.
 * Devuelve `null` para valores inválidos.
 */
export function idGlobalApi(id: number): IdProductoApi | null {
  if (typeof id !== "number" || !esEnteroPositivoSeguro(id)) return null;
  return `api:${id}` as IdProductoApi;
}

/**
 * Construye `mock:<clave>` para claves válidas según la gramática documentada.
 * Devuelve `null` si la clave está vacía o es malformada.
 */
export function idGlobalMock(clave: string): IdProductoMock | null {
  if (typeof clave !== "string" || !esClaveMockValida(clave)) return null;
  return `mock:${clave}` as IdProductoMock;
}

/**
 * Valida y descompone un identificador global.
 * No acepta números sueltos ni cadenas numéricas.
 */
export function parsearIdGlobal(valor: unknown): IdGlobalParseado | null {
  if (typeof valor !== "string") return null;

  const coincidenciaApi = PATRON_ID_API.exec(valor);
  if (coincidenciaApi) {
    const idApi = Number(coincidenciaApi[1]);
    if (!esEnteroPositivoSeguro(idApi)) return null;
    // Rechaza formas no canónicas como `api:01` que ya no coincidirían aquí.
    const canonico = `api:${idApi}`;
    if (canonico !== valor) return null;
    return {
      id: canonico as IdProductoApi,
      origen: "api",
      idApi,
      claveMock: null,
    };
  }

  if (!valor.startsWith("mock:")) return null;
  const claveMock = valor.slice("mock:".length);
  if (!esClaveMockValida(claveMock)) return null;

  return {
    id: valor as IdProductoMock,
    origen: "mock",
    idApi: null,
    claveMock,
  };
}

/**
 * Indica si un valor es un identificador global válido (`api:*` o `mock:*`).
 */
export function esIdGlobal(valor: unknown): valor is IdProductoGlobal {
  return parsearIdGlobal(valor) !== null;
}

export function esIdApi(valor: unknown): valor is IdProductoApi {
  return parsearIdGlobal(valor)?.origen === "api";
}

export function esIdMock(valor: unknown): valor is IdProductoMock {
  return parsearIdGlobal(valor)?.origen === "mock";
}

/**
 * Devuelve el ID numérico de un identificador `api:*`.
 * Para `mock:*`, valores inválidos o números sueltos devuelve `null`.
 */
export function idProductoApiDe(valor: unknown): number | null {
  const parseado = parsearIdGlobal(valor);
  return parseado?.origen === "api" ? parseado.idApi : null;
}

/**
 * Devuelve la clave textual de un identificador `mock:*`.
 * Para `api:*`, valores inválidos o cadenas sueltas devuelve `null`.
 */
export function claveMockDe(valor: unknown): string | null {
  const parseado = parsearIdGlobal(valor);
  return parseado?.origen === "mock" ? parseado.claveMock : null;
}
