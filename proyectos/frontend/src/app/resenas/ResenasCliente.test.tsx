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
  Producto,
  ProductoMejorValorado,
  UsuarioSesion,
} from "@/types/producto";
import type { ResenaResponse } from "@/services/api";

const usuarioMock: UsuarioSesion = {
  id: "auth-1",
  nombre: "Ana Torres",
  usuario: "ana",
  email: "ana@example.com",
  rol: "Usuario registrado",
  idUsuario: 10,
  activo: true,
};

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

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    obtenerResenas: vi.fn(),
    obtenerProductos: vi.fn(),
    obtenerMejorValorados: vi.fn(),
    crearResena: vi.fn(),
  };
});

import {
  ApiError,
  crearResena,
  obtenerMejorValorados,
  obtenerProductos,
  obtenerResenas,
} from "@/services/api";
import ResenasCliente from "./ResenasCliente";

const mockResenas = vi.mocked(obtenerResenas);
const mockProductos = vi.mocked(obtenerProductos);
const mockRanking = vi.mocked(obtenerMejorValorados);
const mockCrear = vi.mocked(crearResena);

const PRODUCTOS: Producto[] = [
  {
    idProducto: 1,
    nombre: "Galaxy S25",
    descripcion: "Smartphone",
    idCategoria: 1,
    idMarca: 1,
    imagen: null,
    precioReferencia: 3_500_000,
    estado: true,
  },
  {
    idProducto: 2,
    nombre: "iPhone 16",
    descripcion: "Smartphone",
    idCategoria: 1,
    idMarca: 2,
    imagen: null,
    precioReferencia: 4_200_000,
    estado: true,
  },
];

const RESENAS: ResenaResponse[] = [
  {
    idResena: 1,
    idProducto: 1,
    nombreProducto: "Galaxy S25",
    idUsuario: 10,
    nombreUsuario: "Ana Torres",
    comentario: "La batería me dura todo el día.",
    fechaCreacion: "2026-10-20T12:00:00",
    estado: true,
  },
  {
    idResena: 2,
    idProducto: 2,
    nombreProducto: "iPhone 16",
    idUsuario: 11,
    nombreUsuario: "Luis Pérez",
    comentario: "Cámara muy consistente.",
    fechaCreacion: "2026-10-22T12:00:00",
    estado: true,
  },
];

const RANKING: ProductoMejorValorado[] = [
  {
    idProducto: 1,
    nombre: "Galaxy S25",
    descripcion: null,
    idCategoria: 1,
    idMarca: 1,
    imagen: null,
    precioReferencia: 3_500_000,
    promedioPuntuacion: 4.5,
    cantidadValoraciones: 12,
    posicionRanking: 1,
  },
];

function configurarExito() {
  mockResenas.mockResolvedValue(RESENAS);
  mockProductos.mockResolvedValue(PRODUCTOS);
  mockRanking.mockResolvedValue(RANKING);
}

describe("ResenasCliente", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sesionMock.usuario = null;
    sesionMock.establecerUsuario.mockClear();
    configurarExito();
  });

  afterEach(() => {
    cleanup();
  });

  it("muestra las reseñas reales y el resumen derivado", async () => {
    render(<ResenasCliente />);

    await waitFor(() => {
      expect(screen.getByText("La batería me dura todo el día.")).toBeDefined();
    });

    expect(screen.getByText("Cámara muy consistente.")).toBeDefined();
    expect(screen.getByText("2 de 2 reseñas.")).toBeDefined();
    expect(screen.getByText("Ana Torres")).toBeDefined();
    expect(screen.getByText("Luis Pérez")).toBeDefined();
    expect(
      screen.getByRole("heading", { name: "Mejor valorados" }),
    ).toBeDefined();
    expect(screen.getByText("(12 opiniones)")).toBeDefined();
  });

  it("filtra por texto y por producto", async () => {
    render(<ResenasCliente />);

    await waitFor(() => {
      expect(screen.getByText("La batería me dura todo el día.")).toBeDefined();
    });

    fireEvent.change(
      screen.getByLabelText("Buscar reseñas por comentario, autor o producto"),
      { target: { value: "cámara" } },
    );

    expect(screen.getByText("Cámara muy consistente.")).toBeDefined();
    expect(screen.queryByText("La batería me dura todo el día.")).toBeNull();

    fireEvent.change(screen.getByLabelText("Filtrar por producto"), {
      target: { value: "1" },
    });

    expect(
      screen.getByText("No encontramos reseñas con esos filtros."),
    ).toBeDefined();
  });

  it("ordena por fecha ascendente", async () => {
    render(<ResenasCliente />);

    await waitFor(() => {
      expect(screen.getByText("La batería me dura todo el día.")).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText("Orden"), {
      target: { value: "antiguas" },
    });

    const listado = screen.getByRole("list", {
      name: "Listado de reseñas",
    });
    const items = within(listado).getAllByRole("listitem");
    const textos = items.map((item) => item.textContent ?? "");
    const indiceAna = textos.findIndex((texto) => texto.includes("Ana Torres"));
    const indiceLuis = textos.findIndex((texto) =>
      texto.includes("Luis Pérez"),
    );

    expect(indiceAna).toBeGreaterThanOrEqual(0);
    expect(indiceLuis).toBeGreaterThanOrEqual(0);
    expect(indiceAna).toBeLessThan(indiceLuis);
  });

  it("exige sesión para publicar y abre el modal de autenticación", async () => {
    render(<ResenasCliente />);

    await waitFor(() => {
      expect(screen.getByText("La batería me dura todo el día.")).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText("Producto de la reseña"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText("Tu reseña"), {
      target: { value: "Quiero compartir mi experiencia." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Publicar reseña" }));

    expect(
      screen.getByText("Debes iniciar sesión para publicar una reseña."),
    ).toBeDefined();
    expect(mockCrear).not.toHaveBeenCalled();
  });

  it("publica una reseña con sesión y la agrega al listado", async () => {
    sesionMock.usuario = usuarioMock;
    const nueva: ResenaResponse = {
      idResena: 99,
      idProducto: 1,
      nombreProducto: "Galaxy S25",
      idUsuario: 10,
      nombreUsuario: "Ana Torres",
      comentario: "Mi nueva reseña.",
      fechaCreacion: "2026-10-26T12:00:00",
      estado: true,
    };
    mockCrear.mockResolvedValue(nueva);

    render(<ResenasCliente />);

    await waitFor(() => {
      expect(screen.getByText("La batería me dura todo el día.")).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText("Producto de la reseña"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText("Tu reseña"), {
      target: { value: "Mi nueva reseña." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Publicar reseña" }));

    await waitFor(() => {
      expect(mockCrear).toHaveBeenCalledWith({
        idProducto: 1,
        comentario: "Mi nueva reseña.",
      });
    });
    expect(screen.getByText("Tu reseña fue publicada.")).toBeDefined();
    expect(screen.getByText("Mi nueva reseña.")).toBeDefined();
  });

  it("muestra el error de carga y permite reintentar", async () => {
    mockResenas.mockRejectedValueOnce(
      new ApiError("No fue posible conectarse con el servidor.", 500),
    );

    render(<ResenasCliente />);

    await waitFor(() => {
      expect(
        screen.getByText("No pudimos cargar las reseñas"),
      ).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    await waitFor(() => {
      expect(screen.getByText("La batería me dura todo el día.")).toBeDefined();
    });
  });
});
