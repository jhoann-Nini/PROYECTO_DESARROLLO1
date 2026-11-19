import { describe, expect, it } from "vitest";
import { esSlugCategoria } from "@/lib/categorias";
import {
  ARTICULOS_BLOG,
  calcularMinutosLectura,
  obtenerArticuloPorSlug,
  textoArticulo,
} from "./blog";
import { MAX_COMPARADOR } from "./comparador";

function esFechaISOValida(valor: string): boolean {
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (!coincidencia) return false;

  const anio = Number(coincidencia[1]);
  const mes = Number(coincidencia[2]);
  const dia = Number(coincidencia[3]);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));

  return (
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia
  );
}

describe("contenido del blog", () => {
  it("tiene slugs únicos y categorías navegables válidas", () => {
    const slugs = ARTICULOS_BLOG.map((articulo) => articulo.slug);
    expect(new Set(slugs).size).toBe(slugs.length);

    for (const articulo of ARTICULOS_BLOG) {
      expect(esSlugCategoria(articulo.categoriaSlug)).toBe(true);
      expect(articulo.titulo.trim().length).toBeGreaterThan(0);
      expect(articulo.extracto.trim().length).toBeGreaterThan(0);
      expect(articulo.secciones.length).toBeGreaterThan(0);
      expect(articulo.puntosClave.length).toBeGreaterThan(0);
    }
  });

  it("mantiene slugs, fechas, secciones y párrafos coherentes", () => {
    for (const articulo of ARTICULOS_BLOG) {
      expect(articulo.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(esFechaISOValida(articulo.fecha)).toBe(true);

      const titulos = articulo.secciones.map((seccion) => seccion.titulo);
      expect(new Set(titulos).size).toBe(titulos.length);

      for (const seccion of articulo.secciones) {
        expect(seccion.parrafos.length).toBeGreaterThan(0);
        for (const parrafo of seccion.parrafos) {
          expect(parrafo.trim().length).toBeGreaterThan(0);
        }
      }

      for (const punto of articulo.puntosClave) {
        expect(punto.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("la guía de comparación documenta la regla real del comparador", () => {
    const articulo = obtenerArticuloPorSlug("como-comparar-dos-moviles");
    expect(articulo).toBeDefined();

    const texto = textoArticulo(articulo!);
    expect(texto).toContain(`hasta ${MAX_COMPARADOR} productos`);
    expect(texto).toMatch(/misma categoría/i);
    expect(texto).toMatch(/filas técnicas/i);
    expect(texto).toMatch(/datos registrados/i);
    expect(texto).toMatch(/Sin dato/);
  });

  it("la guía de batería explica cómo se muestra un dato ausente", () => {
    const articulo = obtenerArticuloPorSlug(
      "bateria-y-carga-que-significan-los-numeros",
    );
    expect(articulo).toBeDefined();

    const texto = textoArticulo(articulo!);
    expect(texto).toMatch(/Sin dato/);
    expect(texto).toMatch(/omite los campos sin información/i);
    expect(texto).not.toMatch(/aparecerá como no registrado/i);
  });

  it("describe la ausencia de datos según la vista real", () => {
    const articulo = obtenerArticuloPorSlug("como-comparar-dos-moviles");
    expect(articulo).toBeDefined();

    const texto = textoArticulo(articulo!);
    expect(texto).not.toMatch(/muestra como ausente/i);
    expect(texto).toMatch(/omite/i);
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
