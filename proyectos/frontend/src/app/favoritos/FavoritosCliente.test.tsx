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
  UsuarioSesion,
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

const sesionMock = vi.hoisted(() => ({
  usuario: null as UsuarioSesion | null,
  cargando: false,
  error: null as string | null,
  establecerUsuario: vi.fn(),
  limpiarError: vi.fn(),
  cerrarSesion: vi.fn(),
  reintentar: vi.fn(),
}));

vi.mock("@/hooks/useSesionTecReview", () => ({
  useSesionTecReview: () => sesionMock,
}));

vi.mock("@/components/AuthModal", () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div role="dialog" aria-label="Autenticación" /> : null,
}));

const authMock = vi.hoisted(() => ({
  sesion: { user: { id: "user-1" } } as { user: { id: string } } | null,
  observadores: [] as Array<
    (evento: string, sesion: { user: { id: string } } | null) => void
  >,
  unsubscribe: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: async () => ({
        data: { session: authMock.sesion },
        error: null,
      }),
      onAuthStateChange: (
        callback: (
          evento: string,
          sesion: { user: { id: string } } | null,
        ) => void,
      ) => {
        authMock.observadores.push(callback);
        return {
          data: { subscription: { unsubscribe: authMock.unsubscribe } },
        };
      },
    },
  }),
}));

import {
  ApiError,
  obtenerCategorias,
  obtenerMarcas,
  obtenerProductos,
} from "@/services/api";
import { CLAVE_FAVORITOS, claveFavoritos } from "@/data/favoritos";
import FavoritosCliente from "./FavoritosCliente";

const CLAVE_USUARIO = claveFavoritos("user-1");

const USUARIO: UsuarioSesion = {
  id: "user-1",
  nombre: "Ana Torres",
  usuario: "ana",
  email: "ana@tecreview.com",
};

const mockProductos = vi.mocked(obtenerProductos);
const mockCategorias = vi.mocked(obtenerCategorias);
const mockMarcas = vi.mocked(obtenerMarcas);

const CATEGORIAS: CategoriaResponse[] = [
  { idCategoria: 1, nombre: "Móviles", descripcion: null, estado: true },
  { idCategoria: 2, nombre: "Laptops / PCs", descripcion: null, estado: true },
  { idCategoria: 3, nombre: "Tablets", descripcion: null, estado: true },
];

const MARCAS: MarcaResponse[] = [
  { idMarca: 1, nombre: "Samsung", descripcion: null, estado: true },
];

function crearProducto(
  id: number,
  nombre: string,
  idCategoria = 1,
): Producto {
  return {
    idProducto: id,
    nombre,
    descripcion: `Descripción de ${nombre}`,
    idCategoria,
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
  crearProducto(4, "iPad Air", 3),
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
    sesionMock.usuario = USUARIO;
    sesionMock.cargando = false;
    sesionMock.error = null;
    authMock.sesion = { user: { id: "user-1" } };
    authMock.observadores.length = 0;
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

  it("exige sesión y aclara que los favoritos no se sincronizan entre dispositivos", async () => {
    render(<FavoritosCliente />);

    await waitFor(() => {
      expect(
        screen.getByText("Aún no tienes productos favoritos."),
      ).toBeDefined();
    });

    expect(
      screen.getByText(
        /solo puedes ver y administrar tus favoritos con la sesión iniciada/i,
      ),
    ).toBeDefined();
    expect(
      screen.getByText(/no se sincronizan entre dispositivos/i),
    ).toBeDefined();
  });

  it("no muestra favoritos sin sesión y no consulta el catálogo", async () => {
    sesionMock.usuario = null;
    authMock.sesion = null;
    localStorage.setItem(CLAVE_FAVORITOS, JSON.stringify([2]));

    render(<FavoritosCliente />);

    expect(
      await screen.findByRole("heading", {
        name: "Inicia sesión para ver tus favoritos",
      }),
    ).toBeDefined();
    expect(screen.queryByText("iPhone 16")).toBeNull();
    expect(mockProductos).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(localStorage.getItem(CLAVE_FAVORITOS)).toBeNull();
    });

    fireEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));
    expect(screen.getByRole("dialog")).toBeDefined();
  });

  it("muestra solo los productos guardados y conserva el orden", async () => {
    localStorage.setItem(CLAVE_USUARIO, JSON.stringify([2, 1]));

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
    localStorage.setItem(CLAVE_USUARIO, JSON.stringify([1]));

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
    expect(localStorage.getItem(CLAVE_USUARIO)).toBeNull();
  });

  it("vacía la lista completa", async () => {
    localStorage.setItem(CLAVE_USUARIO, JSON.stringify([1, 2]));

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

  it("filtra los favoritos por categoría", async () => {
    localStorage.setItem(CLAVE_USUARIO, JSON.stringify([1, 4]));

    render(<FavoritosCliente />);

    await waitFor(() => {
      expect(screen.getByText("iPad Air")).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText("Filtrar por categoría"), {
      target: { value: "tablets" },
    });

    expect(screen.queryByText("Galaxy S25")).toBeNull();
    expect(screen.getByText("iPad Air")).toBeDefined();
  });

  it("ordena los favoritos por precio sin cambiar la selección guardada", async () => {
    localStorage.setItem(CLAVE_USUARIO, JSON.stringify([4, 1, 2]));

    render(<FavoritosCliente />);

    await waitFor(() => {
      expect(screen.getByText("iPad Air")).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText("Ordenar favoritos"), {
      target: { value: "menor-precio" },
    });

    const tarjetas = screen.getAllByRole("article");
    expect(tarjetas.map((tarjeta) => tarjeta.textContent)).toEqual([
      expect.stringContaining("Galaxy S25"),
      expect.stringContaining("iPhone 16"),
      expect.stringContaining("iPad Air"),
    ]);
    expect(JSON.parse(localStorage.getItem(CLAVE_USUARIO) ?? "[]")).toEqual([
      4, 1, 2,
    ]);
  });

  it("muestra un vacío por filtros y permite quitarlos", async () => {
    localStorage.setItem(CLAVE_USUARIO, JSON.stringify([1]));

    render(<FavoritosCliente />);

    await waitFor(() => {
      expect(screen.getByText("Galaxy S25")).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText("Filtrar por categoría"), {
      target: { value: "laptops" },
    });

    expect(
      screen
        .getByText("No hay favoritos en esa categoría.")
        .closest('[data-estado="vacio"]'),
    ).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Quitar filtros" }));

    await waitFor(() => {
      expect(screen.getByText("Galaxy S25")).toBeDefined();
    });
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
