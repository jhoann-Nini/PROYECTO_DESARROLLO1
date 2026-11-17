import { describe, expect, it } from "vitest";
import {
  DISPOSITIVOS_DESEADOS,
  DISPOSITIVOS_VENDIDOS,
  ULTIMAS_OFERTAS,
} from "./mockProductos";

describe("registros comerciales — lote 2", () => {
  it("corrige Redmi Note 14 Pro+ a la variante colombiana 8 GB/256 GB", () => {
    const producto = DISPOSITIVOS_VENDIDOS.find((item) => item.id === 107);
    expect(producto?.especificaciones).toContain("8GB RAM · 256GB");
    expect(producto?.especificaciones).not.toContain("16GB RAM");
    expect(producto?.imagen).toContain("Redmi_Note_14_ProPlus.jpg");
    expect(producto?.detalleSpecs?.benchmarkEtiqueta).toBeUndefined();
    expect(producto?.detalleSpecs?.benchmarkValor).toBeUndefined();
    expect(producto?.detalleSpecs?.metricas).toBeUndefined();
    expect(producto?.detalleSpecs?.secciones?.some((item) =>
      item.descripcion.includes("5110 mAh") && item.descripcion.includes("120W")
    )).toBe(true);
  });

  it("mantiene iPhone 15 Pro Max de 256 GB con imagen del modelo", () => {
    const producto = DISPOSITIVOS_DESEADOS.find((item) => item.id === 201);
    expect(producto?.nombre).toBe("iPhone 15 Pro Max (256GB)");
    expect(producto?.imagen).toContain("IPhone_15_Pro_Max_2024.jpg");
    expect(producto?.detalleSpecs?.benchmarkEtiqueta).toBeUndefined();
    expect(producto?.detalleSpecs?.benchmarkValor).toBeUndefined();
  });

  it("corrige Galaxy S25 Ultra a 12 GB/1 TB para Colombia", () => {
    const producto = DISPOSITIVOS_DESEADOS.find((item) => item.id === 206);
    expect(producto?.especificaciones).toContain("12GB RAM · 1TB");
    expect(producto?.especificaciones).not.toContain("16GB RAM");
    expect(producto?.imagen).toContain("Samsung_Galaxy_S25_Ultra_2025");
    expect(producto?.detalleSpecs?.benchmarkEtiqueta).toBeUndefined();
    expect(producto?.detalleSpecs?.benchmarkValor).toBeUndefined();
  });

  it("corrige la identidad comercial OnePlus 13 Pro a OnePlus 13", () => {
    const producto = DISPOSITIVOS_DESEADOS.find((item) => item.id === 207);
    expect(producto?.nombre).toBe("OnePlus 13");
    expect(producto?.nombre).not.toContain("Pro");
    expect(producto?.especificaciones).toContain("16GB RAM · 512GB");
    expect(producto?.imagen).toContain("OnePlus_13_back.jpg");
    expect(producto?.detalleSpecs?.benchmarkEtiqueta).toBeUndefined();
    expect(producto?.detalleSpecs?.benchmarkValor).toBeUndefined();
  });

  it("documenta Xiaomi 14T Pro 12 GB/512 GB y la imagen exacta", () => {
    const producto = ULTIMAS_OFERTAS.find((item) => item.id === 306);
    expect(producto?.especificaciones).toContain("12GB RAM · 512GB");
    expect(producto?.imagen).toContain("Xiaomi_14T_Pro.jpg");
    expect(producto?.detalleSpecs?.benchmarkEtiqueta).toBeUndefined();
    expect(producto?.detalleSpecs?.benchmarkValor).toBeUndefined();
    expect(producto?.detalleSpecs?.secciones?.some((item) =>
      item.descripcion.includes("Wi-Fi 6") && !item.descripcion.includes("Wi-Fi 7")
    )).toBe(true);
  });
});
