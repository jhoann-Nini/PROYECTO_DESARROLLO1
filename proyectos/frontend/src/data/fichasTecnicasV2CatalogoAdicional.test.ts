import { describe, expect, it } from "vitest";
import { esFichaTecnicaV2Valida, normalizarDesdeKimovil } from "./normalizadorFicha";
import {
  DISPOSITIVOS_VENDIDOS,
  DISPOSITIVOS_DESEADOS,
} from "./mockProductos";
import {
  FICHAS_TECNICAS_V2_CATALOGO_ADICIONAL,
  obtenerFichaTecnicaV2CatalogoParaKimovil,
} from "./fichasTecnicasV2CatalogoAdicional";

describe("fichas técnicas V2 adicionales del catálogo", () => {
  it("registra tres fichas V2 válidas con variantes identificadas", () => {
    const fichas = Object.values(FICHAS_TECNICAS_V2_CATALOGO_ADICIONAL);
    expect(fichas).toHaveLength(3);
    for (const ficha of fichas) {
      expect(esFichaTecnicaV2Valida(ficha)).toBe(true);
      const idsFuente = new Set(ficha.fuentes.map((fuente) => fuente.id));
      const claves = ficha.atributos.map((atributo) => atributo.clave);
      expect(new Set(claves).size).toBe(claves.length);
      for (const atributo of ficha.atributos) {
        expect(idsFuente.has(atributo.fuenteId ?? "")).toBe(true);
      }
    }
  });

  it("documenta Galaxy A55 5G con la variante colombiana 8 GB + 256 GB", () => {
    const ficha = FICHAS_TECNICAS_V2_CATALOGO_ADICIONAL.samsungGalaxyA55;
    expect(ficha.estado_verificacion).toBe("verificado");
    expect(ficha.variantes[0]).toMatchObject({
      id: "8gb-256gb",
      ram: "8 GB",
      almacenamiento: "256 GB",
      mercado: "Colombia",
    });
    expect(ficha.atributos).toEqual(expect.arrayContaining([
      expect.objectContaining({ clave: "procesador", valor: "Samsung Exynos 1480" }),
      expect.objectContaining({ clave: "proteccion", valor: "IP67" }),
      expect.objectContaining({ clave: "camara_principal" }),
    ]));
  });

  it("documenta iPhone 13 de 128 GB con especificaciones de Apple", () => {
    const ficha = FICHAS_TECNICAS_V2_CATALOGO_ADICIONAL.appleIphone13;
    expect(ficha.variantes[0]).toMatchObject({
      id: "128gb",
      almacenamiento: "128 GB",
    });
    expect(ficha.atributos).toEqual(expect.arrayContaining([
      expect.objectContaining({ clave: "procesador", valor: "Apple A15 Bionic" }),
      expect.objectContaining({ clave: "densidad_pixeles", valor: "460 ppi" }),
      expect.objectContaining({ clave: "proteccion", valor: expect.stringContaining("IP68") }),
      expect.objectContaining({ clave: "conector", valor: "Lightning" }),
    ]));
  });

  it("normaliza OnePlus 13 16 GB + 512 GB y no inventa un modelo Pro", () => {
    const ficha = FICHAS_TECNICAS_V2_CATALOGO_ADICIONAL.oneplus13;
    expect(ficha.variantes[0]).toMatchObject({
      id: "16gb-512gb",
      modelo: "OnePlus 13",
      ram: "16 GB LPDDR5X",
      almacenamiento: "512 GB UFS 4.0",
    });
    expect(ficha.atributos).toEqual(expect.arrayContaining([
      expect.objectContaining({ clave: "procesador", valor: "Qualcomm Snapdragon 8 Elite" }),
      expect.objectContaining({ clave: "camara_teleobjetivo" }),
      expect.objectContaining({ clave: "carga_inalambrica", valor: 50, unidad: "W" }),
    ]));
    expect(obtenerFichaTecnicaV2CatalogoParaKimovil(207, "OnePlus 13 5G")).toBe(ficha);
    expect(obtenerFichaTecnicaV2CatalogoParaKimovil(999, "OnePlus 13 Pro 5G")).toBeNull();
  });

  it("integra las fichas verificadas al normalizar los registros mock originales", () => {
    const a55 = DISPOSITIVOS_VENDIDOS.find((producto) => producto.id === 102);
    const iphone = DISPOSITIVOS_VENDIDOS.find((producto) => producto.id === 104);
    const oneplus = DISPOSITIVOS_DESEADOS.find((producto) => producto.id === 207);
    expect(a55 && normalizarDesdeKimovil(a55).estado_verificacion).toBe("verificado");
    expect(iphone && normalizarDesdeKimovil(iphone).estado_verificacion).toBe("verificado");
    expect(oneplus && normalizarDesdeKimovil(oneplus).estado_verificacion).toBe("verificado");
    expect(oneplus && normalizarDesdeKimovil(oneplus).variantes[0].modelo).toBe("OnePlus 13");
  });
});
