// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ResenaEnRevisionResponse } from "@/types/moderacion";

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    obtenerResenasEnRevision: vi.fn(),
    decidirRevisionResena: vi.fn(),
  };
});

import { ApiError, decidirRevisionResena, obtenerResenasEnRevision } from "@/services/api";
import ColaRevisionAutomatica, { MENSAJE_JUSTIFICACION_RECHAZO } from "./ColaRevisionAutomatica";

const mockObtener = vi.mocked(obtenerResenasEnRevision);
const mockDecidir = vi.mocked(decidirRevisionResena);

const retenida: ResenaEnRevisionResponse = {
  idResena: 7,
  idProducto: 3,
  nombreProducto: "Galaxy Buds FE",
  idUsuario: 11,
  nombreUsuario: "laura",
  comentario: "Más barato en www.otra-tienda.com",
  puntuacion: 4,
  fechaCreacion: "2026-11-20T10:00:00",
  estadoModeracion: "PENDIENTE",
  ocultaPorModeracion: false,
  ocultaPorReportes: false,
  motivosDeteccion: ["Contiene un enlace o dominio web"],
};

afterEach(() => {
  cleanup();
  mockObtener.mockReset();
  mockDecidir.mockReset();
});

describe("ColaRevisionAutomatica", () => {
  it("lista las reseñas retenidas con el motivo de la retención", async () => {
    mockObtener.mockResolvedValueOnce([retenida]);
    render(<ColaRevisionAutomatica />);

    expect(await screen.findByText("Más barato en www.otra-tienda.com")).toBeDefined();
    expect(screen.getByText(/Motivo de la retención: Contiene un enlace o dominio web/)).toBeDefined();
    expect(screen.getByText("Galaxy Buds FE")).toBeDefined();
  });

  it("marca con prioridad alta las posibles amenazas (Caso 6)", async () => {
    mockObtener.mockResolvedValueOnce([
      { ...retenida, idResena: 8, comentario: "te voy a matar", riesgo: "ALTO", motivosDeteccion: ["Posible amenaza o acoso"] },
      { ...retenida, riesgo: "MEDIO" },
    ]);
    render(<ColaRevisionAutomatica />);

    expect(await screen.findByText("te voy a matar")).toBeDefined();
    expect(screen.getAllByText("Prioridad alta")).toHaveLength(1);
    expect(screen.getByText(/Motivo de la retención: Posible amenaza o acoso/)).toBeDefined();
  });

  it("muestra un estado vacío cuando no hay reseñas retenidas", async () => {
    mockObtener.mockResolvedValueOnce([]);
    render(<ColaRevisionAutomatica />);

    expect(await screen.findByText("No hay reseñas en revisión")).toBeDefined();
  });

  it("exige justificación para rechazar y no llama a la API sin ella", async () => {
    mockObtener.mockResolvedValueOnce([retenida]);
    render(<ColaRevisionAutomatica />);

    fireEvent.click(await screen.findByRole("button", { name: "Rechazar reseña de laura" }));

    expect(screen.getByText(MENSAJE_JUSTIFICACION_RECHAZO)).toBeDefined();
    expect(mockDecidir).not.toHaveBeenCalled();
  });

  it("rechaza con justificación y retira la reseña de la cola", async () => {
    mockObtener.mockResolvedValueOnce([retenida]);
    mockDecidir.mockResolvedValueOnce({ ...retenida, estadoModeracion: "RECHAZADA" });
    render(<ColaRevisionAutomatica />);

    fireEvent.change(await screen.findByLabelText("Justificación"), {
      target: { value: "Publicidad de otra tienda" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Rechazar reseña de laura" }));

    await waitFor(() => {
      expect(mockDecidir).toHaveBeenCalledWith(7, "rechazar", "Publicidad de otra tienda");
    });
    expect(await screen.findByText("Reseña de laura rechazada. No se publicará.")).toBeDefined();
    expect(screen.queryByText("Más barato en www.otra-tienda.com")).toBeNull();
  });

  it("aprueba sin justificación obligatoria", async () => {
    mockObtener.mockResolvedValueOnce([retenida]);
    mockDecidir.mockResolvedValueOnce({ ...retenida, estadoModeracion: "PUBLICADA" });
    render(<ColaRevisionAutomatica />);

    fireEvent.click(await screen.findByRole("button", { name: "Aprobar reseña de laura" }));

    await waitFor(() => {
      expect(mockDecidir).toHaveBeenCalledWith(7, "aprobar", undefined);
    });
    expect(await screen.findByText("Reseña de laura aprobada y publicada.")).toBeDefined();
  });

  it("muestra el error del servidor y conserva la reseña", async () => {
    mockObtener.mockResolvedValueOnce([retenida]);
    mockDecidir.mockRejectedValueOnce(new ApiError("La reseña no está pendiente de revisión.", 409));
    render(<ColaRevisionAutomatica />);

    fireEvent.click(await screen.findByRole("button", { name: "Aprobar reseña de laura" }));

    expect(await screen.findByText("La reseña no está pendiente de revisión.")).toBeDefined();
    expect(screen.getByText("Más barato en www.otra-tienda.com")).toBeDefined();
  });
});
