// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
import CatalogoCliente from "./CatalogoCliente";

const mockProductos = vi.mocked(obtenerProductos);
const mockCategorias = vi.mocked(obtenerCategorias);
const mockMarcas = vi.mocked(obtenerMarcas);

const categorias: CategoriaResponse[] = [
  { idCategoria: 1, nombre: "Móviles", descripcion: null, estado: true },
  { idCategoria: 2, nombre: "Laptops / PCs", descripcion: null, estado: true },
];

const marcas: MarcaResponse[] = [
  { idMarca: 1, nombre: "Samsung", descripcion: null, estado: true },
  { idMarca: 2, nombre: "Dell", descripcion: null, estado: true },
];

function crearProducto(
  idProducto: number,
  overrides: Partial<Producto> = {}
): Producto {
  return {
    idProducto,
    nombre: `Producto ${idProducto}`,
    descripcion: "Descripción de prueba",
    idCategoria: 1,
    idMarca: 1,
    imagen: null,
    precioReferencia: 1_000_000 + idProducto * 100_000,
    estado: true,
    ...overrides,
  };
}

function configurarExito(productos: Producto[]) {
  mockProductos.mockResolvedValue(productos);
  mockCategorias.mockResolvedValue(categorias);
  mockMarcas.mockResolvedValue(marcas);
}

