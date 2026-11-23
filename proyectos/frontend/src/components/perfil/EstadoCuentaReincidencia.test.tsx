// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { EstadoReincidencia } from "@/types/moderacion";

vi.mock("@/services/api", () => ({ obtenerMiReincidencia: vi.fn() }));

import { obtenerMiReincidencia } from "@/services/api";
import EstadoCuentaReincidencia from "./EstadoCuentaReincidencia";

const mockEstado = vi.mocked(obtenerMiReincidencia);

const BASE: EstadoReincidencia = {
  faltas: 1,
  nivel: "AVISO",
  ultimaFalta: "2026-11-20T10:00:00",
  revisionPreviaHasta: null,
  bloqueoHasta: null,
  proximaCaducidad: "2027-02-18T10:00:00",
};

describe("EstadoCuentaReincidencia", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it("no muestra nada sin faltas", async () => {
    mockEstado.mockResolvedValue({ ...BASE, faltas: 0, nivel: "NINGUNO", proximaCaducidad: null, ultimaFalta: null });
    const { container } = render(<EstadoCuentaReincidencia idUsuario={7} />);
    await waitFor(() => expect(mockEstado).toHaveBeenCalled());
    expect(container.textContent).toBe("");
  });

  it("no muestra nada si la consulta falla", async () => {
    mockEstado.mockRejectedValue(new Error("sin conexión"));
    const { container } = render(<EstadoCuentaReincidencia idUsuario={7} />);
    await waitFor(() => expect(mockEstado).toHaveBeenCalled());
    expect(container.textContent).toBe("");
  });

  it("no consulta sin usuario", () => {
    render(<EstadoCuentaReincidencia idUsuario={undefined} />);
    expect(mockEstado).not.toHaveBeenCalled();
  });

  it("muestra el aviso con las faltas y la caducidad", async () => {
    mockEstado.mockResolvedValue(BASE);
    render(<EstadoCuentaReincidencia idUsuario={7} />);

    const estado = await screen.findByRole("status");
    expect(estado.textContent).toContain("Una de tus reseñas fue rechazada por moderación.");
    expect(estado.textContent).toContain("Faltas en los últimos 90 días: 1.");
    expect(estado.textContent).toContain("La más antigua deja de contar el 18 de febrero de 2027");
  });

  it("muestra hasta cuándo dura la revisión previa", async () => {
    mockEstado.mockResolvedValue({
      ...BASE, faltas: 2, nivel: "REVISION_PREVIA", revisionPreviaHasta: "2026-12-20T10:00:00",
    });
    render(<EstadoCuentaReincidencia idUsuario={7} />);

    expect((await screen.findByRole("status")).textContent).toContain(
      "Tus reseñas pasarán por revisión antes de publicarse hasta el 20 de diciembre de 2026",
    );
  });

  it("muestra hasta cuándo dura el bloqueo", async () => {
    mockEstado.mockResolvedValue({
      ...BASE, faltas: 3, nivel: "BLOQUEO", bloqueoHasta: "2026-11-27T10:00:00", revisionPreviaHasta: "2026-12-20T10:00:00",
    });
    render(<EstadoCuentaReincidencia idUsuario={7} />);

    expect((await screen.findByRole("status")).textContent).toContain(
      "No puedes publicar ni reportar hasta el 27 de noviembre de 2026",
    );
  });
});
