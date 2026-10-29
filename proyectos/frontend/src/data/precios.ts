/**
 * Regla temporal de normalización de precios.
 *
 * Los datos reales de la API ya vienen en COP. Los mocks legados conservan
 * precios en dólares y se convierten con una tasa fija para no romper la
 * compatibilidad. Cuando todos los datos estén normalizados, esta regla se
 * puede retirar sin tocar los consumidores.
 */
export const TASA_CAMBIO_LEGADO = 4000;
export const UMBRAL_PRECIO_COP = 10000;

export function normalizarPrecioCOP(
  valor: number | null | undefined
): number {
  if (
    valor === null ||
    valor === undefined ||
    !Number.isFinite(valor) ||
    valor <= 0
  ) {
    return 0;
  }

  return valor < UMBRAL_PRECIO_COP
    ? Math.round(valor * TASA_CAMBIO_LEGADO)
    : Math.round(valor);
}
