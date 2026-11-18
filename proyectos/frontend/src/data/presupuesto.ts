/**
 * Un presupuesto de URL es un entero positivo en COP. No se infiere moneda ni
 * se convierten importes. MAX_SAFE_INTEGER está reservado para «sin límite».
 */
export function normalizarPresupuestoCOP(valor: unknown): number | null {
  if (typeof valor !== "number" && typeof valor !== "string") return null;
  if (typeof valor === "string" && !/^\d+$/.test(valor)) return null;
  const numero = Number(valor);
  return Number.isSafeInteger(numero) && numero > 0 && numero < Number.MAX_SAFE_INTEGER
    ? numero
    : null;
}

export function rutaCatalogoPresupuesto(valor: number): string {
  const presupuesto = normalizarPresupuestoCOP(valor);
  return presupuesto === null
    ? "/productos"
    : `/productos?precioMax=${presupuesto}`;
}