describe("CatalogoCliente", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("muestra el estado de carga", () => {
    mockProductos.mockImplementation(() => new Promise(() => {}));
    mockCategorias.mockImplementation(() => new Promise(() => {}));
    mockMarcas.mockImplementation(() => new Promise(() => {}));

    render(<CatalogoCliente />);

    expect(screen.getByText(/Cargando catálogo/i)).toBeDefined();
  });

  it("muestra un error accesible si la API falla", async () => {
    mockProductos.mockRejectedValue(
      new ApiError("No fue posible conectarse con el servidor.", 0)
    );
    mockCategorias.mockResolvedValue(categorias);
    mockMarcas.mockResolvedValue(marcas);

    render(<CatalogoCliente />);

    const alerta = await screen.findByRole("alert");
    expect(alerta.getAttribute("data-estado")).toBe("error");
    expect(alerta.textContent).toContain(
      "No fue posible conectarse con el servidor."
    );
    expect(
      screen.getByRole("button", { name: "Reintentar" })
    ).toBeDefined();
  });

  it("permite reintentar la carga del catálogo tras un error de red", async () => {
    mockProductos.mockRejectedValueOnce(
      new ApiError("No fue posible conectarse con el servidor.", 0)
    );
    mockCategorias.mockResolvedValue(categorias);
    mockMarcas.mockResolvedValue(marcas);

    render(<CatalogoCliente />);

    await screen.findByRole("alert");
    mockProductos.mockResolvedValue([crearProducto(1)]);
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    await waitFor(() => {
      expect(screen.getByText("Producto 1")).toBeDefined();
    });
  });

  it("muestra el total y las tarjetas con datos enriquecidos", async () => {
    configurarExito([crearProducto(1), crearProducto(2)]);

    render(<CatalogoCliente />);

    await waitFor(() => {
      expect(screen.getByText(/2 productos/)).toBeDefined();
    });

    expect(screen.getByText("Producto 1")).toBeDefined();
    expect(screen.getAllByText("Samsung").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Móviles/).length).toBeGreaterThan(0);
  });

  it("incluye productos sin precio y no muestra chip de precio al cargar", async () => {
    configurarExito([
      crearProducto(1),
      crearProducto(2, {
        nombre: "Producto sin precio",
        precioReferencia: null,
      }),
    ]);

    render(<CatalogoCliente />);

    await waitFor(() => {
      expect(screen.getByText(/2 productos/)).toBeDefined();
    });

    expect(screen.getByText("Producto sin precio")).toBeDefined();
    expect(screen.getByText("Consultar disponibilidad")).toBeDefined();
    expect(
      screen.queryAllByRole("button", { name: /^Quitar filtro \$/ })
    ).toHaveLength(0);
  });

  it("filtra por categoría y vuelve a la página 1", async () => {
    const productos = Array.from({ length: 13 }, (_, indice) =>
      crearProducto(indice + 1)
    );
    productos.push(
      crearProducto(99, {
        nombre: "Dell XPS 13",
        idCategoria: 2,
        idMarca: 2,
      })
    );
    configurarExito(productos);

    render(<CatalogoCliente />);

    await waitFor(() => {
      expect(screen.getByText(/14 productos/)).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByText(/Página 2 de 2/)).toBeDefined();

    fireEvent.click(screen.getByRole("checkbox", { name: /Laptops \/ PCs/i }));

    expect(screen.getByText(/Página 1 de 1/)).toBeDefined();
    expect(screen.getByText("Dell XPS 13")).toBeDefined();
  });

  it("limpia todos los filtros", async () => {
    configurarExito([crearProducto(1)]);

    render(<CatalogoCliente />);

    await waitFor(() => {
      expect(screen.getByText(/1 producto/)).toBeDefined();
    });

    fireEvent.change(
      screen.getByRole("searchbox", {
        name: /Buscar dispositivos tecnológicos/i,
      }),
      { target: { value: "inexistente" } }
    );

    expect(
      await screen.findByText(/No encontramos productos con esos filtros/i)
    ).toBeDefined();

    fireEvent.click(
      screen.getAllByRole("button", { name: /Limpiar filtros/i })[0]
    );

    expect(screen.getByText("Producto 1")).toBeDefined();
  });

  it("muestra el estado vacío cuando no hay coincidencias", async () => {
    configurarExito([crearProducto(1)]);

    render(<CatalogoCliente />);

    await waitFor(() => {
      expect(screen.getByText("Producto 1")).toBeDefined();
    });

    fireEvent.change(
      screen.getByRole("searchbox", {
        name: /Buscar dispositivos tecnológicos/i,
      }),
      { target: { value: "zzzz" } }
    );

    const vacio = await screen.findByRole("status");
    expect(vacio.getAttribute("data-estado")).toBe("vacio");
    expect(vacio.textContent).toContain(
      "No encontramos productos con esos filtros"
    );
  });

  it("pagina los resultados de 12 en 12", async () => {
    configurarExito(
      Array.from({ length: 13 }, (_, indice) => crearProducto(indice + 1))
    );

    render(<CatalogoCliente />);

    await waitFor(() => {
      expect(screen.getByText(/13 productos/)).toBeDefined();
    });

    expect(screen.getByText("Producto 1")).toBeDefined();
    expect(screen.queryByText("Producto 13")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(screen.getByText("Producto 13")).toBeDefined();
    expect(screen.queryByText("Producto 1")).toBeNull();
  });

  it("ordena por menor precio desde la barra de herramientas", async () => {
    configurarExito([
      crearProducto(1, { nombre: "Caro", precioReferencia: 3_000_000 }),
      crearProducto(2, { nombre: "Barato", precioReferencia: 1_000_000 }),
      crearProducto(3, { nombre: "Medio", precioReferencia: 2_000_000 }),
    ]);

    render(<CatalogoCliente />);

    await waitFor(() => {
      expect(screen.getByText(/3 productos/)).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText("Ordenar por"), {
      target: { value: "menor-precio" },
    });

    expect(
      screen
        .getAllByRole("heading", { level: 3 })
        .map((titulo) => titulo.textContent)
    ).toEqual(["Barato", "Medio", "Caro"]);
  });

  it("vuelve a la página 1 al cambiar el orden", async () => {
    configurarExito(
      Array.from({ length: 13 }, (_, indice) => crearProducto(indice + 1))
    );

    render(<CatalogoCliente />);

    await waitFor(() => {
      expect(screen.getByText(/13 productos/)).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByText(/Página 2 de 2/)).toBeDefined();

    fireEvent.change(screen.getByLabelText("Ordenar por"), {
      target: { value: "mayor-precio" },
    });

    expect(screen.getByText(/Página 1 de 2/)).toBeDefined();
    expect(screen.getByText("Producto 13")).toBeDefined();
    expect(screen.queryByText("Producto 1")).toBeNull();
  });

  it("mantiene el orden original en Mejor valorados sin calificaciones agregadas", async () => {
    configurarExito([crearProducto(1), crearProducto(2)]);

    render(<CatalogoCliente />);

    await waitFor(() => {
      expect(screen.getByText(/2 productos/)).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText("Ordenar por"), {
      target: { value: "mejor-valorados" },
    });

    expect(
      screen
        .getAllByRole("heading", { level: 3 })
        .map((titulo) => titulo.textContent)
    ).toEqual(["Producto 1", "Producto 2"]);
  });

  it("abre el cajón de filtros y lo cierra con 'Ver resultados'", async () => {
    configurarExito([crearProducto(1)]);

    render(<CatalogoCliente />);

    await waitFor(() => {
      expect(screen.getByText("Producto 1")).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "Filtros" }));

    const dialogo = screen.getByRole("dialog", {
      name: "Filtros del catálogo",
    });
    expect(dialogo).toBeDefined();

    fireEvent.click(
      within(dialogo).getByRole("button", { name: "Ver resultados" })
    );

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("devuelve el foco al botón Filtros al cerrar el cajón", async () => {
    configurarExito([crearProducto(1)]);

    render(<CatalogoCliente />);

    await waitFor(() => {
      expect(screen.getByText("Producto 1")).toBeDefined();
    });

    const botonFiltros = screen.getByRole("button", { name: "Filtros" });
    fireEvent.click(botonFiltros);
    expect(screen.getByRole("dialog")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Cerrar filtros" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(botonFiltros);
  });

  it("cierra el cajón con Escape y devuelve el foco", async () => {
    configurarExito([crearProducto(1)]);

    render(<CatalogoCliente />);

    await waitFor(() => {
      expect(screen.getByText("Producto 1")).toBeDefined();
    });

    const botonFiltros = screen.getByRole("button", { name: "Filtros" });
    fireEvent.click(botonFiltros);
    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(botonFiltros);
  });

  it("aplica el precio mínimo escrito a mano", async () => {
    configurarExito([
      crearProducto(1, { nombre: "Económico", precioReferencia: 1_000_000 }),
      crearProducto(2, { nombre: "Medio", precioReferencia: 2_000_000 }),
      crearProducto(3, { nombre: "Premium", precioReferencia: 3_000_000 }),
    ]);

    render(<CatalogoCliente />);

    await waitFor(() => {
      expect(screen.getByText(/3 productos/)).toBeDefined();
    });

    const minimo = screen.getByLabelText("Precio mínimo en pesos");
    fireEvent.change(minimo, { target: { value: "2000000" } });
    fireEvent.blur(minimo);

    expect(screen.getByText(/2 productos/)).toBeDefined();
    expect(screen.queryByText("Económico")).toBeNull();
    expect(screen.getByText("Medio")).toBeDefined();
    expect(screen.getByText("Premium")).toBeDefined();
  });

  it("filtra las marcas con el buscador del panel", async () => {
    configurarExito([
      crearProducto(1),
      crearProducto(2, {
        nombre: "Dell XPS 13",
        idCategoria: 2,
        idMarca: 2,
      }),
    ]);

    render(<CatalogoCliente />);

    await waitFor(() => {
      expect(screen.getByText("Dell XPS 13")).toBeDefined();
    });

    fireEvent.change(
      screen.getByRole("searchbox", { name: "Buscar marcas" }),
      { target: { value: "dell" } }
    );

    expect(screen.getByRole("checkbox", { name: /Dell/i })).toBeDefined();
    expect(screen.queryByRole("checkbox", { name: /Samsung/i })).toBeNull();
  });

  it("navega al detalle real al pulsar Ver detalle", async () => {
    configurarExito([crearProducto(7)]);

    render(<CatalogoCliente />);

    await waitFor(() => {
      expect(screen.getByText("Producto 7")).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "Ver detalle" }));

    expect(mockPush).toHaveBeenCalledWith("/productos/7");
  });
});
