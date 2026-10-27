// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type {
  CategoriaResponse,
  MarcaResponse,
  Producto,
} from "@/types/producto";

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    obtenerProductos: vi.fn(),
    obtenerCategorias: vi.fn(),
    obtenerMarcas: vi.fn(),
  };
});

import {
  ApiError,
  obtenerCategorias,
  obtenerMarcas,
  obtenerProductos,
} from "@/services/api";
import { CLAVE_COMPARADOR } from "@/data/comparador";
import ComparadorCliente from "./ComparadorCliente";

const mockProductos = vi.mocked(obtenerProductos);
const mockCategorias = vi.mocked(obtenerCategorias);
const mockMarcas = vi.mocked(obtenerMarcas);

const CATEGORIAS: CategoriaResponse[] = [
  { idCategoria: 1, nombre: "Móviles", descripcion: null, estado: true },
];

const MARCAS: MarcaResponse[] = [
  { idMarca: 1, nombre: "Samsung", descripcion: null, estado: true },
];

function crearProducto(
  idProducto: number,
  overrides: Partial<Producto> = {},
): Producto {
  return {
    idProducto,
    nombre: `Producto ${idProducto}`,
    descripcion: `Descripción del producto ${idProducto}`,
    idCategoria: 1,
    idMarca: 1,
    imagen: null,
    precioReferencia: 1_000_000 + idProducto * 100_000,
    estado: true,
    caracteristicas: {
      pantalla: `Pantalla ${idProducto}`,
      procesador: "Snapdragon 8",
      ram: "12 GB",
    },
    ...overrides,
  };
}

function configurarExito(productos: Producto[]) {
  mockProductos.mockResolvedValue(productos);
  mockCategorias.mockResolvedValue(CATEGORIAS);
  mockMarcas.mockResolvedValue(MARCAS);
}

