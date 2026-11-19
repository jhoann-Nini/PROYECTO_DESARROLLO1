// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { Producto } from "@/types/producto";
import { crearFichaVacia } from "@/data/normalizadorFicha";
import EspecificacionesProducto from "./EspecificacionesProducto";

const base: Producto = {
  idProducto: 51, nombre: "Equipo de prueba", descripcion: null, idCategoria: 1,
  idMarca: 1, nombreCategoria: "Móviles", imagen: null, precioReferencia: null,
  estado: true, caracteristicas: null,
};

describe("EspecificacionesProducto", () => {
  afterEach(() => cleanup());

  it("conserva presentación legacy sin versión", () => {
    render(<EspecificacionesProducto producto={{ ...base, caracteristicas: { ram: "8 GB" } }} />);
    expect(screen.getByText("8 GB")).toBeTruthy();
  });

  it("presenta V2 mediante su panel canónico", () => {
    const ficha = crearFichaVacia("moviles");
    ficha.atributos.push({ clave: "ram", nombre: "Memoria", grupo: "rendimiento", valor: "8 GB", unidad: null, valorOriginal: "8 GB", fuenteId: null });
    render(<EspecificacionesProducto producto={{ ...base, caracteristicas: ficha as unknown as Record<string, unknown> }} />);
    expect(screen.getByLabelText("Ficha técnica canónica V2")).toBeTruthy();
    expect(screen.getByText("Memoria")).toBeTruthy();
  });

  it("conserva presentación V1 mediante su adaptación legacy", () => {
    const v1 = { version_esquema: 1, categoria: "moviles", variante: null, metricasComparables: [], benchmarks: [], fuentes: [], estado_verificacion: "pendiente", ram: "8 GB" };
    render(<EspecificacionesProducto producto={{ ...base, caracteristicas: v1 }} />);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("heading", { name: "Especificaciones" })).toBeTruthy();
  });

  it("presenta V3 y advierte discrepancia entre categoría del catálogo y ficha", () => {
    const ficha = { version_esquema: 3, categoria: "celulares", variantes: [], especificaciones: [], fuentes: [], evidencias: [], benchmarks: [] };
    render(<EspecificacionesProducto producto={{ ...base, nombreCategoria: "Tablets", caracteristicas: ficha }} />);
    expect(screen.getByLabelText("Ficha técnica versión 3")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("no coincide");
  });
});
