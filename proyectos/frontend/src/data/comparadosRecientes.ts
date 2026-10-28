export const CLAVE_COMPARADOS_RECIENTES = "tecreview:comparados-recientes";
export const MAX_COMPARADOS_RECIENTES = 5;

/**
 * Normaliza un historial persistido: solo enteros positivos, sin duplicados
 * y con el máximo de productos recordados.
 */
export function normalizarComparadosRecientes(valor: unknown): number[] {
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

    if (ids.length === MAX_COMPARADOS_RECIENTES) break;
  }

  return ids;
}

/**
 * Coloca el id como el más reciente. Si ya estaba, se mueve al inicio.
 */
export function registrarComparado(ids: number[], id: number): number[] {
  const actuales = normalizarComparadosRecientes(ids);

  if (!Number.isInteger(id) || id <= 0) return actuales;

  return [
    id,
    ...actuales.filter((actual) => actual !== id),
  ].slice(0, MAX_COMPARADOS_RECIENTES);
}

export function leerComparadosRecientes(
  storage: Pick<Storage, "getItem"> | null,
): number[] {
  if (!storage) return [];

  try {
    const crudo = storage.getItem(CLAVE_COMPARADOS_RECIENTES);
    if (!crudo) return [];
    return normalizarComparadosRecientes(JSON.parse(crudo));
  } catch {
    return [];
  }
}

export function guardarComparadosRecientes(
  storage: Pick<Storage, "setItem"> | null,
  ids: number[],
): void {
  if (!storage) return;

  try {
    storage.setItem(
      CLAVE_COMPARADOS_RECIENTES,
      JSON.stringify(normalizarComparadosRecientes(ids)),
    );
  } catch {
    // Si el almacenamiento no está disponible, el historial sigue en memoria.
  }
}
