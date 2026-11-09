import { describe, expect, it } from "vitest";
import type { Producto } from "@/types/producto";
import { crearProductoViewModel } from "./productoViewModel";
import {
  filtrarFavoritos,
  opcionesCategoriaFavoritos,
  ordenarFavoritos,
} from "./favoritosCatalogo";

function producto(
  idProducto: number,
  nombre: string,
  idCategoria: number,
  precioReferencia: number,
): Producto {
  return {
    idProducto,
    nombre,
    descripcion: null,
    idCategoria,
    idMarca: 1,
    imagen: null,
    precioReferencia,
    estado: true,
  };
}

const GALAXY = crearProductoViewModel(
  producto(1, "Galaxy S25", 1, 1_100_000),
  { rating: 3.5, cantidadResenas: 10 },
);
const IPHONE = crearProductoViewModel(
  producto(2, "iPhone 16", 1, 1_200_000),
  { rating: 4.8, cantidadResenas: 40 },
);
const IPAD = crearProductoViewModel(
  producto(3, "iPad Air", 3, 1_400_000),
);

const PRODUCTOS = [GALAXY, IPHONE, IPAD];

describe("favoritosCatalogo", () => {
  it("filtra por categoría y conserva todos con el valor todas", () => {
    expect(filtrarFavoritos(PRODUCTOS, "todas")).toEqual(PRODUCTOS);
    expect(filtrarFavoritos(PRODUCTOS, "tablets")).toEqual([IPAD]);
    expect(filtrarFavoritos(PRODUCTOS, "laptops")).toEqual([]);
  });

  it("ofrece las cuatro categorías del catálogo con su conteo", () => {
    const opciones = opcionesCategoriaFavoritos(PRODUCTOS);

    expect(opciones).toHaveLength(4);
    expect(opciones.find((opcion) => opcion.valor === "moviles")).toEqual(
      expect.objectContaining({ etiqueta: "Móviles", cantidad: 2 }),
    );
    expect(opciones.find((opcion) => opcion.valor === "tablets")).toEqual(
      expect.objectContaining({ etiqueta: "Tablets", cantidad: 1 }),
    );
    expect(opciones.find((opcion) => opcion.valor === "laptops")).toEqual(
      expect.objectContaining({ etiqueta: "Laptops / PCs", cantidad: 0 }),
    );
  });

  it("ordena con la misma lógica del catálogo sin mutar la entrada", () => {
    const original = [...PRODUCTOS];

    expect(
      ordenarFavoritos(PRODUCTOS, "menor-precio").map(
        (producto) => producto.idProducto,
      ),
    ).toEqual([1, 2, 3]);
    expect(
      ordenarFavoritos(PRODUCTOS, "mayor-precio").map(
        (producto) => producto.idProducto,
      ),
    ).toEqual([3, 2, 1]);
    expect(
      ordenarFavoritos(PRODUCTOS, "mejor-valorados").map(
        (producto) => producto.idProducto,
      ),
    ).toEqual([2, 1, 3]);
    expect(PRODUCTOS).toEqual(original);
  });
});
