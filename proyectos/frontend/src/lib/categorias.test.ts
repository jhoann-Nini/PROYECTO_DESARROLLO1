import { describe, expect, it } from "vitest";
import type { CategoriaResponse } from "@/types/producto";
import {
  CATEGORIAS_NAVEGABLES,
  esSlugCategoria,
  normalizarTexto,
  obtenerRutaCategoria,
  resolverCategoriasPorSlug,
} from "./categorias";

function categoria(
  idCategoria: number,
  nombre: string,
  descripcion: string | null = null,
): CategoriaResponse {
  return { idCategoria, nombre, descripcion, estado: true };
}

describe("normalizarTexto", () => {
  it("debe pasar a minúsculas y quitar tildes y diacríticos", () => {
    expect(normalizarTexto("Móviles / Portátiles")).toBe("moviles / portatiles");
    expect(normalizarTexto("AURICULARES")).toBe("auriculares");
    expect(normalizarTexto("  Teléfonos  ")).toBe("telefonos");
  });
});

describe("esSlugCategoria", () => {
  it("debe aceptar únicamente los slugs navegables definidos", () => {
    for (const definicion of CATEGORIAS_NAVEGABLES) {
      expect(esSlugCategoria(definicion.slug)).toBe(true);
    }
    expect(esSlugCategoria("accesorios")).toBe(false);
    expect(esSlugCategoria("monitores")).toBe(false);
    expect(esSlugCategoria("")).toBe(false);
  });
});

describe("obtenerRutaCategoria", () => {
  it("debe construir la ruta pública de la categoría", () => {
    expect(obtenerRutaCategoria("celulares")).toBe("/categorias/celulares");
    expect(obtenerRutaCategoria("portatiles")).toBe("/categorias/portatiles");
  });
});

describe("resolverCategoriasPorSlug", () => {
  it("debe resolver 'Celulares' por nombre sin depender de un ID fijo", () => {
    const categorias = [categoria(99, "Celulares", "Teléfonos de última generación")];

    const resultado = resolverCategoriasPorSlug(categorias, "celulares");

    expect(resultado).not.toBeNull();
    expect(resultado?.definicion.slug).toBe("celulares");
    expect(resultado?.categorias.map((c) => c.idCategoria)).toEqual([99]);
  });

  it("debe resolver variantes con tildes y sinónimos reales de la base de datos", () => {
    expect(
      resolverCategoriasPorSlug([categoria(1, "Móviles")], "celulares")?.categorias[0].nombre,
    ).toBe("Móviles");
    expect(
      resolverCategoriasPorSlug([categoria(2, "Teléfonos")], "celulares")?.categorias[0].nombre,
    ).toBe("Teléfonos");
    expect(
      resolverCategoriasPorSlug([categoria(3, "Laptops / PCs")], "portatiles")?.categorias[0]
        .nombre,
    ).toBe("Laptops / PCs");
    expect(
      resolverCategoriasPorSlug([categoria(4, "Audio / Auriculares")], "auriculares")
        ?.categorias[0].nombre,
    ).toBe("Audio / Auriculares");
    expect(
      resolverCategoriasPorSlug([categoria(5, "Tablets")], "tablets")?.categorias[0].nombre,
    ).toBe("Tablets");
  });

  it("debe devolver null cuando ninguna categoría coincide con el slug", () => {
    expect(resolverCategoriasPorSlug([categoria(1, "Accesorios")], "celulares")).toBeNull();
    expect(resolverCategoriasPorSlug([], "tablets")).toBeNull();
  });

  it("debe devolver null si el slug no es navegable", () => {
    expect(resolverCategoriasPorSlug([categoria(1, "Celulares")], "accesorios")).toBeNull();
  });

  it("no debe asignar una misma categoría a dos slugs distintos", () => {
    const categorias = [
      categoria(10, "Audio / Auriculares"),
      categoria(11, "Celulares"),
    ];

    const auriculares = resolverCategoriasPorSlug(categorias, "auriculares");
    const celulares = resolverCategoriasPorSlug(categorias, "celulares");

    expect(auriculares?.categorias.map((c) => c.idCategoria)).toEqual([10]);
    expect(celulares?.categorias.map((c) => c.idCategoria)).toEqual([11]);
  });
});
