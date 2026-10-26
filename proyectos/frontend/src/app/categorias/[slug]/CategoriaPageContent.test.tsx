// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import CategoriaPageContent from "./CategoriaPageContent";
import { ApiError } from "@/services/api";
import type { CategoriaResponse, MarcaResponse, Producto } from "@/types/producto";

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    obtenerCategorias: vi.fn(),
    obtenerMarcas: vi.fn(),
    obtenerProductosPorCategoria: vi.fn(),
  };
});

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

import {
  obtenerCategorias,
  obtenerMarcas,
  obtenerProductosPorCategoria,
} from "@/services/api";

const mockObtenerCategorias = vi.mocked(obtenerCategorias);
const mockObtenerMarcas = vi.mocked(obtenerMarcas);
const mockObtenerProductosPorCategoria = vi.mocked(obtenerProductosPorCategoria);

const CATEGORIAS: CategoriaResponse[] = [
  {
    idCategoria: 17,
    nombre: "Celulares",
    descripcion: "Teléfonos de última generación",
    estado: true,
  },
  {
    idCategoria: 28,
    nombre: "Tablets",
    descripcion: "Tabletas táctiles",
    estado: true,
  },
];

const MARCAS: MarcaResponse[] = [
  { idMarca: 2, nombre: "Samsung", descripcion: null, estado: true },
  { idMarca: 3, nombre: "Apple", descripcion: null, estado: true },
];

const PRODUCTOS_CELULARES: Producto[] = [
  {
    idProducto: 501,
    nombre: "Samsung Galaxy S25",
    descripcion: "Smartphone de gama alta",
    idCategoria: 17,
    idMarca: 2,
    imagen: null,
    precioReferencia: 4200000,
    estado: true,
  },
  {
    idProducto: 502,
    nombre: "Apple iPhone 16",
    descripcion: "Teléfono con chip A18",
    idCategoria: 17,
    idMarca: 3,
    imagen: null,
    precioReferencia: 3500000,
    estado: true,
  },
];

describe("Página de categoría (CategoriaPageContent)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockObtenerCategorias.mockResolvedValue(CATEGORIAS);
    mockObtenerMarcas.mockResolvedValue(MARCAS);
    mockObtenerProductosPorCategoria.mockImplementation((idCategoria) =>
      Promise.resolve(
        idCategoria === 17
          ? PRODUCTOS_CELULARES
          : idCategoria === 28
            ? []
            : [],
      ),
    );
  });

  afterEach(() => {
    cleanup();
  });

  it("muestra el estado de carga mientras consulta la categoría", () => {
    mockObtenerCategorias.mockImplementation(() => new Promise(() => {}));

    render(<CategoriaPageContent slug="celulares" />);

    expect(screen.getByText("Consultando productos de la categoría...")).toBeDefined();
  });

  it("resuelve la categoría por nombre y consulta solo su ID real", async () => {
    render(<CategoriaPageContent slug="celulares" />);

    await waitFor(() => {
      expect(screen.getByText("2 productos encontrados")).toBeDefined();
    });

    expect(mockObtenerProductosPorCategoria).toHaveBeenCalledTimes(1);
    expect(mockObtenerProductosPorCategoria).toHaveBeenCalledWith(17);
    expect(screen.getByRole("heading", { level: 1, name: "Celulares" })).toBeDefined();
    expect(screen.getByText("Teléfonos de última generación")).toBeDefined();
    expect(screen.getByText("Samsung Galaxy S25")).toBeDefined();
    expect(screen.getByText("Apple iPhone 16")).toBeDefined();
    expect(screen.getAllByText("Samsung").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Apple").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /Volver al catálogo/i }).length).toBeGreaterThan(0);
  });

  it("muestra un estado vacío cuando la categoría no tiene productos", async () => {
    render(<CategoriaPageContent slug="tablets" />);

    await waitFor(() => {
      expect(screen.getByText("0 productos encontrados")).toBeDefined();
    });

    expect(
      screen.getByText("Aún no hay productos registrados en esta categoría."),
    ).toBeDefined();
  });

  it("muestra el error y permite reintentar la consulta", async () => {
    mockObtenerProductosPorCategoria.mockRejectedValueOnce(
      new ApiError("No fue posible conectarse con el servidor.", 500),
    );

    render(<CategoriaPageContent slug="celulares" />);

    await waitFor(() => {
      expect(
        screen.getByText("No fue posible conectarse con el servidor."),
      ).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: /Reintentar/i }));

    await waitFor(() => {
      expect(screen.getByText("2 productos encontrados")).toBeDefined();
    });

    expect(
      screen.queryByText("No fue posible conectarse con el servidor."),
    ).toBeNull();
  });

  it("muestra 'Categoría no encontrada' si ninguna categoría real coincide con el slug", async () => {
    mockObtenerCategorias.mockResolvedValue([
      { idCategoria: 1, nombre: "Accesorios", descripcion: null, estado: true },
    ]);

    render(<CategoriaPageContent slug="celulares" />);

    await waitFor(() => {
      expect(screen.getByText("Categoría no encontrada")).toBeDefined();
    });

    expect(mockObtenerProductosPorCategoria).not.toHaveBeenCalled();
    expect(
      screen.getAllByRole("link", { name: /Volver al catálogo/i }).length,
    ).toBeGreaterThan(0);
  });

  it("filtra los productos por búsqueda sin salir de la categoría", async () => {
    render(<CategoriaPageContent slug="celulares" />);

    await waitFor(() => {
      expect(screen.getByText("2 productos encontrados")).toBeDefined();
    });

    const buscador = screen.getByLabelText("Buscar dentro de la categoría");
    fireEvent.change(buscador, { target: { value: "iPhone" } });

    expect(screen.getByText("Apple iPhone 16")).toBeDefined();
    expect(screen.queryByText("Samsung Galaxy S25")).toBeNull();
    expect(screen.getByText("1 producto encontrado")).toBeDefined();
  });

  it("ordena los productos por precio ascendente", async () => {
    render(<CategoriaPageContent slug="celulares" />);

    await waitFor(() => {
      expect(screen.getByText("2 productos encontrados")).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText("Ordenar productos"), {
      target: { value: "precio-asc" },
    });

    const tarjetas = screen.getAllByRole("article");
    expect(tarjetas[0].textContent).toContain("Apple iPhone 16");
    expect(tarjetas[1].textContent).toContain("Samsung Galaxy S25");
  });

  it("navega al detalle real al consultar la ficha de un producto", async () => {
    render(<CategoriaPageContent slug="celulares" />);

    await waitFor(() => {
      expect(screen.getByText("Samsung Galaxy S25")).toBeDefined();
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Consultar ficha técnica de Samsung Galaxy S25",
      }),
    );

    expect(mockPush).toHaveBeenCalledWith("/productos/501");
  });
});
