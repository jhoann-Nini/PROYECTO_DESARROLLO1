import { describe, expect, it } from "vitest";
import type { ProductoMejorValorado } from "@/types/producto";
import type { ProductoViewModel } from "./productoViewModel";
import { MAX_DESTACADOS, seleccionarDestacados } from "./destacados";

function crearVista(
  idProducto: number,
  overrides: Partial<ProductoViewModel> = {},
): ProductoViewModel {
  return {
    idProducto,
    nombre: `Producto ${idProducto}`,
    marca: "Marca",
    categoria: "moviles",
    categoriaEtiqueta: "Móviles",
    imagen: null,
    precioCOP: 1_000_000,
    precioFormateado: "$ 1.000.000 COP",
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
    caracteristicas: [],
    textoBusqueda: `producto ${idProducto}`,
    ...overrides,
  };
}

function crearValorado(
  idProducto: number,
  posicionRanking: number,
): ProductoMejorValorado {
  return {
    idProducto,
    nombre: `Producto ${idProducto}`,
    descripcion: null,
    idCategoria: 1,
    idMarca: 1,
    imagen: null,
    precioReferencia: 1_000_000,
    promedioPuntuacion: 4.5,
    cantidadValoraciones: 10,
    posicionRanking,
  };
}

describe("seleccionarDestacados", () => {
  it("devuelve como máximo seis productos", () => {
    const productos = Array.from({ length: 8 }, (_, indice) =>
      crearVista(indice + 1),
    );
    const valorados = productos.map((producto, indice) =>
      crearValorado(producto.idProducto, indice + 1),
    );

    const resultado = seleccionarDestacados(productos, valorados);

    expect(resultado).toHaveLength(MAX_DESTACADOS);
    expect(resultado.map((producto) => producto.idProducto)).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
  });

  it("ordena los destacados por posición real del ranking", () => {
    const productos = [crearVista(1), crearVista(2), crearVista(3)];
    const valorados = [
      crearValorado(3, 3),
      crearValorado(1, 1),
      crearValorado(2, 2),
    ];

    const resultado = seleccionarDestacados(productos, valorados);

    expect(resultado.map((producto) => producto.idProducto)).toEqual([1, 2, 3]);
  });

  it("ignora rankings de productos que no están en el catálogo recibido", () => {
    const productos = [crearVista(1), crearVista(2)];
    const valorados = [crearValorado(99, 1), crearValorado(2, 2)];

    const resultado = seleccionarDestacados(productos, valorados);

    expect(resultado.map((producto) => producto.idProducto)).toEqual([2]);
  });

  it("no repite productos aunque el ranking traiga duplicados", () => {
    const productos = [crearVista(1), crearVista(2)];
    const valorados = [
      crearValorado(1, 1),
      crearValorado(1, 2),
      crearValorado(2, 3),
    ];

    const resultado = seleccionarDestacados(productos, valorados);

    expect(resultado.map((producto) => producto.idProducto)).toEqual([1, 2]);
  });

  it("adjunta la posición real del ranking a los destacados", () => {
    const productos = [crearVista(1), crearVista(2)];
    const valorados = [crearValorado(2, 1), crearValorado(1, 2)];

    const resultado = seleccionarDestacados(productos, valorados);

    expect(resultado.map((producto) => producto.idProducto)).toEqual([2, 1]);
    expect(resultado[0].posicionRanking).toBe(1);
    expect(resultado[1].posicionRanking).toBe(2);
  });

  it("cae a los primeros seis del catálogo cuando no hay valoraciones", () => {
    const productos = Array.from({ length: 8 }, (_, indice) =>
      crearVista(indice + 1),
    );

    const resultado = seleccionarDestacados(productos, []);

    expect(resultado.map((producto) => producto.idProducto)).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
  });

  it("cae a los primeros seis si las valoraciones no coinciden con el catálogo", () => {
    const productos = [crearVista(1), crearVista(2), crearVista(3)];
    const valorados = [crearValorado(90, 1), crearValorado(91, 2)];

    const resultado = seleccionarDestacados(productos, valorados);

    expect(resultado.map((producto) => producto.idProducto)).toEqual([1, 2, 3]);
  });
});
