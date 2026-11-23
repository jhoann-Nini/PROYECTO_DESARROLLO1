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
    obtenerResenasEnRevision: vi.fn(),
    decidirRevisionResena: vi.fn(),
    obtenerReportesOfertaModeracion: vi.fn(),
    obtenerResumenPendientesModeracion: vi.fn(),
  };
});

import {
  ApiError,
  obtenerReportesOfertaModeracion,
  obtenerResenasReportadas,
  ocultarResenaReportada,
  publicarResenaReportada,
  rechazarReportesResenaReportada,
  obtenerResenasEnRevision,
  obtenerResumenPendientesModeracion,
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
  ocultaPorModeracion: false,
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

const RESENA_OCULTA_REPORTES: ResenaReportadaResponse = {
  ...RESENA_REPORTADA,
  ocultaPorReportes: true,
};

const RESENA_OCULTA_MODERACION: ResenaReportadaResponse = {
  ...RESENA_REPORTADA,
  ocultaPorModeracion: true,
};

describe("PanelModeracionModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(obtenerResumenPendientesModeracion).mockResolvedValue({
      revisionAutomatica: 0,
      reportesResenas: 0,
      reportesOfertas: 0,
      total: 0,
    });
    mockObtener.mockResolvedValue([RESENA_REPORTADA]);
    mockOcultar.mockResolvedValue({
      ...RESENA_REPORTADA,
      ocultaPorModeracion: true,
      reportes: RESENA_REPORTADA.reportes.map((reporte) => ({
        ...reporte,
        estado: "ACEPTADO",
      })),
    });
    mockPublicar.mockResolvedValue({
      ...RESENA_OCULTA_MODERACION,
      ocultaPorModeracion: false,
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

  it("ya no advierte que la API de moderación no está implementada", async () => {
    render(
      <PanelModeracionModal isOpen onClose={vi.fn()} usuarioSesion={ADMIN} />,
    );

    await screen.findByText("Smartphone Pro");

    expect(
      screen.queryByText(/todavía no está implementada en el backend/i),
    ).toBeNull();
    expect(screen.queryByRole("note")).toBeNull();
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

  it("aclara el alcance y diferencia el vacío general del vacío por filtro", async () => {
    mockObtener.mockResolvedValue([]);
    render(<PanelModeracionModal isOpen onClose={vi.fn()} usuarioSesion={MODERADOR} />);
    expect(await screen.findByText(/no hay reseñas reportadas/i)).toBeDefined();
    expect(screen.getByText(/precios y enlaces están en la pestaña «Reportes de ofertas»/i)).toBeDefined();
    fireEvent.change(screen.getByRole("combobox", { name: /estado del reporte/i }), { target: { value: "PENDIENTE" } });
    expect(await screen.findByText(/ninguna reseña coincide con los filtros/i)).toBeDefined();
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

  it("permite a un moderador ocultar una reseña con justificación", async () => {
    render(
      <PanelModeracionModal
        isOpen
        onClose={vi.fn()}
        usuarioSesion={MODERADOR}
      />,
    );

    await screen.findByText("Smartphone Pro");
    expect(
      screen.queryByText(/Solo un administrador puede ocultar/i),
    ).toBeNull();

    fireEvent.change(screen.getByLabelText("Justificación"), {
      target: { value: "Incumple las normas de la comunidad." },
    });
    fireEvent.click(
      screen.getByRole("button", {
        name: "Ocultar reseña de Usuario Autor",
      }),
    );

    await waitFor(() => {
      expect(mockOcultar).toHaveBeenCalledWith(
        15,
        "Incumple las normas de la comunidad.",
      );
    });
    expect(
      await screen.findByText("Reseña de Usuario Autor ocultada."),
    ).toBeDefined();
    expect(screen.getByText("Oculta por moderación")).toBeDefined();
  });

  it("exige justificación no vacía antes de ocultar una reseña", async () => {
    render(
      <PanelModeracionModal isOpen onClose={vi.fn()} usuarioSesion={ADMIN} />,
    );

    await screen.findByText("Smartphone Pro");
    fireEvent.click(
      screen.getByRole("button", {
        name: "Ocultar reseña de Usuario Autor",
      }),
    );

    expect(
      screen.getByText(
        "La justificación es obligatoria para ocultar o publicar esta reseña.",
      ),
    ).toBeDefined();
    expect(mockOcultar).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Justificación"), {
      target: { value: "   " },
    });
    fireEvent.click(
      screen.getByRole("button", {
        name: "Ocultar reseña de Usuario Autor",
      }),
    );
    expect(mockOcultar).not.toHaveBeenCalled();
  });

  it("exige justificación no vacía antes de publicar una reseña", async () => {
    mockObtener.mockResolvedValue([RESENA_OCULTA_MODERACION]);

    render(
      <PanelModeracionModal isOpen onClose={vi.fn()} usuarioSesion={ADMIN} />,
    );

    await screen.findByText("Smartphone Pro");
    expect(screen.getByText("Oculta por moderación")).toBeDefined();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Publicar reseña de Usuario Autor",
      }),
    );

    expect(
      screen.getByText(
        "La justificación es obligatoria para ocultar o publicar esta reseña.",
      ),
    ).toBeDefined();
    expect(mockPublicar).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Justificación"), {
      target: { value: "Revisada y conforme a las normas." },
    });
    fireEvent.click(
      screen.getByRole("button", {
        name: "Publicar reseña de Usuario Autor",
      }),
    );

    await waitFor(() => {
      expect(mockPublicar).toHaveBeenCalledWith(
        15,
        "Revisada y conforme a las normas.",
      );
    });
    expect(
      await screen.findByText("Reseña de Usuario Autor publicada de nuevo."),
    ).toBeDefined();
    expect(screen.getByText("Visible")).toBeDefined();
  });

  it("mantiene la acción de ocultar cuando la reseña solo está oculta por reportes", async () => {
    mockObtener.mockResolvedValue([RESENA_OCULTA_REPORTES]);

    render(
      <PanelModeracionModal isOpen onClose={vi.fn()} usuarioSesion={ADMIN} />,
    );

    await screen.findByText("Smartphone Pro");

    expect(screen.getByText("Oculta por reportes")).toBeDefined();
    expect(
      screen.getByRole("button", {
        name: "Ocultar reseña de Usuario Autor",
      }),
    ).toBeDefined();
    expect(
      screen.queryByRole("button", {
        name: "Publicar reseña de Usuario Autor",
      }),
    ).toBeNull();
  });

  it("rechaza reportes en revisión sin exigir motivo", async () => {
    const reportesEnRevision: ResenaReportadaResponse = {
      ...RESENA_REPORTADA,
      reportesPendientes: 0,
      reportes: RESENA_REPORTADA.reportes.map((reporte) => ({
        ...reporte,
        estado: "EN_REVISION",
      })),
    };
    mockObtener.mockResolvedValue([reportesEnRevision]);
    render(
      <PanelModeracionModal isOpen onClose={vi.fn()} usuarioSesion={ADMIN} />,
    );

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Rechazar reportes de Usuario Autor",
      }),
    );

    await waitFor(() => {
      expect(mockRechazar).toHaveBeenCalledWith(15, undefined);
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

  it("deshabilita rechazar cuando hay reportes pendientes de iniciar revisión", async () => {
    const soloPendientes: ResenaReportadaResponse = {
      ...RESENA_REPORTADA,
      reportesPendientes: 2,
      reportes: RESENA_REPORTADA.reportes.map((reporte) => ({
        ...reporte,
        estado: "PENDIENTE",
      })),
    };
    mockObtener.mockResolvedValue([soloPendientes]);

    render(
      <PanelModeracionModal isOpen onClose={vi.fn()} usuarioSesion={ADMIN} />,
    );

    const button = await screen.findByRole("button", {
      name: "Rechazar reportes de Usuario Autor",
    });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(mockRechazar).not.toHaveBeenCalled();
  });

  it("envía el motivo opcional al rechazar reportes", async () => {
    mockObtener.mockResolvedValue([
      {
        ...RESENA_REPORTADA,
        reportesPendientes: 0,
        reportes: RESENA_REPORTADA.reportes.map((reporte) => ({
          ...reporte,
          estado: "EN_REVISION",
        })),
      },
    ]);
    render(
      <PanelModeracionModal isOpen onClose={vi.fn()} usuarioSesion={ADMIN} />,
    );

    await screen.findByText("Smartphone Pro");
    fireEvent.change(screen.getByLabelText("Justificación"), {
      target: { value: "Los reportes no tienen sustento." },
    });
    fireEvent.click(
      screen.getByRole("button", {
        name: "Rechazar reportes de Usuario Autor",
      }),
    );

    await waitFor(() => {
      expect(mockRechazar).toHaveBeenCalledWith(
        15,
        "Los reportes no tienen sustento.",
      );
    });
  });

  it("muestra el error de una acción sin perder la lista", async () => {
    mockOcultar.mockRejectedValue(
      new ApiError("No puedes moderar tu propia reseña.", 403),
    );

    render(
      <PanelModeracionModal isOpen onClose={vi.fn()} usuarioSesion={ADMIN} />,
    );

    await screen.findByText("Smartphone Pro");
    fireEvent.change(screen.getByLabelText("Justificación"), {
      target: { value: "Intento de moderación." },
    });
    fireEvent.click(
      screen.getByRole("button", {
        name: "Ocultar reseña de Usuario Autor",
      }),
    );

    const alerta = await screen.findByRole("alert");
    expect(alerta.textContent).toContain("No puedes moderar tu propia reseña.");
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

  it("separa la cola de reportes de la revisión automática en pestañas", async () => {
    vi.mocked(obtenerResenasEnRevision).mockResolvedValueOnce([]);
    render(<PanelModeracionModal isOpen onClose={vi.fn()} usuarioSesion={MODERADOR} />);

    const pestanaReportes = screen.getByRole("tab", { name: "Reseñas reportadas" });
    expect(pestanaReportes.getAttribute("aria-selected")).toBe("true");
    expect(obtenerResenasEnRevision).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("tab", { name: "Revisión automática" }));

    expect(await screen.findByText("No hay reseñas en revisión")).toBeDefined();
    expect(obtenerResenasEnRevision).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("tab", { name: "Revisión automática" }).getAttribute("aria-selected")).toBe("true");
  });

  it("muestra la cola de reportes de ofertas en su propia pestaña", async () => {
    vi.mocked(obtenerReportesOfertaModeracion).mockResolvedValueOnce([]);
    render(<PanelModeracionModal isOpen onClose={vi.fn()} usuarioSesion={MODERADOR} />);

    expect(obtenerReportesOfertaModeracion).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("tab", { name: "Reportes de ofertas" }));

    expect(await screen.findByText("No hay reportes de ofertas")).toBeDefined();
    expect(obtenerReportesOfertaModeracion).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("tab", { name: "Reportes de ofertas" }).getAttribute("aria-selected")).toBe("true");
  });

  it("muestra en cada pestaña cuántos pendientes tiene", async () => {
    vi.mocked(obtenerResumenPendientesModeracion).mockResolvedValue({
      revisionAutomatica: 3,
      reportesResenas: 1,
      reportesOfertas: 0,
      total: 4,
    });
    render(<PanelModeracionModal isOpen onClose={vi.fn()} usuarioSesion={MODERADOR} />);

    expect(
      await screen.findByRole("tab", { name: "Revisión automática (3 pendientes)" }),
    ).toBeDefined();
    expect(screen.getByRole("tab", { name: "Reseñas reportadas (1 pendiente)" })).toBeDefined();
    // Sin pendientes no se muestra número.
    expect(screen.getByRole("tab", { name: "Reportes de ofertas" })).toBeDefined();
  });

  it("actualiza el contador después de una decisión", async () => {
    render(<PanelModeracionModal isOpen onClose={vi.fn()} usuarioSesion={MODERADOR} />);
    await screen.findByText("Smartphone Pro");
    await waitFor(() => expect(obtenerResumenPendientesModeracion).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText("Justificación"), {
      target: { value: "Incumple las normas de la comunidad." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ocultar reseña de Usuario Autor" }));

    await screen.findByText("Reseña de Usuario Autor ocultada.");
    await waitFor(() => expect(obtenerResumenPendientesModeracion).toHaveBeenCalledTimes(2));
  });

  it("no consulta el contador con el panel cerrado", () => {
    render(<PanelModeracionModal isOpen={false} onClose={vi.fn()} usuarioSesion={MODERADOR} />);
    expect(obtenerResumenPendientesModeracion).not.toHaveBeenCalled();
  });
});
