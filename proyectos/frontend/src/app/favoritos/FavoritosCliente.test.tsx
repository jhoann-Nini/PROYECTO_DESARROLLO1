// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
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

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

import {
  ApiError,
  obtenerCategorias,
  obtenerMarcas,
  obtenerProductos,
} from "@/services/api";
import { CLAVE_FAVORITOS } from "@/data/favoritos";
import FavoritosCliente from "./FavoritosCliente";

const mockProductos = vi.mocked(obtenerProductos);
const mockCategorias = vi.mocked(obtenerCategorias);
const mockMarcas = vi.mocked(obtenerMarcas);

const CATEGORIAS: CategoriaResponse[] = [
  { idCategoria: 1, nombre: "Móviles", descripcion: null, estado: true },
];

const MARCAS: MarcaResponse[] = [
  { idMarca: 1, nombre: "Samsung", descripcion: null, estado: true },
];

function crearProducto(id: number, nombre: string): Producto {
  return {
    idProducto: id,
    nombre,
    descripcion: `Descripción de ${nombre}`,
    idCategoria: 1,
    idMarca: 1,
    imagen: null,
    precioReferencia: 1_000_000 + id * 100_000,
    estado: true,
  };
}

const PRODUCTOS = [
  crearProducto(1, "Galaxy S25"),
  crearProducto(2, "iPhone 16"),
  crearProducto(3, "Pixel 10"),
];

function configurarExito() {
  mockProductos.mockResolvedValue(PRODUCTOS);
  mockCategorias.mockResolvedValue(CATEGORIAS);
  mockMarcas.mockResolvedValue(MARCAS);
}

describe("FavoritosCliente", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    configurarExito();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("muestra el estado vacío cuando no hay favoritos", async () => {
    render(<FavoritosCliente />);

    await waitFor(() => {
      expect(
        screen.getByText("Aún no tienes productos favoritos."),
      ).toBeDefined();
    });

    expect(
      screen
        .getByText("Aún no tienes productos favoritos.")
        .closest('[data-estado="vacio"]'),
    ).not.toBeNull();
    expect(
      screen.getByRole("link", { name: "Explorar catálogo" }),
    ).toBeDefined();
  });

  it("muestra solo los productos guardados y conserva el orden", async () => {
    localStorage.setItem(CLAVE_FAVORITOS, JSON.stringify([2, 1]));

    render(<FavoritosCliente />);

    await waitFor(() => {
      expect(screen.getByText("iPhone 16")).toBeDefined();
    });

    const tarjetas = screen.getAllByRole("article");
    expect(tarjetas).toHaveLength(2);
    expect(tarjetas[0].textContent).toContain("iPhone 16");
    expect(tarjetas[1].textContent).toContain("Galaxy S25");
    expect(screen.queryByText("Pixel 10")).toBeNull();
    expect(screen.getByText("2 productos en favoritos.")).toBeDefined();
  });

  it("permite quitar un favorito con el corazón de la tarjeta", async () => {
    localStorage.setItem(CLAVE_FAVORITOS, JSON.stringify([1]));

    render(<FavoritosCliente />);

    await waitFor(() => {
      expect(screen.getByText("Galaxy S25")).toBeDefined();
    });

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Quitar Galaxy S25 de favoritos",
      }),
    );

    await waitFor(() => {
      expect(
        screen.getByText("Aún no tienes productos favoritos."),
      ).toBeDefined();
    });
    expect(localStorage.getItem(CLAVE_FAVORITOS)).toBeNull();
  });

  it("vacía la lista completa", async () => {
    localStorage.setItem(CLAVE_FAVORITOS, JSON.stringify([1, 2]));

    render(<FavoritosCliente />);

    await waitFor(() => {
      expect(screen.getByText("2 productos en favoritos.")).toBeDefined();
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Vaciar favoritos" }),
    );

    await waitFor(() => {
      expect(screen.getByText("Se vaciaron tus favoritos.")).toBeDefined();
    });
    expect(
      screen.getByText("Aún no tienes productos favoritos."),
    ).toBeDefined();
  });

  it("muestra el error y permite reintentar", async () => {
    mockProductos.mockRejectedValueOnce(
      new ApiError("No fue posible conectarse con el servidor.", 500),
    );

    render(<FavoritosCliente />);

    const alerta = await screen.findByRole("alert");
    expect(alerta.getAttribute("data-estado")).toBe("error");
    expect(alerta.textContent).toContain("No pudimos cargar tus favoritos");

    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    await waitFor(() => {
      expect(
        screen.getByText("Aún no tienes productos favoritos."),
      ).toBeDefined();
    });
  });
});
