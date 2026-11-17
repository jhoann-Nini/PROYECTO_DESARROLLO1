export const CLAVE_FAVORITOS = "tecreview:favoritos";
export const PREFIJO_CLAVE_FAVORITOS = "tecreview:favoritos:";
export const MAX_FAVORITOS = 100;
export const EVENTO_FAVORITOS = "tecreview:favoritos:cambio";

export interface DetalleEventoFavoritos {
  ids: number[];
  clave?: string;
}

/**
 * Clave de almacenamiento propia de cada cuenta. Evita mezclar favoritos entre
 * usuarios del mismo navegador y deja la clave histórica solo para migración.
 */
export function claveFavoritos(idSesion: string): string {
  return `${PREFIJO_CLAVE_FAVORITOS}${idSesion}`;
}

/**
 * Elimina la lista anónima que usaba la versión anterior. Los favoritos solo
 * pueden existir mientras haya una sesión activa.
 */
export function eliminarFavoritosLegados(
  storage: Pick<Storage, "removeItem"> | null,
): void {
  if (!storage) return;

  try {
    storage.removeItem(CLAVE_FAVORITOS);
  } catch {
    // El almacenamiento puede estar bloqueado; no se rompe la interfaz.
  }
}

/**
 * Notifica a las demás instancias de `useFavoritos` de la misma pestaña.
 * El evento `storage` solo se dispara en otras pestañas, por eso hace falta
 * este canal propio para que las tarjetas y la página se mantengan alineadas.
 */
export function emitirCambioFavoritos(ids: number[], clave?: string): void {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<DetalleEventoFavoritos>(EVENTO_FAVORITOS, {
      detail: { ids: [...ids], clave },
    }),
  );
}

export interface ResultadoAlternarFavorito {
  ids: number[];
  agregado: boolean;
  motivo: "agregado" | "quitado" | "lleno" | "invalido" | "sin-sesion";
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

/**
 * Lee la lista de una cuenta. La clave es obligatoria para que ningún llamador
 * pueda leer por accidente la clave anónima histórica.
 */
export function leerIdsFavoritos(
  storage: Pick<Storage, "getItem"> | null,
  clave: string,
): number[] {
  if (!storage) return [];

  try {
    const crudo = storage.getItem(clave);
    if (!crudo) return [];
    return normalizarIdsFavoritos(JSON.parse(crudo));
  } catch {
    return [];
  }
}

/**
 * Guarda la lista de una cuenta. La clave es obligatoria para impedir
 * escrituras accidentales en la clave anónima histórica.
 */
export function guardarIdsFavoritos(
  storage: Pick<Storage, "setItem" | "removeItem"> | null,
  ids: number[],
  clave: string,
): void {
  if (!storage) return;

  try {
    if (ids.length === 0) {
      storage.removeItem(clave);
      return;
    }
    storage.setItem(clave, JSON.stringify(ids));
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
