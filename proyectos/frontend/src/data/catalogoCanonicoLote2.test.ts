import { describe, expect, it } from "vitest";
import {
  CATALOGO_CANONICO_ADICIONAL,
  obtenerCatalogoCanonicoCompleto,
  obtenerProductoCanonico,
  validarCatalogoCanonicoCompleto,
} from "./catalogoCanonico";

describe("catálogo canónico — lote 2", () => {
  it("incorpora seis modelos sin alterar las ocho identidades piloto", () => {
    expect(CATALOGO_CANONICO_ADICIONAL).toHaveLength(6);
    expect(obtenerCatalogoCanonicoCompleto()).toHaveLength(14);
  });

  it("conserva IDs originales y variantes comerciales verificadas por fabricante", () => {
    expect(obtenerProductoCanonico("redmi-note-14-pro-plus-5g")?.referencias[0]).toMatchObject({
      coleccion: "vendidos",
      idRegistro: 107,
      varianteId: "8gb-256gb",
    });
    expect(obtenerProductoCanonico("apple-iphone-15-pro-max")?.referencias[0]).toMatchObject({
      coleccion: "deseados",
      idRegistro: 201,
      varianteId: "256gb",
    });
    expect(obtenerProductoCanonico("samsung-galaxy-s25-ultra")?.variantes[0]).toMatchObject({
      ram: "12 GB",
      almacenamiento: "1 TB",
      mercado: "Colombia",
    });
    expect(obtenerProductoCanonico("oneplus-13")?.nombre).toBe("OnePlus 13");
    expect(obtenerProductoCanonico("xiaomi-14t-pro")?.variantes[0]).toMatchObject({
      ram: "12 GB LPDDR5X",
      almacenamiento: "512 GB UFS 4.0",
    });
    expect(obtenerProductoCanonico("nothing-ear-a-black")?.variantes[0]).toMatchObject({
      color: "Black",
    });
  });

  it("verifica imagen y licencia para los seis modelos del lote", () => {
    const ids = [
      "redmi-note-14-pro-plus-5g",
      "apple-iphone-15-pro-max",
      "samsung-galaxy-s25-ultra",
      "oneplus-13",
      "xiaomi-14t-pro",
      "nothing-ear-a-black",
    ];
    for (const id of ids) {
      const producto = obtenerProductoCanonico(id);
      expect(producto?.imagen.url).toMatch(/^https:\/\//);
      expect(producto?.imagen.estadoVerificacion).toBe("verificada");
      expect(["CC BY-SA 4.0", "CC BY 4.0"]).toContain(producto?.imagen.licencia);
      expect(producto?.imagen.paginaOrigen).toContain("commons.wikimedia.org/wiki/File:");
      expect(producto?.imagen.autor).not.toBeNull();
      expect(producto?.imagen.atribucion).not.toBeNull();
    }
  });

  it("mantiene integridad referencial del piloto y del lote 2", () => {
    expect(validarCatalogoCanonicoCompleto()).toEqual([]);
  });
});
