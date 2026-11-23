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

const resumenPendientesMock = vi.hoisted(() => ({
  valor: null as null | {
    revisionAutomatica: number;
    reportesResenas: number;
    reportesOfertas: number;
    total: number;
  },
  habilitado: [] as boolean[],
}));

vi.mock("@/hooks/useResumenPendientesModeracion", () => ({
  useResumenPendientesModeracion: (habilitado: boolean) => {
    resumenPendientesMock.habilitado.push(habilitado);
    return { resumen: habilitado ? resumenPendientesMock.valor : null, recargar: () => {} };
  },
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

vi.mock("@/components/moderacion/PanelModeracionModal", () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div role="dialog" aria-label="Moderación" /> : null,
}));

vi.mock("@/components/representante/PanelRepresentanteModal", () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div role="dialog" aria-label="Representante" /> : null,
}));

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    obtenerResenas: vi.fn(),
    obtenerMiReincidencia: vi.fn().mockResolvedValue({
      faltas: 0, nivel: "NINGUNO", ultimaFalta: null, revisionPreviaHasta: null, bloqueoHasta: null, proximaCaducidad: null,
    }),
  };
});

import { obtenerMiReincidencia, obtenerResenas } from "@/services/api";
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
    expect(
      screen.getByTestId("avatar-placeholder").querySelector("svg"),
    ).not.toBeNull();
    expect(
      screen.queryByRole("img", { name: "Avatar de Ana Torres" }),
    ).toBeNull();
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

  it("muestra el panel de moderación a moderadores y administradores", () => {
    sesionMock.usuario = { ...USUARIO, rol: "Moderador" };

    const { unmount } = render(<PerfilCliente />);

    expect(
      screen.getByRole("button", { name: "Panel de moderación" }),
    ).toBeDefined();
    expect(
      screen.queryByRole("button", { name: "Panel de administración" }),
    ).toBeNull();

    unmount();

    sesionMock.usuario = { ...USUARIO, rol: "Administrador" };

    render(<PerfilCliente />);

    expect(
      screen.getByRole("button", { name: "Panel de moderación" }),
    ).toBeDefined();
  });

  it("no muestra el panel de moderación a usuarios regulares", () => {
    sesionMock.usuario = USUARIO;

    render(<PerfilCliente />);

    expect(
      screen.queryByRole("button", { name: "Panel de moderación" }),
    ).toBeNull();
  });

  it("abre el panel de moderación desde el perfil", () => {
    sesionMock.usuario = { ...USUARIO, rol: "Moderador" };

    render(<PerfilCliente />);

    fireEvent.click(
      screen.getByRole("button", { name: "Panel de moderación" }),
    );

    expect(screen.getByRole("dialog", { name: "Moderación" })).toBeDefined();
  });

  it("muestra el panel de representante a administradores y representantes", () => {
    sesionMock.usuario = { ...USUARIO, rol: "Representante de establecimiento" };

    const { unmount } = render(<PerfilCliente />);

    expect(
      screen.getByRole("button", { name: "Panel de representante" }),
    ).toBeDefined();

    unmount();

    sesionMock.usuario = { ...USUARIO, rol: "Administrador" };
    render(<PerfilCliente />);

    expect(
      screen.getByRole("button", { name: "Panel de representante" }),
    ).toBeDefined();
  });

  it("no muestra el panel de representante a usuarios regulares", () => {
    sesionMock.usuario = USUARIO;

    render(<PerfilCliente />);

    expect(
      screen.queryByRole("button", { name: "Panel de representante" }),
    ).toBeNull();
  });

  it("abre el panel de representante desde el perfil", () => {
    sesionMock.usuario = { ...USUARIO, rol: "Representante de establecimiento" };

    render(<PerfilCliente />);

    fireEvent.click(
      screen.getByRole("button", { name: "Panel de representante" }),
    );

    expect(screen.getByRole("dialog", { name: "Representante" })).toBeDefined();
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

  it("muestra el error de reseñas con reintento y recupera la lista", async () => {
    sesionMock.usuario = USUARIO;
    mockResenas.mockRejectedValueOnce(
      new Error("Servicio de reseñas no disponible"),
    );

    render(<PerfilCliente />);

    const alerta = await screen.findByRole("alert");
    expect(alerta.getAttribute("data-estado")).toBe("error");
    expect(alerta.textContent).toContain("Servicio de reseñas no disponible");

    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    await waitFor(() => {
      expect(screen.getByText("Mi reseña sobre el Galaxy.")).toBeDefined();
    });
  });

  it("muestra el estado vacío de reseñas propias", async () => {
    sesionMock.usuario = USUARIO;
    mockResenas.mockResolvedValueOnce([]);

    render(<PerfilCliente />);

    const mensaje = await screen.findByText(
      "Aún no has publicado reseñas.",
    );
    expect(mensaje.closest('[data-estado="vacio"]')).not.toBeNull();
  });

  it("muestra en el botón del panel cuántos pendientes hay para moderar", () => {
    sesionMock.usuario = { ...USUARIO, rol: "Moderador" };
    resumenPendientesMock.valor = { revisionAutomatica: 2, reportesResenas: 1, reportesOfertas: 1, total: 4 };

    render(<PerfilCliente />);

    expect(
      screen.getByRole("button", { name: "Panel de moderación (4 pendientes)" }),
    ).toBeDefined();
    resumenPendientesMock.valor = null;
  });

  it("no consulta pendientes para usuarios sin rol de moderación", () => {
    sesionMock.usuario = USUARIO;
    resumenPendientesMock.habilitado = [];

    render(<PerfilCliente />);

    expect(resumenPendientesMock.habilitado.every((h) => h === false)).toBe(true);
  });

  it("muestra el estado de la cuenta cuando hay faltas", async () => {
    sesionMock.usuario = USUARIO;
    vi.mocked(obtenerMiReincidencia).mockResolvedValueOnce({
      faltas: 1,
      nivel: "AVISO",
      ultimaFalta: "2026-11-20T10:00:00",
      revisionPreviaHasta: null,
      bloqueoHasta: null,
      proximaCaducidad: "2027-02-18T10:00:00",
    });

    render(<PerfilCliente />);

    expect(await screen.findByRole("status", { name: "Estado de tu cuenta" })).toBeDefined();
  });
});
