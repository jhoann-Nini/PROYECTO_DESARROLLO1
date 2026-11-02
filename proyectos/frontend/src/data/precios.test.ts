import { describe, expect, it } from "vitest";
import { normalizarPrecioCOP, TASA_CAMBIO_LEGADO } from "./precios";
import { formatearCOP } from "./specsHelper";

describe("normalizarPrecioCOP", () => {
  it("convierte precios legados en dólares a COP", () => {
    expect(TASA_CAMBIO_LEGADO).toBe(4000);
    expect(normalizarPrecioCOP(437.25)).toBe(1_749_000);
  });

  it("conserva los precios que ya están en COP", () => {
    expect(normalizarPrecioCOP(289_900)).toBe(289_900);
    expect(normalizarPrecioCOP(5_374_999)).toBe(5_374_999);
  });

  it("devuelve 0 para valores ausentes o inválidos", () => {
    expect(normalizarPrecioCOP(null)).toBe(0);
    expect(normalizarPrecioCOP(undefined)).toBe(0);
    expect(normalizarPrecioCOP(Number.NaN)).toBe(0);
    expect(normalizarPrecioCOP(-10)).toBe(0);
  });

  it("formatea en COP usando la misma normalización", () => {
    expect(formatearCOP(437.25)).toContain("1.749.000");
    expect(formatearCOP(437.25)).toContain("COP");
    expect(formatearCOP(null)).toBe("Consultar disponibilidad");
  });
});
