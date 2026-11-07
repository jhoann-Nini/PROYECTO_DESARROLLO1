// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { reportarResena } from "@/services/api";
import ReportarResenaModal from "./ReportarResenaModal";

vi.mock("@/services/api", () => ({
  reportarResena: vi.fn(),
}));

const mockReportar = vi.mocked(reportarResena);

function renderModal(
  overrides: {
    abierto?: boolean;
    onCerrar?: () => void;
    onReportado?: (
      resenaId: number,
      motivo: "spam" | "lenguaje-ofensivo" | "falso" | "otro",
      descripcion: string
    ) => Promise<void>;
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

afterEach(() => {
  cleanup();
  mockReportar.mockReset();
  mockReportar.mockResolvedValue(undefined);
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

  it("persiste el reporte y cierra solo cuando el backend confirma", async () => {
    const onReportado = vi.fn();
    const onCerrar = vi.fn();
    renderModal({ onReportado, onCerrar });

    const dialogo = screen.getByRole("dialog");
    fireEvent.click(within(dialogo).getByRole("radio", { name: "Spam" }));
    fireEvent.click(
      within(dialogo).getByRole("button", { name: "Enviar reporte" })
    );

    await waitFor(() => {
      expect(mockReportar).toHaveBeenCalledWith(7, { motivo: "spam" });
      expect(onReportado).toHaveBeenCalledWith(7, "spam", "");
      expect(onCerrar).toHaveBeenCalled();
    });
  });

  it("exige una descripción para el motivo Otro", () => {
    renderModal();
    const dialogo = screen.getByRole("dialog");
    fireEvent.click(within(dialogo).getByRole("radio", { name: "Otro" }));
    fireEvent.click(within(dialogo).getByRole("button", { name: "Enviar reporte" }));

    expect(mockReportar).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain("Cuéntanos qué ocurre");
  });

  it("mantiene el modal abierto si el backend rechaza el reporte", async () => {
    mockReportar.mockRejectedValueOnce(new Error("Ya has reportado esta reseña previamente."));
    renderModal();
    const dialogo = screen.getByRole("dialog");
    fireEvent.click(within(dialogo).getByRole("radio", { name: "Spam" }));
    fireEvent.click(within(dialogo).getByRole("button", { name: "Enviar reporte" }));

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
