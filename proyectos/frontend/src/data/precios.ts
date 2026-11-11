/**
 * Saneamiento de precios.
 *
 * Contrato del proyecto: todos los precios que maneja la aplicación —API,
 * base de datos y datos locales— están expresados en COP. Esta función NO
 * convierte moneda: solo descarta valores ausentes o inválidos y redondea.
 *
 * Si en el futuro el catálogo admite varias monedas, la unidad debe viajar
 * como un campo explícito (`moneda`) y no inferirse por la magnitud del valor.
 */
export function sanearPrecioCOP(valor: number | null | undefined): number {
  if (
    valor === null ||
    valor === undefined ||
    !Number.isFinite(valor) ||
    valor <= 0
  ) {
    return 0;
  }

  return Math.round(valor);
}
