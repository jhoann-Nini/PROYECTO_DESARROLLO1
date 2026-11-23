// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/services/api", () => ({ obtenerCuentasReincidentes: vi.fn() }));

import { obtenerCuentasReincidentes } from "@/services/api";
import CuentasReincidentes from "./CuentasReincidentes";

const mockLista = vi.mocked(obtenerCuentasReincidentes);
const CUENTA = {
  idUsuario: 9,
  nombre: "Usuario Reincidente",
  correo: "reincidente@tecreview.com",
  faltas: 5,
  ultimaFalta: "2026-11-20T10:00:00",
};

describe("CuentasReincidentes", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it("lista nombre, correo y faltas, y avisa al pulsar Revisar", async () => {
    mockLista.mockResolvedValue([CUENTA]);
    const onRevisar = vi.fn();
    render(<CuentasReincidentes onRevisar={onRevisar} />);

    expect(await screen.findByText("Usuario Reincidente")).toBeDefined();
    expect(screen.getByText("reincidente@tecreview.com")).toBeDefined();
    expect(screen.getByText(/5 faltas/)).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Revisar la cuenta de Usuario Reincidente" }));
    expect(onRevisar).toHaveBeenCalledWith(CUENTA);
  });

  it("indica cuando no hay reincidentes", async () => {
    mockLista.mockResolvedValue([]);
    render(<CuentasReincidentes onRevisar={vi.fn()} />);
    expect(await screen.findByText("No hay cuentas con 4 faltas o más.")).toBeDefined();
  });

  it("si falla la carga lo dice sin romper el panel", async () => {
    mockLista.mockRejectedValue(new Error("sin conexión"));
    render(<CuentasReincidentes onRevisar={vi.fn()} />);
    expect(await screen.findByText("No fue posible cargar las cuentas reincidentes.")).toBeDefined();
  });
});
