// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReporteOfertaModeracionResponse } from "@/types/moderacion";

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    obtenerReportesOfertaModeracion: vi.fn(),
    decidirReporteOferta: vi.fn(),
  };
});

import { ApiError, decidirReporteOferta, obtenerReportesOfertaModeracion } from "@/services/api";
import ColaReportesOfertas, { MENSAJE_JUSTIFICACION_RECHAZO_OFERTA } from "./ColaReportesOfertas";

const mockObtener = vi.mocked(obtenerReportesOfertaModeracion);
const mockDecidir = vi.mocked(decidirReporteOferta);

const pendiente: ReporteOfertaModeracionResponse = {
  idReporte: 5,
  idProducto: 3,
  nombreProducto: "Galaxy Buds FE",
  idEstablecimiento: 8,
  nombreEstablecimiento: "Tienda Centro",
  precioActual: 95000,
  disponibilidadActual: true,
  idUsuario: 11,
  nombreUsuario: "laura",
  motivo: "precio_incorrecto",
  descripcion: "En la tienda cuesta 120.000",
  estado: "PENDIENTE",
  fechaCreacion: "2026-11-20T10:00:00",
  fechaActualizacion: "2026-11-20T10:00:00",
  historial: [],
};

afterEach(() => {
  cleanup();
  mockObtener.mockReset();
  mockDecidir.mockReset();
});

describe("ColaReportesOfertas", () => {
  it("lista los reportes abiertos con el precio actual y el motivo", async () => {
    const cerrado = { ...pendiente, idReporte: 6, estado: "RECHAZADO" as const, descripcion: "Cerrado" };
    mockObtener.mockResolvedValueOnce([pendiente, cerrado]);
    render(<ColaReportesOfertas />);

    expect(await screen.findByText("En la tienda cuesta 120.000")).toBeDefined();
    expect(screen.getByText("Precio incorrecto")).toBeDefined();
    expect(screen.getByText(/95\.000/)).toBeDefined();
    expect(screen.getByText("Galaxy Buds FE")).toBeDefined();
    // «Abiertos» oculta los ya resueltos.
    expect(screen.queryByText("Cerrado")).toBeNull();
    expect(mockObtener).toHaveBeenCalledWith(undefined);
  });

  it("filtra por estado consultando al backend", async () => {
    mockObtener.mockResolvedValueOnce([pendiente]);
    render(<ColaReportesOfertas />);
    await screen.findByText("En la tienda cuesta 120.000");

    mockObtener.mockResolvedValueOnce([]);
    fireEvent.click(screen.getByRole("button", { name: "Aceptados" }));

    expect(await screen.findByText("No hay reportes de ofertas con este estado.")).toBeDefined();
    expect(mockObtener).toHaveBeenLastCalledWith("ACEPTADO");
  });

  it("exige justificación para rechazar y no llama a la API sin ella", async () => {
    mockObtener.mockResolvedValueOnce([pendiente]);
    render(<ColaReportesOfertas />);
    await screen.findByText("En la tienda cuesta 120.000");

    fireEvent.click(screen.getByRole("button", { name: "Rechazar reporte 5" }));

    expect(screen.getByText(MENSAJE_JUSTIFICACION_RECHAZO_OFERTA)).toBeDefined();
    expect(mockDecidir).not.toHaveBeenCalled();
  });

  it("al tomar un reporte lo muestra en revisión con su historial", async () => {
    mockObtener.mockResolvedValueOnce([pendiente]);
    mockDecidir.mockResolvedValueOnce({
      ...pendiente,
      estado: "EN_REVISION",
      historial: [{
        idHistorial: 1,
        estadoAnterior: "PENDIENTE",
        estadoNuevo: "EN_REVISION",
        idModerador: 2,
        nombreModerador: "mod",
        justificacion: null,
        fechaEvento: "2026-11-20T11:00:00",
      }],
    });
    render(<ColaReportesOfertas />);
    await screen.findByText("En la tienda cuesta 120.000");

    fireEvent.click(screen.getByRole("button", { name: "Tomar reporte 5" }));

    expect(await screen.findByText(/Tomaste el reporte sobre Galaxy Buds FE en Tienda Centro/)).toBeDefined();
    expect(mockDecidir).toHaveBeenCalledWith(5, "en-revision", undefined);
    expect(screen.getByText(/En revisión por mod/)).toBeDefined();
    expect(screen.queryByRole("button", { name: "Tomar reporte 5" })).toBeNull();
  });

  it("al aceptar retira el reporte de la vista de abiertos y recuerda corregir la oferta", async () => {
    mockObtener.mockResolvedValueOnce([pendiente]);
    mockDecidir.mockResolvedValueOnce({ ...pendiente, estado: "ACEPTADO" });
    render(<ColaReportesOfertas />);
    await screen.findByText("En la tienda cuesta 120.000");

    fireEvent.change(screen.getByLabelText("Justificación"), { target: { value: "Precio real 120.000" } });
    fireEvent.click(screen.getByRole("button", { name: "Aceptar reporte 5" }));

    expect(await screen.findByText(/aceptado\. Recuerda corregir el dato de la oferta/)).toBeDefined();
    expect(mockDecidir).toHaveBeenCalledWith(5, "aceptar", "Precio real 120.000");
    await waitFor(() => expect(screen.queryByText("En la tienda cuesta 120.000")).toBeNull());
  });

  it("muestra el error del backend si la decisión falla", async () => {
    mockObtener.mockResolvedValueOnce([pendiente]);
    mockDecidir.mockRejectedValueOnce(new ApiError("No puedes resolver un reporte creado por ti.", 403));
    render(<ColaReportesOfertas />);
    await screen.findByText("En la tienda cuesta 120.000");

    fireEvent.click(screen.getByRole("button", { name: "Aceptar reporte 5" }));

    expect(await screen.findByText("No puedes resolver un reporte creado por ti.")).toBeDefined();
  });

  it("ofrece reintentar si la carga falla", async () => {
    mockObtener.mockRejectedValueOnce(new ApiError("Servidor no disponible", 500));
    render(<ColaReportesOfertas />);

    expect(await screen.findByText("Servidor no disponible")).toBeDefined();
    mockObtener.mockResolvedValueOnce([]);
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("No hay reportes de ofertas")).toBeDefined();
  });
});
