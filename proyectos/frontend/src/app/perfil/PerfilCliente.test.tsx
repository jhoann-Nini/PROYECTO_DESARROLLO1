// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { UsuarioSesion } from "@/types/producto";
import type { ResenaResponse } from "@/services/api";

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

vi.mock("@/hooks/useFavoritos", () => ({
  useFavoritos: () => ({
    ids: [1, 2, 3],
    hidratado: true,
    alternar: vi.fn(),
    quitar: vi.fn(),
    limpiar: vi.fn(),
    contiene: vi.fn(),
  }),
}));

vi.mock("@/hooks/useComparador", () => ({
  useComparador: () => ({
    ids: [1, 2],
    hidratado: true,
    agregar: vi.fn(),
    quitar: vi.fn(),
    limpiar: vi.fn(),
    contiene: vi.fn(),
  }),
}));

vi.mock("@/components/AuthModal", () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div role="dialog" aria-label="Autenticación" /> : null,
}));

vi.mock("@/components/AdminPanelModal", () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div role="dialog" aria-label="Administración" /> : null,
}));

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    obtenerResenas: vi.fn(),
  };
});

import { obtenerResenas } from "@/services/api";
import PerfilCliente from "./PerfilCliente";

const mockResenas = vi.mocked(obtenerResenas);

const USUARIO: UsuarioSesion = {
  id: "auth-1",
  nombre: "Ana Torres",
  usuario: "ana",
  email: "ana@example.com",
  rol: "Usuario registrado",
  idUsuario: 10,
  activo: true,
  fechaRegistro: "2026-01-15T12:00:00",
};

const RESENAS: ResenaResponse[] = [
  {
    idResena: 1,
    idProducto: 1,
    nombreProducto: "Galaxy S25",
    idUsuario: 10,
    nombreUsuario: "Ana Torres",
    comentario: "Mi reseña sobre el Galaxy.",
    fechaCreacion: "2026-10-20T12:00:00",
    estado: true,
  },
  {
    idResena: 2,
    idProducto: 2,
    nombreProducto: "iPhone 16",
    idUsuario: 99,
    nombreUsuario: "Otra persona",
    comentario: "Reseña de otra persona.",
    fechaCreacion: "2026-10-21T12:00:00",
    estado: true,
  },
];

describe("PerfilCliente", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sesionMock.usuario = null;
    sesionMock.cargando = false;
    sesionMock.error = null;
    mockResenas.mockResolvedValue(RESENAS);
  });

  afterEach(() => {
    cleanup();
  });

  it("muestra el estado de carga", () => {
    sesionMock.cargando = true;

    render(<PerfilCliente />);

    expect(screen.getByText("Consultando tu perfil…")).toBeDefined();
  });

  it("invita a iniciar sesión cuando no hay usuario", () => {
    render(<PerfilCliente />);

    expect(
      screen.getByRole("heading", {
        name: "Inicia sesión para ver tu perfil",
      }),
    ).toBeDefined();
    expect(
      screen.getByRole("link", { name: "Explorar catálogo" }),
    ).toBeDefined();
  });

  it("abre el modal de autenticación desde el estado sin sesión", () => {
    render(<PerfilCliente />);

    fireEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(
      screen.getByRole("dialog", { name: "Autenticación" }),
    ).toBeDefined();
  });

  it("muestra los datos reales del perfil y solo las reseñas propias", async () => {
    sesionMock.usuario = USUARIO;

    render(<PerfilCliente />);

    await waitFor(() => {
      expect(screen.getByText("Mi reseña sobre el Galaxy.")).toBeDefined();
    });

    expect(
      screen.getByRole("heading", { name: "Ana Torres" }),
    ).toBeDefined();
    expect(screen.getByText("@ana")).toBeDefined();
    expect(screen.getByText("ana@example.com")).toBeDefined();
    expect(screen.getByText("Usuario registrado")).toBeDefined();
    expect(screen.getByText("Cuenta activa")).toBeDefined();
    expect(screen.queryByText("Reseña de otra persona.")).toBeNull();
    expect(screen.getByText("3")).toBeDefined();
    expect(screen.getByText("2")).toBeDefined();
  });

  it("muestra el panel de administración solo para administradores", () => {
    sesionMock.usuario = { ...USUARIO, rol: "Administrador" };

    render(<PerfilCliente />);

    expect(
      screen.getByRole("button", { name: "Panel de administración" }),
    ).toBeDefined();
  });

  it("cierra la sesión desde el perfil", () => {
    sesionMock.usuario = USUARIO;

    render(<PerfilCliente />);

    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    expect(sesionMock.cerrarSesion).toHaveBeenCalledTimes(1);
  });

  it("muestra el error de sesión y permite reintentar", () => {
    sesionMock.error = "No fue posible verificar tu perfil.";

    render(<PerfilCliente />);

    expect(
      screen.getByText("No fue posible verificar tu perfil."),
    ).toBeDefined();

    fireEvent.click(
      screen.getByRole("button", { name: "Reintentar conexión" }),
    );

    expect(sesionMock.reintentar).toHaveBeenCalledTimes(1);
  });
});
