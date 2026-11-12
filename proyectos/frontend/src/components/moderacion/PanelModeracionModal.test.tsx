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
import type { ResenaReportadaResponse } from "@/types/moderacion";

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    obtenerResenasReportadas: vi.fn(),
    ocultarResenaReportada: vi.fn(),
    publicarResenaReportada: vi.fn(),
    rechazarReportesResenaReportada: vi.fn(),
  };
});

import {
  ApiError,
  obtenerResenasReportadas,
  ocultarResenaReportada,
  publicarResenaReportada,
  rechazarReportesResenaReportada,
} from "@/services/api";
import PanelModeracionModal from "./PanelModeracionModal";

const mockObtener = vi.mocked(obtenerResenasReportadas);
const mockOcultar = vi.mocked(ocultarResenaReportada);
const mockPublicar = vi.mocked(publicarResenaReportada);
const mockRechazar = vi.mocked(rechazarReportesResenaReportada);

const ADMIN: UsuarioSesion = {
  id: "admin-1",
  nombre: "Admin Principal",
  usuario: "admin",
  email: "admin@tecreview.com",
  rol: "Administrador",
  idUsuario: 1,
  activo: true,
};

const MODERADOR: UsuarioSesion = {
  ...ADMIN,
  id: "mod-1",
  nombre: "Moderador Principal",
  usuario: "moderador",
  email: "moderador@tecreview.com",
  rol: "Moderador",
  idUsuario: 2,
};

const USUARIO: UsuarioSesion = {
  ...ADMIN,
  id: "user-1",
  nombre: "Usuario Normal",
  usuario: "usuario",
  email: "usuario@tecreview.com",
  rol: "Usuario registrado",
  idUsuario: 3,
};

const RESENA_REPORTADA: ResenaReportadaResponse = {
  idResena: 15,
  idProducto: 10,
  nombreProducto: "Smartphone Pro",
  idAutor: 5,
  nombreAutor: "Usuario Autor",
  comentario: "Texto de la reseña reportada por la comunidad.",
  puntuacion: 1,
  fechaCreacion: "2026-11-10T20:00:00",
  estado: true,
  ocultaPorReportes: false,
  totalReportes: 2,
  reportesPendientes: 2,
  reportes: [
    {
      idReporte: 101,
      idUsuarioReportante: 8,
      nombreReportante: "Usuario Reportante",
      motivo: "spam",
      descripcion: "Publicidad encubierta",
      estado: "PENDIENTE",
      fechaCreacion: "2026-11-10T21:00:00",
    },
    {
      idReporte: 102,
      idUsuarioReportante: 9,
      nombreReportante: "Otra Persona",
      motivo: "falso",
      descripcion: null,
      estado: "EN_REVISION",
      fechaCreacion: "2026-11-10T22:00:00",
    },
  ],
};

const RESENA_OCULTA: ResenaReportadaResponse = {
  ...RESENA_REPORTADA,
  ocultaPorReportes: true,
};

