import { describe, expect, it } from "vitest";
import {
  DISPOSITIVOS_DESEADOS,
  DISPOSITIVOS_VENDIDOS,
  PRODUCTOS_MOCK,
  ULTIMAS_OFERTAS,
} from "./mockProductos";

describe("coherencia técnica e imágenes de productos del catálogo", () => {
  it("mantiene Nothing Phone (2a) Special Edition de 12GB/256GB", () => {
    const producto = PRODUCTOS_MOCK.find((item) => item.idProducto === 1);
    expect(producto?.nombre).toBe("Nothing Phone (2a) Special Edition");
    expect(producto?.caracteristicas?.ram_almacenamiento).toContain("12GB RAM");
    expect(producto?.caracteristicas?.ram_almacenamiento).toContain("256GB");
  });

  it("identifica Galaxy S24 Ultra de 12GB/256GB sin benchmark no respaldado", () => {
    const producto = DISPOSITIVOS_DESEADOS.find((item) => item.id === 202);
    expect(producto?.nombre).toContain("Galaxy S24 Ultra");
    expect(producto?.especificaciones).toContain("12GB RAM · 256GB");
    expect(producto?.detalleSpecs?.benchmarkEtiqueta).toBeUndefined();
    expect(producto?.detalleSpecs?.benchmarkValor).toBeUndefined();
    expect(producto?.detalleSpecs?.secciones?.some((seccion) =>
      seccion.descripcion.includes("12GB de RAM · 256GB de almacenamiento")
    )).toBe(true);
  });

  it("mantiene OnePlus Pad 2 en UFS 3.1 en las tres apariciones del catálogo", () => {
    const productoMock = PRODUCTOS_MOCK.find((item) => item.idProducto === 5);
    const vendido = DISPOSITIVOS_VENDIDOS.find((item) => item.id === 108);
    const oferta = ULTIMAS_OFERTAS.find((item) => item.id === 303);
    expect(productoMock?.nombre).toBe("OnePlus Pad 2");
    expect(productoMock?.caracteristicas?.ram_almacenamiento).toContain("UFS 3.1");
    for (const producto of [vendido, oferta]) {
      expect(producto?.detalleSpecs?.secciones?.some((seccion) =>
        seccion.descripcion.includes("UFS 3.1")
      )).toBe(true);
      expect(producto?.detalleSpecs?.benchmarkEtiqueta).toBeUndefined();
      expect(producto?.detalleSpecs?.benchmarkValor).toBeUndefined();
    }
  });

  it("usa iPad Pro M4 de 1TB/16GB con CPU y GPU de 10 núcleos", () => {
    const producto = DISPOSITIVOS_DESEADOS.find((item) => item.id === 208);
    expect(producto?.especificaciones).toContain("16GB RAM · 1TB");
    expect(producto?.detalleSpecs?.secciones?.some((seccion) =>
      seccion.descripcion.includes("10 núcleos CPU + 10 núcleos GPU")
    )).toBe(true);
    expect(producto?.detalleSpecs?.secciones?.some((seccion) =>
      seccion.descripcion.includes("16GB de memoria unificada · 1TB")
    )).toBe(true);
    expect(producto?.detalleSpecs?.benchmarkEtiqueta).toBeUndefined();
    expect(producto?.detalleSpecs?.benchmarkValor).toBeUndefined();
  });

  it("usa SKU ThinkPad 21JK0005RI con i5-1335U y panel 45% NTSC", () => {
    const producto = PRODUCTOS_MOCK.find((item) => item.idProducto === 6);
    expect(producto?.descripcion).toContain("i5-1335U");
    expect(producto?.descripcion).toContain("21JK0005RI");
    expect(producto?.caracteristicas?.sku).toBe("21JK0005RI");
    expect(producto?.caracteristicas?.procesador).toContain("i5-1335U");
    expect(producto?.caracteristicas?.pantalla).toContain("45% NTSC");
    expect(producto?.caracteristicas?.pantalla).not.toContain("100% sRGB");
  });

  it("usa MacBook Pro M3 Max 16CPU/40GPU con 48GB y 400GB/s", () => {
    const producto = DISPOSITIVOS_DESEADOS.find((item) => item.id === 209);
    expect(producto?.especificaciones).toContain("16 CPU / 40 GPU");
    expect(producto?.especificaciones).toContain("48GB");
    expect(producto?.detalleSpecs?.secciones?.some((seccion) =>
      seccion.descripcion.includes("48GB de memoria unificada con 400GB/s")
    )).toBe(true);
    expect(producto?.detalleSpecs?.benchmarkEtiqueta).toBeUndefined();
    expect(producto?.detalleSpecs?.benchmarkValor).toBeUndefined();
  });

  it("mantiene Nothing Ear (2) Transparent White", () => {
    const producto = PRODUCTOS_MOCK.find((item) => item.idProducto === 3);
    expect(producto?.nombre).toBe("Nothing Ear (2) Transparent White");
    expect(producto?.caracteristicas?.transductores).toContain("11.6mm");
    expect(producto?.caracteristicas?.cancelacion_ruido).toContain("40dB");
  });

  it("normaliza el registro OnePlus 13 y elimina el nombre de modelo inexistente y el benchmark no respaldado", () => {
    const producto = DISPOSITIVOS_DESEADOS.find((item) => item.id === 207);
    expect(producto?.nombre).toBe("OnePlus 13 5G");
    expect(producto?.especificaciones).toContain("16GB RAM · 512GB");
    expect(producto?.imagen).toBe("https://upload.wikimedia.org/wikipedia/commons/1/14/OnePlus_13_back.jpg");
    expect(producto?.detalleSpecs?.benchmarkEtiqueta).toBeUndefined();
    expect(producto?.detalleSpecs?.benchmarkValor).toBeUndefined();
    expect(producto?.detalleSpecs?.secciones?.some((seccion) => seccion.descripcion.includes("50MP teleobjetivo") && seccion.descripcion.includes("50MP ultra gran angular"))).toBe(true);
  });

  it("corrige Redmi Note 14 Pro+ a 12GB físicos/512GB y elimina datos técnicos falsos", () => {
    const producto = DISPOSITIVOS_VENDIDOS.find((item) => item.id === 107);
    expect(producto?.especificaciones).toContain("12GB RAM física · 512GB");
    expect(producto?.especificaciones).toContain("UFS 2.2");
    expect(producto?.imagen).toBe("https://upload.wikimedia.org/wikipedia/commons/4/40/Redmi_Note_14_ProPlus.jpg");
    expect(producto?.detalleSpecs?.benchmarkEtiqueta).toBeUndefined();
    expect(producto?.detalleSpecs?.benchmarkValor).toBeUndefined();
    expect(producto?.detalleSpecs?.secciones?.some((seccion) => seccion.descripcion.includes("5110mAh") && seccion.descripcion.includes("120W"))).toBe(true);
    expect(producto?.detalleSpecs?.secciones?.some((seccion) => seccion.descripcion.includes("20MP") && seccion.descripcion.includes("cámara frontal"))).toBe(true);
  });

  it("no presenta -42dB como benchmark verificado del Sony WH-1000XM5", () => {
    const producto = DISPOSITIVOS_VENDIDOS.find((item) => item.id === 109);
    expect(producto?.nombre).toContain("Sony WH-1000XM5");
    expect(producto?.detalleSpecs?.benchmarkEtiqueta).toBeUndefined();
    expect(producto?.detalleSpecs?.benchmarkValor).toBeUndefined();
  });
});
