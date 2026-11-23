// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { TerminoModeracion } from "@/types/administracion";

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    obtenerTerminosModeracion: vi.fn(),
    crearTerminoModeracion: vi.fn(),
    desactivarTerminoModeracion: vi.fn(),
  };
});

import {
  ApiError,
  crearTerminoModeracion,
  desactivarTerminoModeracion,
  obtenerTerminosModeracion,
} from "@/services/api";
import AdminTerminosModeracion from "./AdminTerminosModeracion";

const mockListar = vi.mocked(obtenerTerminosModeracion);
const mockCrear = vi.mocked(crearTerminoModeracion);
const mockDesactivar = vi.mocked(desactivarTerminoModeracion);

const TERMINO: TerminoModeracion = {
  idTermino: 4,
  termino: "imbécil",
  categoria: "INSULTO",
  etiquetaCategoria: "Insulto",
  activo: true,
  creadoPor: "Admin Principal",
  fechaCreacion: "2026-11-22T10:00:00",
  desactivadoPor: null,
  fechaDesactivacion: null,
};

describe("AdminTerminosModeracion", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it("lista los términos activos con categoría y autor, y explica que solo los revisa el servidor", async () => {
    mockListar.mockResolvedValue([TERMINO]);
    render(<AdminTerminosModeracion />);

    expect(await screen.findByText("imbécil")).toBeDefined();
    expect(screen.getByText("Insulto")).toBeDefined();
    expect(screen.getByText(/Admin Principal/)).toBeDefined();
    expect(screen.getByText(/solo las revisa el servidor/)).toBeDefined();
    expect(mockListar).toHaveBeenCalledWith("ACTIVOS");
  });

  it("muestra el estado vacío", async () => {
    mockListar.mockResolvedValue([]);
    render(<AdminTerminosModeracion />);
    expect(await screen.findByText("No hay términos agregados.")).toBeDefined();
  });

  it("agrega un término con su categoría", async () => {
    mockListar.mockResolvedValue([]);
    mockCrear.mockResolvedValue({ ...TERMINO, idTermino: 9, termino: "gana dinero", categoria: "SPAM", etiquetaCategoria: "Spam" });
    render(<AdminTerminosModeracion />);
    await screen.findByText("No hay términos agregados.");

    fireEvent.click(screen.getByRole("button", { name: "Agregar término" }));
    expect(await screen.findByText("Escribe el término.")).toBeDefined();
    expect(mockCrear).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Término"), { target: { value: "gana dinero" } });
    fireEvent.change(screen.getByLabelText("Categoría"), { target: { value: "SPAM" } });
    fireEvent.click(screen.getByRole("button", { name: "Agregar término" }));

    await waitFor(() => expect(mockCrear).toHaveBeenCalledWith("gana dinero", "SPAM"));
    expect(await screen.findByText("gana dinero")).toBeDefined();
  });

  it("muestra el error del servidor al agregar", async () => {
    mockListar.mockResolvedValue([]);
    mockCrear.mockRejectedValue(new ApiError("Ese término ya está en la lista base del filtro.", 409));
    render(<AdminTerminosModeracion />);
    await screen.findByText("No hay términos agregados.");

    fireEvent.change(screen.getByLabelText("Término"), { target: { value: "idiota" } });
    fireEvent.click(screen.getByRole("button", { name: "Agregar término" }));

    expect(await screen.findByText("Ese término ya está en la lista base del filtro.")).toBeDefined();
  });

  it("desactivar pide confirmación y quita el término de la lista", async () => {
    mockListar.mockResolvedValue([TERMINO]);
    mockDesactivar.mockResolvedValue({ ...TERMINO, activo: false, desactivadoPor: "Admin Principal" });
    render(<AdminTerminosModeracion />);

    fireEvent.click(await screen.findByRole("button", { name: "Desactivar imbécil" }));
    expect(screen.getByText(/¿Desactivar «imbécil»\?/)).toBeDefined();
    expect(mockDesactivar).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Sí, desactivar" }));
    await waitFor(() => expect(mockDesactivar).toHaveBeenCalledWith(4));
    await waitFor(() => expect(screen.queryByText("imbécil")).toBeNull());
  });

  it("el filtro de inactivos muestra quién lo desactivó", async () => {
    mockListar.mockResolvedValueOnce([TERMINO]).mockResolvedValueOnce([
      { ...TERMINO, activo: false, desactivadoPor: "Otra Admin", fechaDesactivacion: "2026-11-22T12:00:00" },
    ]);
    render(<AdminTerminosModeracion />);
    await screen.findByText("imbécil");

    fireEvent.change(screen.getByLabelText("Mostrar"), { target: { value: "INACTIVOS" } });

    await waitFor(() => expect(mockListar).toHaveBeenLastCalledWith("INACTIVOS"));
    expect(await screen.findByText(/Desactivado por Otra Admin/)).toBeDefined();
    expect(screen.queryByRole("button", { name: "Desactivar imbécil" })).toBeNull();
  });
});
