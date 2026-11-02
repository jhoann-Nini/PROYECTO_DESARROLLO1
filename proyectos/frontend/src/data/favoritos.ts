export const CLAVE_FAVORITOS = "tecreview:favoritos";
export const MAX_FAVORITOS = 100;
export const EVENTO_FAVORITOS = "tecreview:favoritos:cambio";

export interface DetalleEventoFavoritos {
  ids: number[];
}

/**
 * Notifica a las demás instancias de `useFavoritos` de la misma pestaña.
 * El evento `storage` solo se dispara en otras pestañas, por eso hace falta
 * este canal propio para que las tarjetas y la página se mantengan alineadas.
 */
export function emitirCambioFavoritos(ids: number[]): void {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<DetalleEventoFavoritos>(EVENTO_FAVORITOS, {
      detail: { ids: [...ids] },
    }),
  );
}

export interface ResultadoAlternarFavorito {
  ids: number[];
  agregado: boolean;
  motivo: "agregado" | "quitado" | "lleno" | "invalido";
}

/**
 * Normaliza una lista persistida de favoritos: solo enteros positivos, sin
 * duplicados y con un límite defensivo para no guardar listas infinitas.
 */
export function normalizarIdsFavoritos(valor: unknown): number[] {
  if (!Array.isArray(valor)) return [];

  const vistos = new Set<number>();
  const ids: number[] = [];

  for (const item of valor) {
    const id =
      typeof item === "number"
        ? item
        : typeof item === "string" && item.trim().length > 0
          ? Number(item)
          : Number.NaN;

    if (!Number.isInteger(id) || id <= 0 || vistos.has(id)) continue;

    vistos.add(id);
    ids.push(id);

    if (ids.length === MAX_FAVORITOS) break;
  }

  return ids;
}

export function leerIdsFavoritos(
  storage: Pick<Storage, "getItem"> | null,
): number[] {
  if (!storage) return [];

  try {
    const crudo = storage.getItem(CLAVE_FAVORITOS);
    if (!crudo) return [];
    return normalizarIdsFavoritos(JSON.parse(crudo));
  } catch {
    return [];
  }
}

export function guardarIdsFavoritos(
  storage: Pick<Storage, "setItem" | "removeItem"> | null,
  ids: number[],
): void {
  if (!storage) return;

  try {
    if (ids.length === 0) {
      storage.removeItem(CLAVE_FAVORITOS);
      return;
    }
    storage.setItem(CLAVE_FAVORITOS, JSON.stringify(ids));
  } catch {
    // El almacenamiento puede estar lleno o bloqueado; la UI sigue funcionando.
  }
}

export function alternarIdFavorito(
  ids: readonly number[],
  id: number,
): ResultadoAlternarFavorito {
  if (!Number.isInteger(id) || id <= 0) {
    return { ids: [...ids], agregado: false, motivo: "invalido" };
  }

  if (ids.includes(id)) {
    return {
      ids: ids.filter((actual) => actual !== id),
      agregado: false,
      motivo: "quitado",
    };
  }

  if (ids.length >= MAX_FAVORITOS) {
    return { ids: [...ids], agregado: false, motivo: "lleno" };
  }

  return { ids: [...ids, id], agregado: true, motivo: "agregado" };
}

export function quitarIdFavorito(
  ids: readonly number[],
  id: number,
): number[] {
  return ids.filter((actual) => actual !== id);
}
