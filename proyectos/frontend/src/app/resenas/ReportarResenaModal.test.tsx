// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { crearReporteResena } from "@/services/api";
import ReportarResenaModal from "./ReportarResenaModal";

vi.mock("@/services/api", () => ({
  crearReporteResena: vi.fn(),
}));

const mockCrearReporte = vi.mocked(crearReporteResena);

function renderModal(
  overrides: {
    abierto?: boolean;
    onCerrar?: () => void;
    onReportado?: (resenaId: number) => void;
  } = {}
) {
  return render(
    <ReportarResenaModal
      resenaId={7}
      abierto={overrides.abierto ?? true}
      onCerrar={overrides.onCerrar ?? vi.fn()}
      onReportado={overrides.onReportado ?? vi.fn()}
    />
  );
}

beforeEach(() => {
  mockCrearReporte.mockReset();
  mockCrearReporte.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
});

describe("ReportarResenaModal", () => {
  it("no expone el diálogo cuando está cerrado", () => {
    renderModal({ abierto: false });

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("expone los motivos y enfoca el primer control", () => {
    renderModal();

    const dialogo = screen.getByRole("dialog", { name: "Reportar reseña" });
    const motivos = within(dialogo).getAllByRole("radio");

    expect(motivos.map((radio) => radio.getAttribute("value"))).toEqual([
      "spam",
      "lenguaje-ofensivo",
      "falso",
      "otro",
    ]);
    expect(document.activeElement).toBe(motivos[0]);
  });

  it("no envía sin motivo seleccionado", () => {
    const onReportado = vi.fn();
    renderModal({ onReportado });

    fireEvent.click(screen.getByRole("button", { name: "Enviar reporte" }));

    expect(onReportado).not.toHaveBeenCalled();
    expect(
      screen.getByText("Selecciona un motivo para continuar.")
    ).toBeDefined();
  });

  it("muestra el campo de detalle solo al elegir Otro", () => {
    renderModal();

    const dialogo = screen.getByRole("dialog");
    expect(within(dialogo).queryByLabelText("Cuéntanos qué ocurre"))
      .toBeNull();

    fireEvent.click(within(dialogo).getByRole("radio", { name: "Otro" }));

    expect(within(dialogo).getByLabelText("Cuéntanos qué ocurre"))
      .toBeDefined();
  });

  it("persiste el reporte y cierra solo después de una respuesta exitosa", async () => {
    const onReportado = vi.fn();
    const onCerrar = vi.fn();
    renderModal({ onReportado, onCerrar });

    const dialogo = screen.getByRole("dialog");
    fireEvent.click(within(dialogo).getByRole("radio", { name: "Spam" }));
    fireEvent.click(
      within(dialogo).getByRole("button", { name: "Enviar reporte" })
    );

    await waitFor(() => {
      expect(mockCrearReporte).toHaveBeenCalledWith(7, { motivo: "spam" });
      expect(onReportado).toHaveBeenCalledWith(7);
      expect(onCerrar).toHaveBeenCalled();
    });
  });

  it("exige descripción cuando el motivo es Otro", async () => {
    renderModal();
    const dialogo = screen.getByRole("dialog");
    fireEvent.click(within(dialogo).getByRole("radio", { name: "Otro" }));
    fireEvent.click(
      within(dialogo).getByRole("button", { name: "Enviar reporte" })
    );

    expect(
      screen.getByText("La descripción es obligatoria cuando el motivo es 'otro'.")
    ).toBeDefined();
    expect(mockCrearReporte).not.toHaveBeenCalled();
  });

  it("mantiene el modal abierto y muestra error si falla el backend", async () => {
    mockCrearReporte.mockRejectedValueOnce(new Error("No autorizado"));
    renderModal();
    const dialogo = screen.getByRole("dialog");
    fireEvent.click(within(dialogo).getByRole("radio", { name: "Spam" }));
    fireEvent.click(
      within(dialogo).getByRole("button", { name: "Enviar reporte" })
    );

    expect(await screen.findByRole("alert")).toBeDefined();
    expect(screen.getByRole("dialog")).toBeDefined();
  });

  it("cierra con Cancelar, Escape y el fondo", () => {
    const onCerrar = vi.fn();
    renderModal({ onCerrar });

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCerrar).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onCerrar).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByTestId("backdrop-reporte"));
    expect(onCerrar).toHaveBeenCalledTimes(3);
  });

  it("atrapa el foco y bloquea el scroll mientras está abierto", () => {
    const { rerender } = renderModal();

    const dialogo = screen.getByRole("dialog");
    const enviar = within(dialogo).getByRole("button", {
      name: "Enviar reporte",
    });

    expect(document.body.style.overflow).toBe("hidden");

    enviar.focus();
    fireEvent.keyDown(enviar, { key: "Tab" });
    expect(document.activeElement).toBe(
      within(dialogo).getAllByRole("radio")[0]
    );

    fireEvent.keyDown(window, { key: "Escape" });

    rerender(
      <ReportarResenaModal
        resenaId={7}
        abierto={false}
        onCerrar={vi.fn()}
        onReportado={vi.fn()}
      />
    );

    expect(document.body.style.overflow).toBe("");
  });
});
