// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ApiError, crearReporteOferta } from "@/services/api";
import type { ReporteOfertaResponse } from "@/types/reporteOferta";
import ReportarOfertaModal from "./ReportarOfertaModal";

vi.mock("@/services/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/api")>()),
  crearReporteOferta: vi.fn(),
}));

const enviar = vi.mocked(crearReporteOferta);
const oferta = {
  idProducto: 204, idEstablecimiento: 17,
  nombreProducto: "Teléfono Test", nombreEstablecimiento: "Tienda Norte",
};
const exito: ReporteOfertaResponse = {
  idReporte: 42, idProducto: 204, idEstablecimiento: 17, motivo: "enlace_incorrecto" as const,
  descripcion: null, estado: "PENDIENTE", fechaCreacion: "2026-11-20T12:00:00",
};

function mostrar(props: Partial<React.ComponentProps<typeof ReportarOfertaModal>> = {}) {
  const onCerrar = vi.fn();
  const onReportado = vi.fn();
  const onPedirLogin = vi.fn();
  const boton = document.createElement("button");
  boton.textContent = "Abrir";
  document.body.append(boton);
  boton.focus();
  const vista = render(<ReportarOfertaModal
    oferta={oferta} onCerrar={onCerrar} onReportado={onReportado}
    onPedirLogin={onPedirLogin} {...props}
  />);
  return { ...vista, onCerrar, onReportado, onPedirLogin, boton };
}

beforeEach(() => {
  enviar.mockReset();
  enviar.mockResolvedValue(exito);
});
afterEach(() => {
  cleanup();
  document.body.querySelectorAll("button").forEach((boton) => {
    if (boton.textContent === "Abrir") boton.remove();
  });
});

describe("ReportarOfertaModal", () => {
  it("identifica producto y tienda, exige motivo y enfoca el primer campo", () => {
    mostrar();
    const dialogo = screen.getByRole("dialog", { name: "Reportar precio o enlace" });
    expect(within(dialogo).getByText(/Teléfono Test.*Tienda Norte/)).toBeDefined();
    const selector = within(dialogo).getByRole("combobox", { name: "Motivo" });
    expect(document.activeElement).toBe(selector);
    expect(within(dialogo).getByRole("option", { name: "Precio incorrecto" }).getAttribute("value")).toBe("precio_incorrecto");
    expect(within(dialogo).getByRole("option", { name: "Enlace incorrecto" }).getAttribute("value")).toBe("enlace_incorrecto");
    fireEvent.click(within(dialogo).getByRole("button", { name: "Enviar reporte" }));
    expect(enviar).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toMatch(/Selecciona un motivo/);
  });

  it("cuenta la descripción, limita a 2000 caracteres y manda el ID correcto", async () => {
    const { onReportado } = mostrar({ oferta: { ...oferta, idEstablecimiento: 32, nombreEstablecimiento: "Tienda Sur" } });
    const dialogo = screen.getByRole("dialog");
    fireEvent.change(within(dialogo).getByRole("combobox", { name: "Motivo" }), { target: { value: "enlace_incorrecto" } });
    const descripcion = within(dialogo).getByRole("textbox", { name: /Descripción/ });
    expect(descripcion.getAttribute("maxlength")).toBe("2000");
    fireEvent.change(descripcion, { target: { value: "  Enlace caído  " } });
    expect(within(dialogo).getByText("16/2000")).toBeDefined();
    fireEvent.click(within(dialogo).getByRole("button", { name: "Enviar reporte" }));

    await waitFor(() => expect(enviar).toHaveBeenCalledWith({
      idProducto: 204, idEstablecimiento: 32, motivo: "enlace_incorrecto", descripcion: "Enlace caído",
    }));
    expect(onReportado).toHaveBeenCalledOnce();
  });

  it("evita doble envío mientras espera y confirma únicamente tras éxito", async () => {
    let completar!: (value: typeof exito) => void;
    enviar.mockImplementationOnce(() => new Promise((resolve) => { completar = resolve; }));
    const { onReportado } = mostrar();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "precio_incorrecto" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar reporte" }));
    expect(screen.getByRole("button", { name: "Enviando…" }).hasAttribute("disabled")).toBe(true);
    expect(onReportado).not.toHaveBeenCalled();
    expect(enviar).toHaveBeenCalledTimes(1);
    completar({ ...exito, motivo: "precio_incorrecto" });
    await waitFor(() => expect(onReportado).toHaveBeenCalledOnce());
  });

  it("ofrece iniciar sesión si falta JWT y mantiene el formulario", async () => {
    enviar.mockRejectedValueOnce(new ApiError("Sin sesión", 401));
    const { onPedirLogin, onReportado } = mostrar();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "enlace_incorrecto" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar reporte" }));
    expect(await screen.findByRole("alert")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));
    expect(onPedirLogin).toHaveBeenCalledOnce();
    expect(onReportado).not.toHaveBeenCalled();
  });

  it("conserva los datos y muestra el error de backend para reintentar", async () => {
    enviar.mockRejectedValueOnce(new ApiError("No existe una oferta para el producto y establecimiento indicados.", 404));
    mostrar();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "precio_incorrecto" } });
    fireEvent.change(screen.getByRole("textbox", { name: /Descripción/ }), { target: { value: "Precio diferente" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar reporte" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/No existe una oferta/);
    expect((screen.getByRole("textbox", { name: /Descripción/ }) as HTMLTextAreaElement).value).toBe("Precio diferente");
  });

  it("cierra con Cancelar, cierre y Escape; atrapa el foco y lo devuelve al origen", () => {
    const { onCerrar, boton, unmount } = mostrar();
    const dialogo = screen.getByRole("dialog");
    const cierre = within(dialogo).getByRole("button", { name: "Cerrar" });
    expect(document.body.style.overflow).toBe("hidden");
    const enviarBoton = within(dialogo).getByRole("button", { name: "Enviar reporte" });
    enviarBoton.focus();
    fireEvent.keyDown(enviarBoton, { key: "Tab" });
    expect(document.activeElement).toBe(cierre);
    cierre.focus();
    fireEvent.keyDown(cierre, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(enviarBoton);
    fireEvent.click(within(dialogo).getByRole("button", { name: "Cancelar" }));
    expect(onCerrar).toHaveBeenCalledOnce();
    fireEvent.click(cierre);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onCerrar).toHaveBeenCalledTimes(3);
    unmount();
    expect(document.activeElement).toBe(boton);
    expect(document.body.style.overflow).toBe("");
  });
});
