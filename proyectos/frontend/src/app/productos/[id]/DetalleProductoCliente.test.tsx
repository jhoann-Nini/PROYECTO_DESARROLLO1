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
    obtenerProductoPorId: vi.fn(),
    obtenerCategorias: vi.fn(),
    obtenerMarcas: vi.fn(),
    obtenerValoracionStats: vi.fn(),
    obtenerResenas: vi.fn(),
    crearValoracion: vi.fn(),
    obtenerMiValoracion: vi.fn(),
    crearResena: vi.fn(),
  };
});

const mockSesion: {
  usuario: UsuarioSesion | null;
  cargando: boolean;
  error: string | null;
  establecerUsuario: ReturnType<typeof vi.fn>;
  limpiarError: ReturnType<typeof vi.fn>;
  cerrarSesion: ReturnType<typeof vi.fn>;
  reintentar: ReturnType<typeof vi.fn>;
} = {
  usuario: null,
  cargando: false,
  error: null,
  establecerUsuario: vi.fn(),
  limpiarError: vi.fn(),
  cerrarSesion: vi.fn(),
  reintentar: vi.fn(),
};

vi.mock("@/hooks/useSesionTecReview", () => ({
  useSesionTecReview: () => mockSesion,
}));

import {
  ApiError,
  crearResena,
  crearValoracion,
  obtenerCategorias,
  obtenerMarcas,
  obtenerMiValoracion,
  obtenerProductoPorId,
  obtenerResenas,
  obtenerValoracionStats,
} from "@/services/api";
import { CLAVE_COMPARADOR } from "@/data/comparador";
import DetalleProductoCliente from "./DetalleProductoCliente";

const mockProducto = vi.mocked(obtenerProductoPorId);
const mockCategorias = vi.mocked(obtenerCategorias);
const mockMarcas = vi.mocked(obtenerMarcas);
const mockStats = vi.mocked(obtenerValoracionStats);
const mockResenas = vi.mocked(obtenerResenas);
const mockCrearResena = vi.mocked(crearResena);
const mockCrearValoracion = vi.mocked(crearValoracion);
const mockMiValoracion = vi.mocked(obtenerMiValoracion);

const CATEGORIAS: CategoriaResponse[] = [
  { idCategoria: 1, nombre: "Móviles", descripcion: null, estado: true },
];

const MARCAS: MarcaResponse[] = [
  { idMarca: 1, nombre: "Samsung", descripcion: null, estado: true },
];

const PRODUCTO: Producto = {
  idProducto: 204,
  nombre: "Samsung Galaxy S25 Ultra",
  descripcion: "Smartphone insignia con cámara de alta resolución.",
  idCategoria: 1,
  idMarca: 1,
  imagen: null,
  precioReferencia: 5_499_000,
  estado: true,
  caracteristicas: {
    pantalla: "6.9'' AMOLED 120Hz",
    procesador: "Snapdragon 8 Elite",
    ram: "12 GB",
  },
};

const RESENA = {
  idResena: 12,
  idProducto: 204,
  nombreProducto: "Samsung Galaxy S25 Ultra",
  idUsuario: 8,
  nombreUsuario: "laura",
  comentario: "La cámara nocturna es excelente y la batería dura todo el día.",
  fechaCreacion: "2026-10-20T10:00:00",
  estado: true,
};

const USUARIO: UsuarioSesion = {
  id: "supabase-8",
  idUsuario: 8,
  nombre: "Laura Gómez",
  usuario: "laura",
  email: "laura@example.com",
  rol: "Usuario registrado",
  activo: true,
  fechaRegistro: "2026-01-01T00:00:00",
};

beforeEach(() => {
  localStorage.clear();
  mockSesion.usuario = null;
  mockSesion.cargando = false;
  mockSesion.error = null;

  mockCategorias.mockResolvedValue(CATEGORIAS);
  mockMarcas.mockResolvedValue(MARCAS);
  mockProducto.mockResolvedValue(PRODUCTO);
  mockStats.mockResolvedValue({
    idProducto: 204,
    promedioPuntuacion: 4.5,
    cantidadValoraciones: 12,
  });
  mockResenas.mockResolvedValue([RESENA]);
  mockMiValoracion.mockResolvedValue(null);
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
});

