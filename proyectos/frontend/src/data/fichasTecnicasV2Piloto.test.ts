import { describe, expect, it } from "vitest";
import { esFichaTecnicaV2Valida } from "@/data/normalizadorFicha";
import {
  FICHAS_TECNICAS_V2_PILOTO,
} from "@/data/fichasTecnicasV2Piloto";
import {
  DISPOSITIVOS_DESEADOS,
  DISPOSITIVOS_VENDIDOS,
  PRODUCTOS_MOCK,
  ULTIMAS_OFERTAS,
} from "@/data/mockProductos";
import {
  normalizarDesdeKimovil,
  normalizarDesdeProducto,
} from "@/data/normalizadorFicha";

describe("fichas técnicas V2 de los ocho productos piloto", () => {
  it("mantiene fichas V2 válidas, con fuentes y sin benchmarks no respaldados", () => {
    const fichas = Object.values(FICHAS_TECNICAS_V2_PILOTO);
    expect(fichas).toHaveLength(9); // Samsung tiene dos variantes comerciales.
    for (const ficha of fichas) {
      expect(esFichaTecnicaV2Valida(ficha)).toBe(true);
      expect(ficha.fuentes.length).toBeGreaterThan(0);
      expect(ficha.benchmarks).toEqual([]);
      expect(ficha.metricasComparables.every((metrica) => metrica.comparable === false)).toBe(true);
    }
  });

  it("asocia las fichas V2 a los cuatro productos mock", () => {
    const ids = [1, 3, 5, 6];
    const productos = PRODUCTOS_MOCK.filter((producto) => ids.includes(producto.idProducto));
    expect(productos).toHaveLength(4);

    for (const producto of productos) {
      const ficha = normalizarDesdeProducto(producto);
      expect(esFichaTecnicaV2Valida(ficha)).toBe(true);
      expect(ficha.fuentes.length).toBeGreaterThan(0);
      expect(ficha.estado_verificacion).not.toBe("verificado");
    }
  });

  it("distingue las variantes de 256 GB y 512 GB del Galaxy S24 Ultra", () => {
    const s24_256 = DISPOSITIVOS_DESEADOS.find((producto) => producto.id === 202);
    const s24_512 = ULTIMAS_OFERTAS.find((producto) => producto.id === 300);
    expect(s24_256).toBeDefined();
    expect(s24_512).toBeDefined();

    expect(normalizarDesdeKimovil(s24_256!).variantes[0]?.id).toBe("256gb");
    expect(normalizarDesdeKimovil(s24_512!).variantes[0]?.id).toBe("512gb");
  });

  it("asocia OnePlus Pad 2 a su variante 12 GB/256 GB en vendidos, ofertas y mock", () => {
    const vendido = DISPOSITIVOS_VENDIDOS.find((producto) => producto.id === 108);
    const oferta = ULTIMAS_OFERTAS.find((producto) => producto.id === 303);
    const mock = PRODUCTOS_MOCK.find((producto) => producto.idProducto === 5);

    expect(normalizarDesdeKimovil(vendido!).variantes[0]?.id).toBe("12gb-256gb");
    expect(normalizarDesdeKimovil(oferta!).variantes[0]?.id).toBe("12gb-256gb");
    expect(normalizarDesdeProducto(mock!).variantes[0]?.id).toBe("12gb-256gb");
  });

  it("conserva el SKU exacto del ThinkPad y la configuración del MacBook", () => {
    const thinkpad = PRODUCTOS_MOCK.find((producto) => producto.idProducto === 6);
    const macbook = DISPOSITIVOS_DESEADOS.find((producto) => producto.id === 209);

    expect(normalizarDesdeProducto(thinkpad!).variantes[0]).toMatchObject({
      id: "16gb-512gb",
      sku: "21JK0005RI",
    });
    expect(normalizarDesdeKimovil(macbook!).variantes[0]).toMatchObject({
      id: "48gb-1tb",
      identificador: "M3 Max · CPU 16 núcleos · GPU 40 núcleos",
    });
  });

  it("asocia las fichas oficiales de iPad Pro M4, Nothing Ear (2) y Sony WH-1000XM5", () => {
    const ipad = DISPOSITIVOS_DESEADOS.find((producto) => producto.id === 208);
    const sony = DISPOSITIVOS_VENDIDOS.find((producto) => producto.id === 109);
    const ear = PRODUCTOS_MOCK.find((producto) => producto.idProducto === 3);

    expect(normalizarDesdeKimovil(ipad!).variantes[0]?.id).toBe("16gb-1tb");
    expect(normalizarDesdeProducto(ear!).variantes[0]?.id).toBe("transparent-white");
    expect(normalizarDesdeKimovil(sony!).fuentes[0]?.url).toContain("sony.com");
  });
});
