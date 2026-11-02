import { describe, expect, it } from "vitest";
import type {
  CategoriaResponse,
  MarcaResponse,
  Producto,
} from "@/types/producto";
import { construirCatalogo } from "./catalogoApi";

const marcas: MarcaResponse[] = [
  { idMarca: 1, nombre: "Samsung", descripcion: null, estado: true },
  { idMarca: 10, nombre: "Apple", descripcion: null, estado: true },
];

const categorias: CategoriaResponse[] = [
  { idCategoria: 1, nombre: "Móviles", descripcion: null, estado: true },
  { idCategoria: 2, nombre: "Laptops / PCs", descripcion: null, estado: true },
];

function producto(overrides: Partial<Producto> = {}): Producto {
  return {
    idProducto: 1,
    nombre: "Samsung Galaxy Book 4",
    descripcion: "Portátil ligero",
    idCategoria: 2,
    idMarca: 1,
    imagen: null,
    precioReferencia: 4_500_000,
    estado: true,
    ...overrides,
  };
}

describe("construirCatalogo", () => {
  it("enriquece la marca desde /api/marcas", () => {
    const [vista] = construirCatalogo({
      productos: [producto()],
      categorias,
      marcas,
    });

    expect(vista.marca).toBe("Samsung");
  });

  it("enriquece la categoría en el texto de búsqueda", () => {
    const [vista] = construirCatalogo({
      productos: [producto()],
      categorias,
      marcas,
    });

    expect(vista.categoria).toBe("laptops");
    expect(vista.textoBusqueda).toContain("laptops / pcs");
  });

  it("usa Marca #id cuando el id de marca no existe", () => {
    const [vista] = construirCatalogo({
      productos: [producto({ idMarca: 99 })],
      categorias,
      marcas,
    });

    expect(vista.marca).toBe("Marca #99");
  });

  it("tolera listas vacías y conserva el orden", () => {
    expect(
      construirCatalogo({ productos: [], categorias: [], marcas: [] })
    ).toEqual([]);

    const vistas = construirCatalogo({
      productos: [
        producto({ idProducto: 5, idMarca: 10, nombre: "MacBook Air" }),
        producto({ idProducto: 2, idMarca: 1, nombre: "Galaxy Book" }),
      ],
      categorias,
      marcas,
    });

    expect(vistas.map((vista) => vista.idProducto)).toEqual([5, 2]);
    expect(vistas[0].marca).toBe("Apple");
  });
});
