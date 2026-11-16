import { describe, expect, it } from "vitest";
import {
  CATALOGO_CANONICO_PILOTO,
  obtenerCatalogoCanonicoPiloto,
  obtenerProductoCanonico,
  validarCatalogoCanonicoPiloto,
} from "./catalogoCanonico";

describe("catálogo canónico piloto", () => {
  it("define exactamente ocho productos y cubre las cuatro categorías", () => {
    expect(CATALOGO_CANONICO_PILOTO).toHaveLength(8);
    expect(new Set(CATALOGO_CANONICO_PILOTO.map((item) => item.id)).size).toBe(8);
    expect(new Set(CATALOGO_CANONICO_PILOTO.map((item) => item.categoria))).toEqual(
      new Set(["moviles", "tablets", "laptops", "auriculares"]),
    );
  });

  it("consolida las referencias repetidas de Galaxy S24 Ultra y OnePlus Pad 2", () => {
    const samsung = obtenerProductoCanonico("samsung-galaxy-s24-ultra");
    const onePlus = obtenerProductoCanonico("oneplus-pad-2");

    expect(samsung?.referencias.map((item) => `${item.coleccion}:${item.idRegistro}`)).toEqual([
      "deseados:202",
      "ofertas:300",
    ]);
    expect(samsung?.variantes.map((item) => item.id)).toEqual(["512gb"]);

    expect(onePlus?.referencias.map((item) => `${item.coleccion}:${item.idRegistro}`)).toEqual([
      "vendidos:108",
      "ofertas:303",
      "mock:5",
    ]);
    expect(onePlus?.registros).toHaveLength(3);
  });

  it("no fusiona Nothing Phone (2a) Plus con Special Edition", () => {
    const nothing = obtenerProductoCanonico("nothing-phone-2a-special-edition");
    expect(nothing?.nombre).toBe("Nothing Phone (2a) Special Edition");
    expect(nothing?.referencias).toEqual([
      expect.objectContaining({ coleccion: "mock", idRegistro: 1 }),
    ]);
    expect(CATALOGO_CANONICO_PILOTO.some((item) => item.id === "nothing-phone-2a-plus")).toBe(false);
  });

  it("conserva los IDs originales y resuelve registros de todas las fuentes", () => {
    const catalogo = obtenerCatalogoCanonicoPiloto();
    const referencias = catalogo.flatMap((item) => item.referencias);

    expect(catalogo.every((item) => item.registros.length === item.referencias.length)).toBe(true);
    expect(referencias).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ coleccion: "mock", idRegistro: 1 }),
        expect.objectContaining({ coleccion: "deseados", idRegistro: 202 }),
        expect.objectContaining({ coleccion: "ofertas", idRegistro: 300 }),
        expect.objectContaining({ coleccion: "vendidos", idRegistro: 109 }),
      ]),
    );
  });

  it("marca las imágenes externas actuales como pendientes y no inventa licencia o atribución", () => {
    const catalogo = obtenerCatalogoCanonicoPiloto();

    for (const producto of catalogo) {
      expect(producto.imagen.url).toMatch(/^https:\/\//);
      expect(producto.imagen.estadoVerificacion).toBe("pendiente");
      expect(producto.imagen.licencia).toBeNull();
      expect(producto.imagen.atribucion).toBeNull();
    }
  });

  it("valida todas las referencias y variantes del piloto", () => {
    expect(validarCatalogoCanonicoPiloto()).toEqual([]);
  });

  it("devuelve null para un ID canónico desconocido", () => {
    expect(obtenerProductoCanonico("producto-inexistente")).toBeNull();
  });
});
