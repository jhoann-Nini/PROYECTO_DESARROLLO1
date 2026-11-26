// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const api = vi.hoisted(() => ({ reportarContenidoComunidad: vi.fn() }));
vi.mock("@/services/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/api")>()),
  ...api,
}));

import ReportarContenidoModal from "./ReportarContenidoModal";
import { ApiError } from "@/services/api";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function abrir(extra: Partial<React.ComponentProps<typeof ReportarContenidoModal>> = {}) {
  const props = { tipo: "respuestas" as const, id: 8, onCerrar: vi.fn(), onReportado: vi.fn(), onPedirLogin: vi.fn(), ...extra };
  render(<ReportarContenidoModal {...props} />);
  return props;
}

describe("ReportarContenidoModal", () => {
  it("con «Otro» exige la descripción y no envía", () => {
    abrir();
    fireEvent.change(screen.getByLabelText(/motivo/i), { target: { value: "otro" } });
    fireEvent.click(screen.getByRole("button", { name: /enviar reporte/i }));
    expect(screen.getByRole("alert").textContent).toMatch(/describe/i);
    expect(api.reportarContenidoComunidad).not.toHaveBeenCalled();
  });

  it("envía el reporte y avisa", async () => {
    api.reportarContenidoComunidad.mockResolvedValue({ idReporte: 1, estado: "PENDIENTE" });
    const props = abrir();
    fireEvent.change(screen.getByLabelText(/motivo/i), { target: { value: "spam" } });
    fireEvent.click(screen.getByRole("button", { name: /enviar reporte/i }));

    await waitFor(() => expect(props.onReportado).toHaveBeenCalled());
    expect(api.reportarContenidoComunidad).toHaveBeenCalledWith("respuestas", 8, "spam", null);
  });

  it("un 409 dice que ya lo reportó", async () => {
    api.reportarContenidoComunidad.mockRejectedValue(new ApiError("Ya reportaste este contenido y tu reporte sigue abierto.", 409));
    abrir();
    fireEvent.change(screen.getByLabelText(/motivo/i), { target: { value: "spam" } });
    fireEvent.click(screen.getByRole("button", { name: /enviar reporte/i }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/ya reportaste/i));
  });

  it("un 429 muestra el mensaje del servidor", async () => {
    api.reportarContenidoComunidad.mockRejectedValue(new ApiError("Alcanzaste el límite de 10 reportes por hora.", 429));
    abrir();
    fireEvent.change(screen.getByLabelText(/motivo/i), { target: { value: "acoso" } });
    fireEvent.click(screen.getByRole("button", { name: /enviar reporte/i }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("10 reportes por hora"));
  });

  it("sin sesión (401) pide iniciar sesión", async () => {
    api.reportarContenidoComunidad.mockRejectedValue(new ApiError("Sin sesión", 401));
    const props = abrir();
    fireEvent.change(screen.getByLabelText(/motivo/i), { target: { value: "spam" } });
    fireEvent.click(screen.getByRole("button", { name: /enviar reporte/i }));
    await waitFor(() => expect(props.onPedirLogin).toHaveBeenCalled());
  });

  it("Escape cierra el diálogo", () => {
    const props = abrir();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(props.onCerrar).toHaveBeenCalled();
  });
});
