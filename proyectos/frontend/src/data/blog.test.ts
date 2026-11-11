import { describe, expect, it } from "vitest";
import {
  ARTICULOS_BLOG,
  calcularMinutosLectura,
  obtenerArticuloPorSlug,
} from "./blog";

describe("contenido del blog", () => {
  it("tiene slugs únicos y categorías navegables válidas", () => {
    const slugs = ARTICULOS_BLOG.map((articulo) => articulo.slug);
    expect(new Set(slugs).size).toBe(slugs.length);

    const categorias = new Set([
      "celulares",
      "tablets",
      "portatiles",
      "auriculares",
    ]);

    for (const articulo of ARTICULOS_BLOG) {
      expect(categorias.has(articulo.categoriaSlug)).toBe(true);
      expect(articulo.titulo.trim().length).toBeGreaterThan(0);
      expect(articulo.extracto.trim().length).toBeGreaterThan(0);
      expect(articulo.secciones.length).toBeGreaterThan(0);
      expect(articulo.puntosClave.length).toBeGreaterThan(0);
    }
  });

  it("calcula una estimación de lectura positiva y estable", () => {
    for (const articulo of ARTICULOS_BLOG) {
      const minutos = calcularMinutosLectura(articulo);
      expect(Number.isInteger(minutos)).toBe(true);
      expect(minutos).toBeGreaterThanOrEqual(1);
      expect(calcularMinutosLectura(articulo)).toBe(minutos);
    }
  });

  it("encuentra artículos por slug y devuelve undefined si no existe", () => {
    expect(obtenerArticuloPorSlug(ARTICULOS_BLOG[0].slug)?.titulo).toBe(
      ARTICULOS_BLOG[0].titulo,
    );
    expect(obtenerArticuloPorSlug("no-existe")).toBeUndefined();
  });
});
