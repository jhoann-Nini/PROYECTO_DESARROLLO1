// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ElementoRevisionComunidad, ReporteModeracionComunidad } from "@/types/comunidad";

const api = vi.hoisted(() => ({
  obtenerColaRevisionComunidad: vi.fn(),
  obtenerReportesComunidad: vi.fn(),
  decidirModeracionComunidad: vi.fn(),
  resolverReporteComunidad: vi.fn(),
}));
vi.mock("@/services/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/api")>()),
  ...api,
}));

import ColaComunidad from "./ColaComunidad";
import { ApiError } from "@/services/api";

const elemento: ElementoRevisionComunidad = {
  tipo: "PUBLICACION", id: 4, idPublicacion: 4, titulo: "Mala atención", contenido: "el vendedor es un idiota",
  autor: "Ana", fechaCreacion: "2026-11-25T10:00:00", riesgo: "MEDIO", motivos: ["Contiene lenguaje no permitido"],
};
const reporte: ReporteModeracionComunidad = {
  idReporte: 9, tipo: "RESPUESTA", idContenido: 12, idPublicacion: 4, titulo: "Mala atención", contenido: "compra en www.spam.com",
  autorContenido: "Luis", reportante: "Bea", motivo: "spam", descripcion: null, estado: "PENDIENTE",
  fechaCreacion: "2026-11-25T11:00:00", reportesActivos: 2, ocultaPorReportes: false, ocultaPorModeracion: false, eliminada: false,
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ColaComunidad", () => {
  it("muestra lo retenido con su riesgo y motivos", async () => {
    api.obtenerColaRevisionComunidad.mockResolvedValue([elemento]);
    render(<ColaComunidad onCambio={vi.fn()} />);
    expect(await screen.findByText("el vendedor es un idiota")).toBeTruthy();
    expect(screen.getByText(/riesgo medio/i)).toBeTruthy();
    expect(screen.getByText("Contiene lenguaje no permitido")).toBeTruthy();
  });

  it("aprobar exige un motivo", async () => {
    api.obtenerColaRevisionComunidad.mockResolvedValue([elemento]);
    render(<ColaComunidad onCambio={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: /aprobar/i }));
    expect(screen.getByRole("alert").textContent).toMatch(/motivo/i);
    expect(api.decidirModeracionComunidad).not.toHaveBeenCalled();
  });

  it("rechazar con motivo lo quita de la cola y avisa al panel", async () => {
    api.obtenerColaRevisionComunidad.mockResolvedValue([elemento]);
    api.decidirModeracionComunidad.mockResolvedValue({ estadoModeracion: "RECHAZADA" });
    const onCambio = vi.fn();
    render(<ColaComunidad onCambio={onCambio} />);
    fireEvent.change(await screen.findByLabelText(/motivo de la decisión/i), { target: { value: "Insulto a una persona" } });
    fireEvent.click(screen.getByRole("button", { name: /rechazar/i }));

    await waitFor(() => expect(screen.queryByText("el vendedor es un idiota")).toBeNull());
    expect(api.decidirModeracionComunidad).toHaveBeenCalledWith("publicaciones", 4, "rechazar", "Insulto a una persona");
    expect(onCambio).toHaveBeenCalled();
  });

  it("un 409 recarga la cola", async () => {
    api.obtenerColaRevisionComunidad.mockResolvedValueOnce([elemento]).mockResolvedValueOnce([]);
    api.decidirModeracionComunidad.mockRejectedValue(new ApiError("La acción no corresponde al estado actual del contenido.", 409));
    render(<ColaComunidad onCambio={vi.fn()} />);
    fireEvent.change(await screen.findByLabelText(/motivo de la decisión/i), { target: { value: "Correcto" } });
    fireEvent.click(screen.getByRole("button", { name: /aprobar/i }));

    await waitFor(() => expect(api.obtenerColaRevisionComunidad).toHaveBeenCalledTimes(2));
  });

  it("acepta un reporte eligiendo «Ocultar»", async () => {
    api.obtenerColaRevisionComunidad.mockResolvedValue([]);
    api.obtenerReportesComunidad.mockResolvedValue([reporte]);
    api.resolverReporteComunidad.mockResolvedValue({ idReporte: 9, estado: "ACEPTADO" });
    render(<ColaComunidad onCambio={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: /^reportes/i }));
    expect(await screen.findByText("compra en www.spam.com")).toBeTruthy();
    expect(screen.getByText(/2 reportes activos/i)).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/justificación/i), { target: { value: "Es spam" } });
    fireEvent.change(screen.getByLabelText(/al aceptar/i), { target: { value: "OCULTAR" } });
    fireEvent.click(screen.getByRole("button", { name: /^aceptar/i }));

    await waitFor(() => expect(api.resolverReporteComunidad).toHaveBeenCalledWith(9, "aceptar",
      { justificacion: "Es spam", accion: "OCULTAR" }));
  });
});
