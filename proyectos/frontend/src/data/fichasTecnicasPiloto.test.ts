import { describe, expect, it } from "vitest";
import { esFichaTecnicaV2Valida } from "./normalizadorFicha";
import { FICHAS_TECNICAS_PILOTO, obtenerFichaTecnicaPiloto } from "./fichasTecnicasPiloto";
import { obtenerCatalogoCanonicoPiloto } from "./catalogoCanonico";

describe("fichas técnicas del catálogo piloto", () => {
  it("define una ficha v2 válida para cada uno de los ocho modelos canónicos", () => {
    const catalogo = obtenerCatalogoCanonicoPiloto();
    expect(Object.keys(FICHAS_TECNICAS_PILOTO)).toHaveLength(8);
    expect(catalogo).toHaveLength(8);

    for (const producto of catalogo) {
      expect(esFichaTecnicaV2Valida(producto.fichaTecnica)).toBe(true);
      expect(producto.fichaTecnica.categoria).toBe(producto.categoria);
      expect(producto.fichaTecnica.fuentes.length).toBeGreaterThan(0);
      expect(producto.fichaTecnica.atributos.length).toBeGreaterThan(0);
    }
  });

  it("vincula cada atributo a una fuente existente", () => {
    for (const [id, ficha] of Object.entries(FICHAS_TECNICAS_PILOTO)) {
      const idsFuente = new Set(ficha.fuentes.map((fuente) => fuente.id));
      for (const atributo of ficha.atributos) {
        expect(
          atributo.fuenteId && idsFuente.has(atributo.fuenteId),
          `Atributo ${atributo.clave} sin fuente válida en ${id}`,
        ).toBe(true);
      }
    }
  });

  it("mantiene las dos variantes del Galaxy S24 Ultra separadas", () => {
    const ficha = obtenerFichaTecnicaPiloto("samsung-galaxy-s24-ultra");
    expect(ficha?.variantes.map((variante) => variante.id)).toEqual(["256gb", "512gb"]);
    expect(ficha?.variantes.every((variante) => variante.ram === "12 GB")).toBe(true);
  });

  it("usa iPad Pro M4 de 1 TB/16 GB y no la variante heredada incorrecta", () => {
    const ficha = obtenerFichaTecnicaPiloto("apple-ipad-pro-11-m4");
    expect(ficha?.variantes).toEqual([
      expect.objectContaining({
        id: "16gb-1tb",
        ram: "16 GB de memoria unificada",
        almacenamiento: "1 TB",
      }),
    ]);
  });

  it("usa MacBook Pro M3 Max 16 CPU/40 GPU con 48 GB y 1 TB", () => {
    const ficha = obtenerFichaTecnicaPiloto("apple-macbook-pro-16-m3-max");
    expect(ficha?.variantes).toEqual([
      expect.objectContaining({
        id: "48gb-1tb",
        ram: "48 GB de memoria unificada",
        almacenamiento: "1 TB SSD",
      }),
    ]);
    expect(
      ficha?.atributos.some((atributo) =>
        atributo.valor.toString().includes("16 núcleos") &&
        atributo.valor.toString().includes("40 núcleos")
      ),
    ).toBe(true);
  });

  it("no convierte benchmarks ni métricas mock en resultados verificados", () => {
    for (const ficha of Object.values(FICHAS_TECNICAS_PILOTO)) {
      expect(ficha.benchmarks).toEqual([]);
      expect(ficha.metricasComparables).toEqual([]);
      expect(ficha.estado_verificacion).toBe("parcial");
    }
  });

  it("conserva el SKU exacto del ThinkPad E14 Gen 5", () => {
    const ficha = obtenerFichaTecnicaPiloto("lenovo-thinkpad-e14-gen-5");
    expect(ficha?.variantes[0]).toEqual(
      expect.objectContaining({
        sku: "21JK0005RI",
        ram: "16 GB DDR4",
        almacenamiento: "512 GB SSD",
      }),
    );
    expect(
      ficha?.atributos.find((atributo) => atributo.clave === "procesador")?.valor,
    ).toContain("i5-1335U");
  });

  it("devuelve null para un producto fuera del piloto", () => {
    expect(obtenerFichaTecnicaPiloto("modelo-no-incluido")).toBeNull();
  });
});