describe("DetalleProductoCliente", () => {
  it("muestra el estado de carga", () => {
    mockProducto.mockReturnValue(new Promise<Producto>(() => {}));

    render(<DetalleProductoCliente idProducto={204} />);

    expect(screen.getByText("Cargando detalle del producto…")).toBeDefined();
  });

  it("muestra un 404 accesible si el producto no existe", async () => {
    mockProducto.mockRejectedValue(
      new ApiError("Producto no encontrado", 404),
    );

    render(<DetalleProductoCliente idProducto={999} />);

    await waitFor(() => {
      expect(screen.getByText("Producto no encontrado")).toBeDefined();
    });

    const volver = screen.getByRole("link", { name: "Volver al catálogo" });
    expect(volver.getAttribute("href")).toBe("/productos");
  });

  it("muestra un error con reintento si la API falla", async () => {
    mockProducto
      .mockRejectedValueOnce(new Error("Fallo de red al consultar el producto"))
      .mockResolvedValueOnce(PRODUCTO);

    render(<DetalleProductoCliente idProducto={204} />);

    await waitFor(() => {
      expect(screen.getByText("No pudimos cargar el producto")).toBeDefined();
    });
    expect(screen.getByText("Fallo de red al consultar el producto")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Samsung Galaxy S25 Ultra" }),
      ).toBeDefined();
    });
    expect(mockProducto).toHaveBeenCalledTimes(2);
  });

  it("renderiza nombre, marca, categoría, precio y disponibilidad reales", async () => {
    render(<DetalleProductoCliente idProducto={204} />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Samsung Galaxy S25 Ultra" }),
      ).toBeDefined();
    });

    expect(screen.getByText("Disponible")).toBeDefined();
    expect(screen.getByText(/5\.499\.000/)).toBeDefined();
    expect(screen.getByText("Smartphone insignia con cámara de alta resolución.")).toBeDefined();

    const migas = screen.getByRole("navigation", { name: "Migas de pan" });
    expect(migas.textContent).toContain("Samsung Galaxy S25 Ultra");
    expect(migas.textContent).toContain("Productos");
  });

  it("muestra las especificaciones normalizadas", async () => {
    render(<DetalleProductoCliente idProducto={204} />);

    await waitFor(() => {
      expect(screen.getByText("6.9'' AMOLED 120Hz")).toBeDefined();
    });

    expect(screen.getByText("Snapdragon 8 Elite")).toBeDefined();
    expect(screen.getByText("12 GB")).toBeDefined();
    expect(
      screen.getByRole("heading", { name: "Especificaciones" }),
    ).toBeDefined();
  });

  it("muestra un vacío limpio cuando no hay especificaciones registradas", async () => {
    mockProducto.mockResolvedValue({
      ...PRODUCTO,
      caracteristicas: null,
    });

    render(<DetalleProductoCliente idProducto={204} />);

    await waitFor(() => {
      expect(
        screen.getByText(
          "Aún no hay especificaciones registradas para este producto.",
        ),
      ).toBeDefined();
    });

    expect(screen.queryByText("6.9'' AMOLED 120Hz")).toBeNull();
  });

  it("muestra el promedio real de valoraciones y las reseñas del producto", async () => {
    render(<DetalleProductoCliente idProducto={204} />);

    await waitFor(() => {
      expect(screen.getByText(RESENA.comentario)).toBeDefined();
    });

    expect(screen.getAllByText(/12 valoraciones/).length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("img", { name: /Valoración 4,5 de 5/i }).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("@laura")).toBeDefined();
    expect(
      screen.getByRole("tab", { name: "Opiniones (1)" }),
    ).toBeDefined();
  });

  it("abre AuthModal al intentar valorar sin sesión", async () => {
    render(<DetalleProductoCliente idProducto={204} />);

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Opiniones (1)" })).toBeDefined();
    });

    fireEvent.click(screen.getByRole("tab", { name: "Opiniones (1)" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Inicia sesión para valorar" }),
    );

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeDefined();
    });
    expect(
      screen.getByText(
        "Debes iniciar sesión para valorar este dispositivo.",
      ),
    ).toBeDefined();
  });

  it("publica una opinión autenticada y actualiza la lista", async () => {
    mockSesion.usuario = USUARIO;
    mockCrearResena.mockResolvedValue({
      ...RESENA,
      idResena: 13,
      nombreUsuario: "laura",
      comentario: "El mejor equipo que he probado este año.",
    });

    render(<DetalleProductoCliente idProducto={204} />);

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Opiniones (1)" })).toBeDefined();
    });

    fireEvent.click(screen.getByRole("tab", { name: "Opiniones (1)" }));
    fireEvent.change(screen.getByLabelText(/Escribe tu opinión sobre/i), {
      target: { value: "El mejor equipo que he probado este año." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Publicar opinión" }));

    await waitFor(() => {
      expect(
        screen.getByText("El mejor equipo que he probado este año."),
      ).toBeDefined();
    });
    expect(mockCrearResena).toHaveBeenCalledWith({
      idProducto: 204,
      comentario: "El mejor equipo que he probado este año.",
    });
    expect(
      screen.getByRole("tab", { name: "Opiniones (2)" }),
    ).toBeDefined();
  });

  it("guarda una valoración autenticada y refresca las estadísticas", async () => {
    mockSesion.usuario = USUARIO;
    mockMiValoracion.mockResolvedValue({
      idValoracion: 5,
      idProducto: 204,
      nombreProducto: PRODUCTO.nombre,
      idUsuario: 8,
      nombreUsuario: "laura",
      puntuacion: 4,
      fechaCreacion: "2026-10-01T10:00:00",
      estado: true,
    });
    mockCrearValoracion.mockResolvedValue({
      idValoracion: 5,
      idProducto: 204,
      nombreProducto: PRODUCTO.nombre,
      idUsuario: 8,
      nombreUsuario: "laura",
      puntuacion: 5,
      fechaCreacion: "2026-10-25T10:00:00",
      estado: true,
    });

    render(<DetalleProductoCliente idProducto={204} />);

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Opiniones (1)" })).toBeDefined();
    });

    fireEvent.click(screen.getByRole("tab", { name: "Opiniones (1)" }));

    await waitFor(() => {
      expect(
        screen.getByText("Tu valoración actual: 4 estrellas"),
      ).toBeDefined();
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Valorar con 5 estrellas" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Guardar valoración" }),
    );

    await waitFor(() => {
      expect(screen.getByText("Tu valoración de 5 estrellas fue guardada.")).toBeDefined();
    });
    expect(mockCrearValoracion).toHaveBeenCalledWith({
      idProducto: 204,
      puntuacion: 5,
    });
  });

  it("agrega el producto al comparador y permite quitarlo", async () => {
    render(<DetalleProductoCliente idProducto={204} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Agregar al comparador" }),
      ).toBeDefined();
    });

    const agregar = screen.getByRole("button", {
      name: "Agregar al comparador",
    });
    await waitFor(() => {
      expect((agregar as HTMLButtonElement).disabled).toBe(false);
    });

    fireEvent.click(agregar);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Quitar del comparador" }),
      ).toBeDefined();
    });
    expect(JSON.parse(localStorage.getItem(CLAVE_COMPARADOR) ?? "[]")).toEqual([
      204,
    ]);

    fireEvent.click(
      screen.getByRole("button", { name: "Quitar del comparador" }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Agregar al comparador" }),
      ).toBeDefined();
    });
    expect(JSON.parse(localStorage.getItem(CLAVE_COMPARADOR) ?? "[]")).toEqual(
      [],
    );
  });
});
