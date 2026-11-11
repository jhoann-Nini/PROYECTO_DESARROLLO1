import { describe, expect, it } from "vitest";
import { sanearPrecioCOP } from "./precios";
import { formatearCOP } from "./specsHelper";

describe("sanearPrecioCOP", () => {
  it("no convierte moneda: la unidad del proyecto es COP", () => {
    // Guardrail de H-03: un precio legítimamente bajo no se multiplica.
    expect(sanearPrecioCOP(8_000)).toBe(8_000);
    expect(sanearPrecioCOP(316_000)).toBe(316_000);
  });

  it("conserva los precios en COP y los redondea", () => {
    expect(sanearPrecioCOP(289_900)).toBe(289_900);
    expect(sanearPrecioCOP(5_374_999)).toBe(5_374_999);
    expect(sanearPrecioCOP(1_749_000.4)).toBe(1_749_000);
  });

  it("devuelve 0 para valores ausentes o inválidos", () => {
    expect(sanearPrecioCOP(null)).toBe(0);
    expect(sanearPrecioCOP(undefined)).toBe(0);
    expect(sanearPrecioCOP(Number.NaN)).toBe(0);
    expect(sanearPrecioCOP(-10)).toBe(0);
    expect(sanearPrecioCOP(0)).toBe(0);
  });

  it("formatea en COP sin alterar el monto", () => {
    expect(formatearCOP(437.25)).toContain("437");
    expect(formatearCOP(1_749_000)).toContain("1.749.000");
    expect(formatearCOP(1_749_000)).toContain("COP");
    expect(formatearCOP(null)).toBe("Consultar disponibilidad");
  });
});