function seleccionarEnStorage(ids: number[]) {
  localStorage.setItem(CLAVE_COMPARADOR, JSON.stringify(ids));
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("ComparadorCliente", () => {
  it("muestra el estado de carga", () => {
    mockProductos.mockImplementation(() => new Promise(() => {}));
    mockCategorias.mockImplementation(() => new Promise(() => {}));
    mockMarcas.mockImplementation(() => new Promise(() => {}));

    render(<ComparadorCliente />);

    expect(
      screen.getByText("Cargando catálogo para el comparador…"),
    ).toBeDefined();
  });

  it("muestra el estado vacío y el selector cuando no hay productos elegidos", async () => {
    configurarExito([crearProducto(1)]);

    render(<ComparadorCliente />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          level: 1,
          name: "Comparador de productos",
        }),
      ).toBeDefined();
    });

    expect(
      screen.getByText("Aún no has agregado productos al comparador."),
    ).toBeDefined();
    expect(
      screen.getByLabelText("Buscar productos para comparar"),
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Agregar Producto 1 al comparador" }),
    ).toBeDefined();
  });

  it("agrega un producto desde el selector y lo muestra en la tabla", async () => {
    configurarExito([crearProducto(1), crearProducto(2)]);

    render(<ComparadorCliente />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: "Agregar Producto 1 al comparador",
        }),
      ).toBeDefined();
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Agregar Producto 1 al comparador",
      }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("table", { name: "Comparación de productos" }),
      ).toBeDefined();
    });

    const tabla = screen.getByRole("table", {
      name: "Comparación de productos",
    });
    expect(within(tabla).getByRole("link", { name: "Producto 1" })).toBeDefined();
    expect(JSON.parse(localStorage.getItem(CLAVE_COMPARADOR) ?? "[]")).toEqual([
      1,
    ]);
  });

  it("impide superar 4 productos y avisa del límite", async () => {
    configurarExito([
      crearProducto(1),
      crearProducto(2),
      crearProducto(3),
      crearProducto(4),
      crearProducto(5),
    ]);
    seleccionarEnStorage([1, 2, 3, 4]);

    render(<ComparadorCliente />);

    await waitFor(() => {
      expect(
        screen.getByText(
          "El comparador admite hasta 4 productos. Quita uno para agregar otro.",
        ),
      ).toBeDefined();
    });

    const boton = screen.getByRole("button", {
      name: "Agregar Producto 5 al comparador",
    }) as HTMLButtonElement;
    expect(boton.disabled).toBe(true);
    expect(JSON.parse(localStorage.getItem(CLAVE_COMPARADOR) ?? "[]")).toEqual([
      1, 2, 3, 4,
    ]);
  });

  it("quita un producto de la tabla", async () => {
    configurarExito([crearProducto(1), crearProducto(2)]);
    seleccionarEnStorage([1, 2]);

    render(<ComparadorCliente />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: "Quitar Producto 1 del comparador",
        }),
      ).toBeDefined();
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Quitar Producto 1 del comparador",
      }),
    );

    await waitFor(() => {
      const tabla = screen.getByRole("table", {
        name: "Comparación de productos",
      });
      expect(
        within(tabla).queryByRole("link", { name: "Producto 1" }),
      ).toBeNull();
      expect(
        within(tabla).getByRole("link", { name: "Producto 2" }),
      ).toBeDefined();
    });

    expect(JSON.parse(localStorage.getItem(CLAVE_COMPARADOR) ?? "[]")).toEqual([
      2,
    ]);
  });

  it("marca las diferencias y permite ocultar las filas iguales", async () => {
    configurarExito([crearProducto(1), crearProducto(2)]);
    seleccionarEnStorage([1, 2]);

    render(<ComparadorCliente />);

    await waitFor(() => {
      expect(screen.getAllByText("Distinto").length).toBeGreaterThan(0);
    });

    expect(
      screen.getByRole("rowheader", { name: /Marca/ }),
    ).toBeDefined();
    expect(
      screen.getByRole("rowheader", { name: /Precio de referencia/ }),
    ).toBeDefined();

    fireEvent.click(
      screen.getByRole("checkbox", { name: "Solo diferencias" }),
    );

    expect(screen.queryByRole("rowheader", { name: /Marca/ })).toBeNull();
    expect(screen.queryByRole("rowheader", { name: /Categoría/ })).toBeNull();
    expect(
      screen.getByRole("rowheader", { name: /Precio de referencia/ }),
    ).toBeDefined();
    expect(screen.getByRole("rowheader", { name: /Pantalla/ })).toBeDefined();
  });

  it("muestra la recomendación derivada y su carácter informativo", async () => {
    configurarExito([crearProducto(1), crearProducto(2)]);
    seleccionarEnStorage([1, 2]);

    render(<ComparadorCliente />);

    await waitFor(() => {
      expect(
        screen.getByRole("region", { name: "Sugerencia del comparador" }),
      ).toBeDefined();
    });

    const recomendacion = screen.getByRole("region", {
      name: "Sugerencia del comparador",
    });
    expect(within(recomendacion).getByText("Producto 1")).toBeDefined();
    expect(
      within(recomendacion).getByText(/Su precio de referencia es el más bajo/i),
    ).toBeDefined();
    expect(
      within(recomendacion).getByText(/No es una calificación editorial/i),
    ).toBeDefined();
  });

  it("muestra un estado de error si el catálogo no carga y permite reintentar", async () => {
    mockProductos.mockRejectedValue(
      new ApiError("Servicio de catálogo no disponible", 500),
    );
    mockCategorias.mockResolvedValue(CATEGORIAS);
    mockMarcas.mockResolvedValue(MARCAS);

    render(<ComparadorCliente />);

    await waitFor(() => {
      expect(
        screen.getByText("No pudimos cargar el catálogo"),
      ).toBeDefined();
    });
    expect(screen.getByText("Servicio de catálogo no disponible")).toBeDefined();

    mockProductos.mockResolvedValue([crearProducto(1)]);
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: "Agregar Producto 1 al comparador",
        }),
      ).toBeDefined();
    });
  });
});
