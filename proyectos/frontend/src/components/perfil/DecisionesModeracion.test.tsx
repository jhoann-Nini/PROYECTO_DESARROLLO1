// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { DecisionApelable } from "@/types/moderacion";

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return { ...actual, obtenerMisDecisiones: vi.fn(), crearApelacion: vi.fn() };
});

import { crearApelacion, obtenerMisDecisiones } from "@/services/api";
import DecisionesModeracion from "./DecisionesModeracion";

const mockDecisiones = vi.mocked(obtenerMisDecisiones);
const mockCrear = vi.mocked(crearApelacion);

const APELABLE: DecisionApelable = {
  idAuditoria: 31,
  idResena: 8,
  nombreProducto: "Smartphone Pro",
  comentarioRevisado: "Texto que se revisó",
  accion: "RECHAZAR",
  motivoDecision: "Lenguaje ofensivo",
  fechaDecision: "2026-11-20T10:00:00",
  plazoHasta: "2026-12-05T10:00:00",
  apelable: true,
  apelacion: null,
};

describe("DecisionesModeracion", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it("no muestra nada sin decisiones", async () => {
    mockDecisiones.mockResolvedValue([]);
    const { container } = render(<DecisionesModeracion idUsuario={1} />);
    await waitFor(() => expect(mockDecisiones).toHaveBeenCalled());
    expect(container.textContent).toBe("");
  });

  it("muestra la decisión con su motivo y el botón Apelar", async () => {
    mockDecisiones.mockResolvedValue([APELABLE]);
    render(<DecisionesModeracion idUsuario={1} />);

    expect(await screen.findByText("Smartphone Pro")).toBeDefined();
    expect(screen.getByText(/Lenguaje ofensivo/)).toBeDefined();
    expect(screen.getByText("Texto que se revisó")).toBeDefined();
    expect(screen.getByRole("button", { name: "Apelar la decisión sobre Smartphone Pro" })).toBeDefined();
  });

  it("exige motivo y envía la apelación", async () => {
    mockDecisiones.mockResolvedValue([APELABLE]);
    mockCrear.mockResolvedValue({
      idApelacion: 5, estado: "PENDIENTE", motivo: "No era ofensivo", respuesta: null,
      fechaSolicitud: "2026-11-22T10:00:00", fechaResolucion: null,
    });
    render(<DecisionesModeracion idUsuario={1} />);
    fireEvent.click(await screen.findByRole("button", { name: "Apelar la decisión sobre Smartphone Pro" }));

    expect(screen.getByText(/Puedes apelar hasta el 5 de diciembre de 2026/)).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Enviar apelación" }));
    expect(await screen.findByText("Explica por qué crees que la decisión fue un error.")).toBeDefined();
    expect(mockCrear).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Motivo de la apelación"), { target: { value: "No era ofensivo" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar apelación" }));

    await waitFor(() => expect(mockCrear).toHaveBeenCalledWith(8, "No era ofensivo"));
    expect(await screen.findByText("En revisión")).toBeDefined();
  });

  it("muestra el estado y la respuesta de una apelación resuelta", async () => {
    mockDecisiones.mockResolvedValue([{
      ...APELABLE,
      apelable: false,
      apelacion: {
        idApelacion: 5, estado: "RECHAZADA", motivo: "No era ofensivo",
        respuesta: "La decisión se mantiene", fechaSolicitud: "2026-11-21T10:00:00",
        fechaResolucion: "2026-11-22T10:00:00",
      },
    }]);
    render(<DecisionesModeracion idUsuario={1} />);

    expect(await screen.findByText("Rechazada")).toBeDefined();
    expect(screen.getByText(/La decisión se mantiene/)).toBeDefined();
    expect(screen.queryByRole("button", { name: /Apelar/ })).toBeNull();
  });

  it("fuera de plazo no ofrece apelar", async () => {
    mockDecisiones.mockResolvedValue([{ ...APELABLE, apelable: false }]);
    render(<DecisionesModeracion idUsuario={1} />);

    await screen.findByText("Smartphone Pro");
    expect(screen.queryByRole("button", { name: /Apelar/ })).toBeNull();
  });
});
