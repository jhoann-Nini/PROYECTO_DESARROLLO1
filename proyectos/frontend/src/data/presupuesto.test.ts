import { describe, expect, it } from "vitest";
import { normalizarPresupuestoCOP, rutaCatalogoPresupuesto } from "./presupuesto";

describe("normalizarPresupuestoCOP", () => {
  it.each([
    ["4000000", 4_000_000],
    ["300000", 300_000],
    ["1", 1],
    [6000000, 6_000_000],
  ])("lee %s como un entero COP sin conversiones", (entrada, esperado) => {
    expect(normalizarPresupuestoCOP(entrada)).toBe(esperado);
  });

  it.each([
    undefined, null, "", "0", "-1", "1.5", "Infinity", "NaN", "1e6",
    "0x10", "1.000.000", " 1000000 ", "1000000 COP", true, ["1000000"],
    Number.NaN, Infinity, -1, 1.5, 0, Number.MAX_SAFE_INTEGER,
    "9007199254740992",
  ])("descarta un límite inválido: %s", (entrada) => {
    expect(normalizarPresupuestoCOP(entrada)).toBeNull();
  });
});

describe("rutaCatalogoPresupuesto", () => {
  it("abre el catálogo general con solo el máximo COP", () => {
    expect(rutaCatalogoPresupuesto(4_000_000)).toBe("/productos?precioMax=4000000");
    expect(rutaCatalogoPresupuesto(300_000)).toBe("/productos?precioMax=300000");
  });

  it("no genera un filtro malformado con un número inválido", () => {
    expect(rutaCatalogoPresupuesto(Number.NaN)).toBe("/productos");
  });
});
