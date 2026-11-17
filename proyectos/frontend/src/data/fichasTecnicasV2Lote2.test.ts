import { describe, expect, it } from "vitest";
import { esFichaTecnicaV2Valida, normalizarDesdeKimovil } from "@/data/normalizadorFicha";
import { FICHAS_TECNICAS_V2_PILOTO } from "@/data/fichasTecnicasV2Piloto";
import {
  DISPOSITIVOS_DESEADOS,
  DISPOSITIVOS_VENDIDOS,
  ULTIMAS_OFERTAS,
} from "@/data/mockProductos";

describe("fichas técnicas V2 — lote 2 de móviles", () => {
  const fichas = [
    FICHAS_TECNICAS_V2_PILOTO.appleIphone15ProMax,
    FICHAS_TECNICAS_V2_PILOTO.samsungGalaxyS25Ultra,
    FICHAS_TECNICAS_V2_PILOTO.oneplus13,
    FICHAS_TECNICAS_V2_PILOTO.redmiNote14ProPlus,
    FICHAS_TECNICAS_V2_PILOTO.xiaomi14TPro,
    FICHAS_TECNICAS_V2_PILOTO.nothingEarABlack,
  ];

  it("mantiene las seis fichas válidas, con fuentes y sin benchmarks no respaldados", () => {
    expect(fichas).toHaveLength(6);
    for (const ficha of fichas) {
      expect(esFichaTecnicaV2Valida(ficha)).toBe(true);
      expect(ficha.estado_verificacion).toBe("verificado");
      expect(ficha.fuentes.length).toBeGreaterThan(0);
      expect(ficha.benchmarks).toEqual([]);
      expect(ficha.metricasComparables.every((metrica) => metrica.comparable === false)).toBe(true);
    }
  });

  it("corrige la variante colombiana del Redmi Note 14 Pro+ a 8 GB/256 GB", () => {
    const ficha = FICHAS_TECNICAS_V2_PILOTO.redmiNote14ProPlus;
    expect(ficha.variantes[0]).toMatchObject({
      id: "8gb-256gb",
      ram: "8 GB LPDDR4X",
      almacenamiento: "256 GB UFS 2.2",
      mercado: "Colombia",
    });
    expect(ficha.atributos).toEqual(expect.arrayContaining([
      expect.objectContaining({ clave: "capacidad_bateria", valor: 5110, unidad: "mAh" }),
      expect.objectContaining({ clave: "carga_rapida", valor: 120, unidad: "W" }),
    ]));
  });

  it("corrige el Galaxy S25 Ultra de Colombia a 12 GB/1 TB", () => {
    const ficha = FICHAS_TECNICAS_V2_PILOTO.samsungGalaxyS25Ultra;
    expect(ficha.variantes[0]).toMatchObject({
      id: "12gb-1tb",
      ram: "12 GB",
      almacenamiento: "1 TB",
      mercado: "Colombia",
    });
  });

  it("no mantiene el nombre inexistente OnePlus 13 Pro 5G", () => {
    const ficha = FICHAS_TECNICAS_V2_PILOTO.oneplus13;
    expect(ficha.variantes[0]).toMatchObject({
      id: "16gb-512gb",
      modelo: "OnePlus 13",
      ram: "16 GB LPDDR5X",
      almacenamiento: "512 GB UFS 4.0",
    });
    expect(ficha.atributos).toEqual(expect.arrayContaining([
      expect.objectContaining({ clave: "procesador", valor: expect.stringContaining("Snapdragon 8 Elite") }),
      expect.objectContaining({ clave: "carga_rapida", valor: expect.stringContaining("100 W SUPERVOOC") }),
    ]));
  });

  it("mantiene iPhone 15 Pro Max 256 GB sin inventar la memoria RAM", () => {
    const ficha = FICHAS_TECNICAS_V2_PILOTO.appleIphone15ProMax;
    expect(ficha.variantes[0]).toMatchObject({ id: "256gb", almacenamiento: "256 GB" });
    expect(ficha.variantes[0].ram).toBeUndefined();
    expect(ficha.atributos).toEqual(expect.arrayContaining([
      expect.objectContaining({ clave: "teleobjetivo", valor: expect.stringContaining("tetraprisma") }),
      expect.objectContaining({ clave: "autonomia_video", valor: 29, unidad: "h" }),
    ]));
  });

  it("verifica Xiaomi 14T Pro 12 GB/512 GB con especificaciones de Xiaomi Colombia", () => {
    const ficha = FICHAS_TECNICAS_V2_PILOTO.xiaomi14TPro;
    expect(ficha.variantes[0]).toMatchObject({
      id: "12gb-512gb",
      ram: "12 GB LPDDR5X",
      almacenamiento: "512 GB UFS 4.0",
      mercado: "Colombia",
    });
    expect(ficha.atributos).toEqual(expect.arrayContaining([
      expect.objectContaining({ clave: "procesador", valor: expect.stringContaining("Dimensity 9300+") }),
      expect.objectContaining({ clave: "carga_rapida", valor: expect.stringContaining("120 W") }),
    ]));
  });

  it("verifica Nothing Ear (a) Black con las especificaciones de Nothing", () => {
    const ficha = FICHAS_TECNICAS_V2_PILOTO.nothingEarABlack;
    expect(ficha.variantes[0]).toMatchObject({ id: "black", modelo: "Nothing Ear (a) · Black" });
    expect(ficha.atributos).toEqual(expect.arrayContaining([
      expect.objectContaining({ clave: "cancelacion_ruido", valor: expect.stringContaining("45 dB") }),
      expect.objectContaining({ clave: "autonomia_sin_anc", valor: expect.stringContaining("42,5 h") }),
      expect.objectContaining({ clave: "bluetooth", valor: "Bluetooth 5.3 · conexión dual" }),
    ]));
  });

  it("asocia cada ficha a su registro original sin cambiar sus IDs", () => {
    const iphone = DISPOSITIVOS_DESEADOS.find((item) => item.id === 201)!;
    const s25 = DISPOSITIVOS_DESEADOS.find((item) => item.id === 206)!;
    const oneplus = DISPOSITIVOS_DESEADOS.find((item) => item.id === 207)!;
    const redmi = DISPOSITIVOS_VENDIDOS.find((item) => item.id === 107)!;
    const xiaomi = ULTIMAS_OFERTAS.find((item) => item.id === 306)!;
    const earA = ULTIMAS_OFERTAS.find((item) => item.id === 301)!;

    expect(normalizarDesdeKimovil(iphone).variantes[0]?.id).toBe("256gb");
    expect(normalizarDesdeKimovil(s25).variantes[0]?.id).toBe("12gb-1tb");
    expect(normalizarDesdeKimovil(oneplus).variantes[0]?.id).toBe("16gb-512gb");
    expect(normalizarDesdeKimovil(redmi).variantes[0]?.id).toBe("8gb-256gb");
    expect(normalizarDesdeKimovil(xiaomi).variantes[0]?.id).toBe("12gb-512gb");
    expect(normalizarDesdeKimovil(earA).variantes[0]?.id).toBe("black");
  });
});
