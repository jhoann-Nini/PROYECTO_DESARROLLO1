import { describe, expect, it } from "vitest";
import {
  CATALOGO_CANONICO_PILOTO,
  obtenerCatalogoCanonicoPiloto,
  obtenerProductoCanonico,
  validarCatalogoCanonicoPiloto,
} from "./catalogoCanonico";

describe("catálogo canónico piloto", () => {
  it("define exactamente diecisiete productos y cubre las cuatro categorías", () => {
    expect(CATALOGO_CANONICO_PILOTO).toHaveLength(18);
    expect(new Set(CATALOGO_CANONICO_PILOTO.map((item) => item.id)).size).toBe(18);
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
    expect(samsung?.referencias.map((item) => item.varianteId)).toEqual([
      "256gb",
      "512gb",
    ]);
    expect(samsung?.variantes.map((item) => item.id)).toEqual(["256gb", "512gb"]);
    expect(samsung?.variantes.map((item) => item.almacenamiento)).toEqual([
      "256 GB",
      "512 GB",
    ]);

    expect(onePlus?.referencias.map((item) => `${item.coleccion}:${item.idRegistro}`)).toEqual([
      "vendidos:108",
      "ofertas:303",
      "mock:5",
    ]);
    expect(onePlus?.registros).toHaveLength(3);
  });

  it("refleja las variantes corregidas por PR #108 sin cambiar IDs de origen", () => {
    const onePlus = obtenerProductoCanonico("oneplus-pad-2");
    const ipad = obtenerProductoCanonico("apple-ipad-pro-11-m4");
    const thinkpad = obtenerProductoCanonico("lenovo-thinkpad-e14-gen-5");
    const macbook = obtenerProductoCanonico("apple-macbook-pro-16-m3-max");

    expect(onePlus?.variantes[0]).toMatchObject({
      ram: "12 GB",
      almacenamiento: "256 GB UFS 3.1",
    });
    expect(ipad?.referencias[0]).toMatchObject({
      coleccion: "deseados",
      idRegistro: 208,
      varianteId: "16gb-1tb",
    });
    expect(ipad?.variantes[0]).toMatchObject({
      ram: "16 GB memoria unificada",
      almacenamiento: "1 TB",
    });
    expect(thinkpad?.variantes[0]).toMatchObject({
      sku: "21JK0005RI",
      procesador: "Intel Core i5-1335U de 13.ª generación",
      ram: "16 GB DDR4",
      almacenamiento: "512 GB SSD NVMe",
      pantalla: "14 pulgadas IPS WUXGA · 300 nits · 45% NTSC",
    });
    expect(macbook?.referencias[0].varianteId).toBe("48gb-1tb");
    expect(macbook?.variantes[0]).toMatchObject({
      ram: "48 GB memoria unificada",
      almacenamiento: "1 TB SSD",
      procesador: "Apple M3 Max · 16 núcleos CPU · 40 núcleos GPU",
    });
  });

  it("mantiene separadas las variantes de A55 y las configuraciones identificadas de iPhone y Redmi", () => {
    const a55 = obtenerProductoCanonico("samsung-galaxy-a55-5g");
    const iphone = obtenerProductoCanonico("apple-iphone-13");
    const redmi = obtenerProductoCanonico("xiaomi-redmi-note-14-pro-plus-5g");
    const oneplus = obtenerProductoCanonico("oneplus-13");
    const iphone15 = obtenerProductoCanonico("apple-iphone-15-pro-max");
    const s25 = obtenerProductoCanonico("samsung-galaxy-s25-ultra");
    const xiaomi14 = obtenerProductoCanonico("xiaomi-14-ultra");
    const earA = obtenerProductoCanonico("nothing-ear-a-black");
    const xiaomi14t = obtenerProductoCanonico("xiaomi-14t-pro");
    expect(a55?.referencias[0]).toMatchObject({ coleccion: "vendidos", idRegistro: 102, varianteId: null });
    expect(a55?.variantes.map((v) => v.id)).toEqual(["8gb-128gb", "8gb-256gb"]);
    expect(iphone?.referencias[0].varianteId).toBe("128gb");
    expect(redmi?.referencias[0].varianteId).toBe("12gb-512gb-co");
    expect(oneplus?.referencias[0].varianteId).toBe("16gb-512gb");
    expect(iphone15?.referencias[0].varianteId).toBe("256gb");
    expect(s25?.referencias[0].varianteId).toBe("12gb-1tb");
    expect(xiaomi14?.referencias[0].varianteId).toBe("16gb-512gb");
    expect(earA?.referencias[0].varianteId).toBe("black");
    expect(xiaomi14t?.referencias[0].varianteId).toBe("12gb-512gb-co");
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

  it("verifica solo las imágenes con procedencia y licencia documentadas", () => {
    const samsung = obtenerProductoCanonico("samsung-galaxy-s24-ultra");
    const onePlus = obtenerProductoCanonico("oneplus-pad-2");
    const ipad = obtenerProductoCanonico("apple-ipad-pro-11-m4");
    const ear = obtenerProductoCanonico("nothing-ear-2");
    const special = obtenerProductoCanonico("nothing-phone-2a-special-edition");
    const sony = obtenerProductoCanonico("sony-wh-1000xm5");
    const a55 = obtenerProductoCanonico("samsung-galaxy-a55-5g");
    const iphone = obtenerProductoCanonico("apple-iphone-13");
    const redmi = obtenerProductoCanonico("xiaomi-redmi-note-14-pro-plus-5g");
    const oneplus = obtenerProductoCanonico("oneplus-13");
    const iphone15 = obtenerProductoCanonico("apple-iphone-15-pro-max");
    const s25 = obtenerProductoCanonico("samsung-galaxy-s25-ultra");
    const xiaomi14 = obtenerProductoCanonico("xiaomi-14-ultra");
    const earA = obtenerProductoCanonico("nothing-ear-a-black");
    const xiaomi14t = obtenerProductoCanonico("xiaomi-14t-pro");

    for (const producto of [samsung, onePlus, ipad, ear, special, sony, a55, iphone, redmi, oneplus, iphone15, s25, xiaomi14, earA, xiaomi14t]) {
      expect(producto?.imagen.url).toMatch(/^https:\/\//);
      expect(producto?.imagen.estadoVerificacion).toBe("verificada");
      expect(["CC BY-SA 4.0", "CC BY 4.0", "CC BY-ND 2.0", "CC0 1.0"]).toContain(producto?.imagen.licencia);
      expect(producto?.imagen.licenciaUrl).toMatch(/^https:\/\/creativecommons\.org\/(licenses|publicdomain)\//);
      expect(producto?.imagen.paginaOrigen).toMatch(/^https:\/\//);
      expect(producto?.imagen.autor).not.toBeNull();
      expect(producto?.imagen.atribucion).not.toBeNull();
    }

    expect(ear?.imagen.cambios).toContain("archivo recortado");
    expect(ear?.imagen.estadoVerificacion).toBe("verificada");
    expect(special?.imagen.licencia).toBe("CC BY 4.0");
    expect(sony?.imagen.licencia).toBe("CC BY-ND 2.0");
    expect(a55?.imagen.licencia).toBe("CC BY-SA 4.0");
    expect(iphone?.imagen.licencia).toBe("CC BY-SA 4.0");
    expect(redmi?.imagen.licencia).toBe("CC BY-SA 4.0");
    expect(oneplus?.imagen.licencia).toBe("CC BY-SA 4.0");
    expect(iphone15?.imagen.licencia).toBe("CC BY-SA 4.0");
    expect(s25?.imagen.licencia).toBe("CC BY-SA 4.0");
    expect(xiaomi14?.imagen.licencia).toBe("CC0 1.0");
    expect(earA?.imagen.licencia).toBe("CC BY 4.0");
    expect(xiaomi14t?.imagen.licencia).toBe("CC BY-SA 4.0");

    const pendientes = [
      obtenerProductoCanonico("lenovo-thinkpad-e14-gen-5"),
      obtenerProductoCanonico("apple-macbook-pro-16-m3-max"),
    ];

    for (const producto of pendientes) {
      expect(producto?.imagen.estadoVerificacion).toBe("pendiente");
      expect(producto?.imagen.licencia).toBeNull();
      expect(producto?.imagen.atribucion).toBeNull();
    }
  });

  it("valida todas las referencias y variantes del piloto", () => {
    expect(validarCatalogoCanonicoPiloto()).toEqual([]);
  });

  it("devuelve null para un ID canónico desconocido", () => {
    expect(obtenerProductoCanonico("producto-inexistente")).toBeNull();
  });
  it("incorpora Redmi Note 13 Pro+ 5G como modelo distinto con variante colombiana identificada", () => {
    const redmi = obtenerProductoCanonico("redmi-note-13-pro-plus-5g");
    expect(redmi?.referencias).toEqual([
      expect.objectContaining({ coleccion: "vendidos", idRegistro: 101, varianteId: "12gb-512gb" }),
    ]);
    expect(redmi?.variantes[0]).toMatchObject({
      ram: "12 GB LPDDR5",
      almacenamiento: "512 GB UFS 3.1",
      mercado: "Colombia",
    });
    expect(redmi?.imagen.estadoVerificacion).toBe("sin_imagen");
    expect(redmi?.imagen.url).toBeNull();
  });
});
