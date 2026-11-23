// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

vi.mock("@/services/api", () => ({
  obtenerResumenPendientesModeracion: vi.fn(),
}));

import { obtenerResumenPendientesModeracion } from "@/services/api";
import {
  INTERVALO_RESUMEN_PENDIENTES_MS,
  useResumenPendientesModeracion,
} from "./useResumenPendientesModeracion";

const mockResumen = vi.mocked(obtenerResumenPendientesModeracion);
const RESUMEN = { revisionAutomatica: 2, reportesResenas: 1, reportesOfertas: 0, apelaciones: 0, total: 3 };

describe("useResumenPendientesModeracion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResumen.mockResolvedValue(RESUMEN);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("no consulta mientras está deshabilitado", () => {
    const { result } = renderHook(() => useResumenPendientesModeracion(false));
    expect(result.current.resumen).toBeNull();
    expect(mockResumen).not.toHaveBeenCalled();
  });

  it("carga el resumen al habilitarse y vuelve a consultar con recargar", async () => {
    const { result } = renderHook(() => useResumenPendientesModeracion(true));
    await waitFor(() => expect(result.current.resumen).toEqual(RESUMEN));

    act(() => result.current.recargar());
    await waitFor(() => expect(mockResumen).toHaveBeenCalledTimes(2));
  });

  it("si la consulta falla devuelve null sin lanzar error", async () => {
    mockResumen.mockRejectedValueOnce(new Error("sin conexión"));
    const { result } = renderHook(() => useResumenPendientesModeracion(true));
    await waitFor(() => expect(mockResumen).toHaveBeenCalledTimes(1));
    expect(result.current.resumen).toBeNull();
  });

  it("se actualiza solo cada minuto", async () => {
    vi.useFakeTimers();
    renderHook(() => useResumenPendientesModeracion(true));
    expect(mockResumen).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(INTERVALO_RESUMEN_PENDIENTES_MS);
    });
    expect(mockResumen).toHaveBeenCalledTimes(2);
  });
});
