// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ApelacionModeracion } from "@/types/moderacion";

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return { ...actual, obtenerApelacionesModeracion: vi.fn(), resolverApelacion: vi.fn() };
});

import { obtenerApelacionesModeracion, resolverApelacion } from "@/services/api";
import ColaApelaciones from "./ColaApelaciones";

const mockCola = vi.mocked(obtenerApelacionesModeracion);
const mockResolver = vi.mocked(resolverApelacion);

const APELACION: ApelacionModeracion = {
  idApelacion: 5,
  estado: "PENDIENTE",
  motivoApelacion: "No era ofensivo",
  respuesta: null,
  fechaSolicitud: "2026-11-21T10:00:00",
  fechaResolucion: null,
  idResena: 8,
  nombreProducto: "Smartphone Pro",
  comentarioRevisado: "Texto que se revisó",
  accion: "RECHAZAR",
  motivoDecision: "Lenguaje ofensivo",
  fechaDecision: "2026-11-20T10:00:00",
  idAutor: 3,
  nombreAutor: "Usuario Autor",
  nombreModeradorOriginal: "Moderador Original",
  nombreModeradorResolucion: null,
  puedeResolver: true,
};

describe("ColaApelaciones", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it("muestra la decisión original y el motivo del autor", async () => {
    mockCola.mockResolvedValue([APELACION]);
    render(<ColaApelaciones />);

    expect(await screen.findByText("Texto que se revisó")).toBeDefined();
    expect(screen.getByText(/Lenguaje ofensivo/)).toBeDefined();
    expect(screen.getByText(/Moderador Original/)).toBeDefined();
    expect(screen.getByText(/No era ofensivo/)).toBeDefined();
  });

  it("acepta con respuesta opcional y avisa del cambio", async () => {
    mockCola.mockResolvedValue([APELACION]);
    mockResolver.mockResolvedValue({ ...APELACION, estado: "ACEPTADA", puedeResolver: false });
    const onCambio = vi.fn();
    render(<ColaApelaciones onCambio={onCambio} />);

    fireEvent.click(await screen.findByRole("button", { name: "Aceptar la apelación de Usuario Autor" }));

    await waitFor(() => expect(mockResolver).toHaveBeenCalledWith(5, "aceptar", undefined));
    expect(onCambio).toHaveBeenCalled();
    expect(await screen.findByText(/aceptada/i)).toBeDefined();
  });

  it("rechazar exige una respuesta", async () => {
    mockCola.mockResolvedValue([APELACION]);
    mockResolver.mockResolvedValue({ ...APELACION, estado: "RECHAZADA", puedeResolver: false });
    render(<ColaApelaciones />);

    fireEvent.click(await screen.findByRole("button", { name: "Rechazar la apelación de Usuario Autor" }));
    expect(await screen.findByText("Escribe una respuesta para el autor al rechazar la apelación.")).toBeDefined();
    expect(mockResolver).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Respuesta para el autor"), { target: { value: "Se mantiene" } });
    fireEvent.click(screen.getByRole("button", { name: "Rechazar la apelación de Usuario Autor" }));
    await waitFor(() => expect(mockResolver).toHaveBeenCalledWith(5, "rechazar", "Se mantiene"));
  });

  it("con conflicto de interés deshabilita los botones y lo explica", async () => {
    mockCola.mockResolvedValue([{ ...APELACION, puedeResolver: false }]);
    render(<ColaApelaciones />);

    expect(await screen.findByText("Tú tomaste la decisión original; debe resolverla otra persona.")).toBeDefined();
    expect((screen.getByRole("button", { name: "Aceptar la apelación de Usuario Autor" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Rechazar la apelación de Usuario Autor" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("sin apelaciones muestra el estado vacío", async () => {
    mockCola.mockResolvedValue([]);
    render(<ColaApelaciones />);
    expect(await screen.findByText("No hay apelaciones pendientes")).toBeDefined();
  });
});
