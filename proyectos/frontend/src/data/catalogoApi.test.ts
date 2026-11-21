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

describe("construirCatalogo con resumen de ofertas (Fase 4, H-04)", () => {
  it("toma las tiendas y el menor precio del resumen del backend", () => {
    const [con, sin] = construirCatalogo({
      productos: [producto({ idProducto: 1 }), producto({ idProducto: 2 })],
      categorias,
      marcas,
      resumenOfertas: [
        { idProducto: 1, tiendasDisponibles: 3, menorPrecio: 4_200_000, fechaActualizacionMasReciente: "2026-11-18T10:00:00" },
      ],
    });
    expect(con.disponibilidadConsultada).toBe(true);
    expect(con.numeroTiendas).toBe(3);
    expect(con.precioDesdeCOP).toBe(4_200_000);
    expect(con.fechaPrecioTiendas).toBe("2026-11-18T10:00:00");
    // Un producto ausente del resumen no tiene ofertas disponibles.
    expect(sin.disponibilidadConsultada).toBe(true);
    expect(sin.numeroTiendas).toBe(0);
    expect(sin.precioDesdeCOP).toBeNull();
  });

  it("sin resumen, la disponibilidad queda sin confirmar y no usa el JSON heredado", () => {
    const [vista] = construirCatalogo({
      productos: [producto({ caracteristicas: { tiendas: [{ nombre: "Vieja", precio: 100 }] } })],
      categorias,
      marcas,
    });
    expect(vista.disponibilidadConsultada).toBe(false);
    expect(vista.numeroTiendas).toBe(0);
    expect(vista.precioDesdeCOP).toBeNull();
  });
});