describe("PanelModeracionModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockObtener.mockResolvedValue([RESENA_REPORTADA]);
    mockOcultar.mockResolvedValue({
      ...RESENA_REPORTADA,
      ocultaPorReportes: true,
      reportes: RESENA_REPORTADA.reportes.map((reporte) => ({
        ...reporte,
        estado: "ACEPTADO",
      })),
    });
    mockPublicar.mockResolvedValue({
      ...RESENA_OCULTA,
      ocultaPorReportes: false,
      reportesPendientes: 0,
      reportes: RESENA_REPORTADA.reportes.map((reporte) => ({
        ...reporte,
        estado: "RECHAZADO",
      })),
    });
    mockRechazar.mockResolvedValue({
      ...RESENA_REPORTADA,
      reportesPendientes: 0,
      reportes: RESENA_REPORTADA.reportes.map((reporte) => ({
        ...reporte,
        estado: "RECHAZADO",
      })),
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("no muestra el panel si está cerrado o el rol no puede moderar", () => {
    const { rerender } = render(
      <PanelModeracionModal
        isOpen={false}
        onClose={vi.fn()}
        usuarioSesion={ADMIN}
      />,
    );
    expect(screen.queryByRole("dialog")).toBeNull();

    rerender(
      <PanelModeracionModal
        isOpen
        onClose={vi.fn()}
        usuarioSesion={USUARIO}
      />,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("muestra el estado de carga al consultar la cola", () => {
    mockObtener.mockReturnValue(new Promise(() => {}));

    render(
      <PanelModeracionModal isOpen onClose={vi.fn()} usuarioSesion={ADMIN} />,
    );

    expect(screen.getByText("Cargando reseñas reportadas…")).toBeDefined();
  });

  it("muestra el error de carga y permite reintentar", async () => {
    mockObtener
      .mockRejectedValueOnce(new ApiError("Acceso denegado (403).", 403))
      .mockResolvedValueOnce([RESENA_REPORTADA]);

    render(
      <PanelModeracionModal isOpen onClose={vi.fn()} usuarioSesion={ADMIN} />,
    );

    const alerta = await screen.findByRole("alert");
    expect(alerta.textContent).toContain("Acceso denegado (403).");

    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    await waitFor(() => {
      expect(screen.getByText("Smartphone Pro")).toBeDefined();
    });
    expect(mockObtener).toHaveBeenCalledTimes(2);
  });

  it("muestra el estado vacío cuando no hay reportes", async () => {
    mockObtener.mockResolvedValue([]);

    render(
      <PanelModeracionModal isOpen onClose={vi.fn()} usuarioSesion={ADMIN} />,
    );

    expect(
      await screen.findByText("No hay reseñas reportadas"),
    ).toBeDefined();
  });

  it("lista la reseña reportada y el detalle de sus reportes", async () => {
    render(
      <PanelModeracionModal isOpen onClose={vi.fn()} usuarioSesion={ADMIN} />,
    );

    expect(await screen.findByText("Smartphone Pro")).toBeDefined();
    expect(screen.getByText(/Por Usuario Autor/)).toBeDefined();
    expect(
      screen.getByText("Texto de la reseña reportada por la comunidad."),
    ).toBeDefined();
    expect(screen.getByText("Visible")).toBeDefined();
    expect(
      screen.getByText(/2 reportes · 2 pendientes/),
    ).toBeDefined();

    fireEvent.click(screen.getByText("Ver reportes (2)"));

    expect(screen.getByText("Spam · Pendiente")).toBeDefined();
    expect(screen.getByText("Publicidad encubierta")).toBeDefined();
    expect(screen.getByText("Información falsa · En revisión")).toBeDefined();
  });

  it("permite consultar a un moderador pero no muestra acciones de administrador", async () => {
    render(
      <PanelModeracionModal
        isOpen
        onClose={vi.fn()}
        usuarioSesion={MODERADOR}
      />,
    );

    expect(await screen.findByText("Smartphone Pro")).toBeDefined();
    expect(
      screen.getByText(/Solo un administrador puede ocultar/),
    ).toBeDefined();
    expect(
      screen.queryByRole("button", {
        name: "Ocultar reseña de Usuario Autor",
      }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", {
        name: "Rechazar reportes de Usuario Autor",
      }),
    ).toBeNull();
  });

  it("oculta una reseña y actualiza su estado local", async () => {
    render(
      <PanelModeracionModal isOpen onClose={vi.fn()} usuarioSesion={ADMIN} />,
    );

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Ocultar reseña de Usuario Autor",
      }),
    );

    await waitFor(() => {
      expect(mockOcultar).toHaveBeenCalledWith(15);
    });
    expect(
      await screen.findByText("Reseña de Usuario Autor ocultada."),
    ).toBeDefined();
    expect(screen.getByText("Oculta por reportes")).toBeDefined();
    expect(
      screen.getByRole("button", {
        name: "Publicar reseña de Usuario Autor",
      }),
    ).toBeDefined();
  });

  it("publica de nuevo una reseña oculta", async () => {
    mockObtener.mockResolvedValue([RESENA_OCULTA]);

    render(
      <PanelModeracionModal isOpen onClose={vi.fn()} usuarioSesion={ADMIN} />,
    );

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Publicar reseña de Usuario Autor",
      }),
    );

    await waitFor(() => {
      expect(mockPublicar).toHaveBeenCalledWith(15);
    });
    expect(
      await screen.findByText("Reseña de Usuario Autor publicada de nuevo."),
    ).toBeDefined();
    expect(screen.getByText("Visible")).toBeDefined();
  });

  it("rechaza los reportes pendientes de una reseña", async () => {
    render(
      <PanelModeracionModal isOpen onClose={vi.fn()} usuarioSesion={ADMIN} />,
    );

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Rechazar reportes de Usuario Autor",
      }),
    );

    await waitFor(() => {
      expect(mockRechazar).toHaveBeenCalledWith(15);
    });
    expect(
      await screen.findByText("Reportes de Usuario Autor rechazados."),
    ).toBeDefined();
    expect(screen.getByText(/0 pendientes/)).toBeDefined();
    expect(
      (
        screen.getByRole("button", {
          name: "Rechazar reportes de Usuario Autor",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it("muestra el error de una acción sin perder la lista", async () => {
    mockOcultar.mockRejectedValue(
      new ApiError("Solo un administrador puede ocultar reseñas.", 403),
    );

    render(
      <PanelModeracionModal isOpen onClose={vi.fn()} usuarioSesion={ADMIN} />,
    );

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Ocultar reseña de Usuario Autor",
      }),
    );

    const alerta = await screen.findByRole("alert");
    expect(alerta.textContent).toContain(
      "Solo un administrador puede ocultar reseñas.",
    );
    expect(screen.getByText("Smartphone Pro")).toBeDefined();
  });

  it("envía los filtros de estado y visibilidad a la API", async () => {
    render(
      <PanelModeracionModal isOpen onClose={vi.fn()} usuarioSesion={ADMIN} />,
    );

    await screen.findByText("Smartphone Pro");

    fireEvent.change(screen.getByLabelText("Estado del reporte"), {
      target: { value: "PENDIENTE" },
    });

    await waitFor(() => {
      expect(mockObtener).toHaveBeenLastCalledWith({
        estado: "PENDIENTE",
        oculta: undefined,
      });
    });

    fireEvent.click(screen.getByLabelText("Solo reseñas ocultas"));

    await waitFor(() => {
      expect(mockObtener).toHaveBeenLastCalledWith({
        estado: "PENDIENTE",
        oculta: true,
      });
    });
  });

  it("cierra con Escape y con el botón de cierre", async () => {
    const onClose = vi.fn();

    render(
      <PanelModeracionModal isOpen onClose={onClose} usuarioSesion={ADMIN} />,
    );

    await screen.findByText("Smartphone Pro");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(
      screen.getByRole("button", { name: "Cerrar panel de moderación" }),
    );
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
