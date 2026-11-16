import { describe, expect, it } from "vitest";
import { construirFilasComparacion } from "./comparador";
import type { ProductoViewModel } from "./productoViewModel";

function producto(
  idProducto: number,
  categoria: ProductoViewModel["categoria"],
  metricas: Array<{
    clave: string;
    nombre: string;
    grupo: string;
    valor: number | string | boolean;
    unidad?: string | null;
    comparable: boolean;
  }>,
): ProductoViewModel {
  return {
    idProducto,
    nombre: `Producto ${idProducto}`,
    marca: "Marca",
    categoria,
    categoriaEtiqueta: categoria,
    imagen: null,
    precioCOP: 0,
    precioFormateado: "",
    disponible: true,
    rating: null,
    cantidadResenas: null,
    especificaciones: {
      pantalla: null,
      procesador: null,
      ram: null,
      almacenamiento: null,
      camaras: null,
      bateria: null,
    },
    datosFichaTecnica: {
      version_esquema: 1,
      variante: null,
      metricasComparables: metricas,
      benchmarks: [],
      fuentes: [],
      estado_verificacion: "parcial",
    },
    caracteristicas: [],
    textoBusqueda: "",
  };
}

describe("construirFilasComparacion con métricas técnicas", () => {
  it("incluye métricas comparables compartidas con la misma unidad", () => {
    const filas = construirFilasComparacion([
      producto(1, "moviles", [
        { clave: "ram", nombre: "RAM", grupo: "rendimiento", valor: 12, unidad: "GB", comparable: true },
      ]),
      producto(2, "moviles", [
        { clave: "ram", nombre: "Memoria RAM", grupo: "rendimiento", valor: 16, unidad: "GB", comparable: true },
      ]),
    ]);

    const ram = filas.find((fila) => fila.clave === "tecnica:ram");
    expect(ram?.valores).toEqual(["12 GB", "16 GB"]);
    expect(ram?.difiere).toBe(true);
  });

  it("no compara métricas cuando las unidades no coinciden", () => {
    const filas = construirFilasComparacion([
      producto(1, "moviles", [
        { clave: "pantalla", nombre: "Pantalla", grupo: "pantalla", valor: 6.8, unidad: "pulgadas", comparable: true },
      ]),
      producto(2, "moviles", [
        { clave: "pantalla", nombre: "Pantalla", grupo: "pantalla", valor: 172, unidad: "mm", comparable: true },
      ]),
    ]);

    expect(filas.some((fila) => fila.clave === "tecnica:pantalla")).toBe(false);
  });

  it("no compara métricas entre categorías diferentes", () => {
    const filas = construirFilasComparacion([
      producto(1, "moviles", [
        { clave: "ram", nombre: "RAM", grupo: "rendimiento", valor: 12, unidad: "GB", comparable: true },
      ]),
      producto(2, "laptops", [
        { clave: "ram", nombre: "RAM", grupo: "rendimiento", valor: 32, unidad: "GB", comparable: true },
      ]),
    ]);

    expect(filas.some((fila) => fila.clave === "tecnica:ram")).toBe(false);
  });

  it("ignora métricas no marcadas como comparables", () => {
    const filas = construirFilasComparacion([
      producto(1, "tablets", [
        { clave: "cpu", nombre: "CPU", grupo: "rendimiento", valor: "Chip A", comparable: false },
      ]),
      producto(2, "tablets", [
        { clave: "cpu", nombre: "CPU", grupo: "rendimiento", valor: "Chip B", comparable: false },
      ]),
    ]);

    expect(filas.some((fila) => fila.clave === "tecnica:cpu")).toBe(false);
  });
});
