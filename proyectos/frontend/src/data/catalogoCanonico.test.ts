import { describe, expect, it } from "vitest";
import {
  CATALOGO_CANONICO_PILOTO,
  CATALOGO_CANONICO_ADICIONAL,
  CATALOGO_CANONICO_REGISTRADO,
  obtenerCatalogoCanonicoPiloto,
  obtenerCatalogoCanonicoRegistrado,
  obtenerProductoCanonico,
  validarCatalogoCanonicoPiloto,
  validarCatalogoCanonicoRegistrado,
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

    for (const producto of [samsung, onePlus, ipad, ear, special, sony]) {
      expect(producto?.imagen.url).toMatch(/^https:\/\//);
      expect(producto?.imagen.estadoVerificacion).toBe("verificada");
      expect(["CC BY-SA 4.0", "CC BY 4.0", "CC BY-ND 2.0"]).toContain(producto?.imagen.licencia);
      expect(producto?.imagen.licenciaUrl).toMatch(/^https:\/\/creativecommons\.org\/licenses\//);
      expect(producto?.imagen.paginaOrigen).toMatch(/^https:\/\//);
      expect(producto?.imagen.autor).not.toBeNull();
      expect(producto?.imagen.atribucion).not.toBeNull();
    }

    expect(ear?.imagen.cambios).toContain("archivo recortado");
    expect(ear?.imagen.estadoVerificacion).toBe("verificada");
    expect(special?.imagen.licencia).toBe("CC BY 4.0");
    expect(sony?.imagen.licencia).toBe("CC BY-ND 2.0");

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

  it("incorpora Galaxy A55, iPhone 13 y OnePlus 13 al registro sin alterar el piloto", () => {
    expect(CATALOGO_CANONICO_PILOTO).toHaveLength(8);
    expect(CATALOGO_CANONICO_ADICIONAL).toHaveLength(3);
    expect(CATALOGO_CANONICO_REGISTRADO).toHaveLength(11);

    const a55 = obtenerProductoCanonico("samsung-galaxy-a55-5g");
    const iphone = obtenerProductoCanonico("apple-iphone-13");
    const onePlus13 = obtenerProductoCanonico("oneplus-13");

    expect(a55?.referencias).toEqual([
      expect.objectContaining({ coleccion: "vendidos", idRegistro: 102, varianteId: "8gb-256gb" }),
    ]);
    expect(a55?.variantes[0]).toMatchObject({ ram: "8 GB", almacenamiento: "256 GB", mercado: "Colombia" });
    expect(iphone?.referencias).toEqual([
      expect.objectContaining({ coleccion: "vendidos", idRegistro: 104, varianteId: "128gb" }),
    ]);
    expect(iphone?.variantes[0]).toMatchObject({ almacenamiento: "128 GB" });
    expect(onePlus13?.referencias).toEqual([
      expect.objectContaining({ coleccion: "deseados", idRegistro: 207, varianteId: "16gb-512gb" }),
    ]);
    expect(onePlus13?.nombre).toBe("OnePlus 13");
    expect((onePlus13?.registros[0] as { nombre?: string } | undefined)?.nombre).toBe("OnePlus 13 5G");
    expect(CATALOGO_CANONICO_REGISTRADO.some((item) => item.nombre.includes("OnePlus 13 Pro"))).toBe(false);
  });

  it("resuelve y verifica las tres imágenes adicionales por su atribución exacta", () => {
    const a55 = obtenerProductoCanonico("samsung-galaxy-a55-5g");
    const iphone = obtenerProductoCanonico("apple-iphone-13");
    const onePlus13 = obtenerProductoCanonico("oneplus-13");

    for (const producto of [a55, iphone, onePlus13]) {
      expect(producto?.imagen.url).toMatch(/^https:\/\//);
      expect(producto?.imagen.estadoVerificacion).toBe("verificada");
      expect(producto?.imagen.licencia).toBe("CC BY-SA 4.0");
      expect(producto?.imagen.autor).not.toBeNull();
      expect(producto?.imagen.paginaOrigen).toMatch(/^https:\/\//);
    }
    expect(onePlus13?.imagen.autor).toBe("Maksdroider");
    expect(onePlus13?.imagen.cambios).toBe("Sin modificaciones.");
  });

  it("valida las referencias de los once productos registrados", () => {
    expect(validarCatalogoCanonicoRegistrado()).toEqual([]);
    expect(obtenerCatalogoCanonicoRegistrado()).toHaveLength(11);
  });

  it("devuelve null para un ID canónico desconocido", () => {
    expect(obtenerProductoCanonico("producto-inexistente")).toBeNull();
  });
});
