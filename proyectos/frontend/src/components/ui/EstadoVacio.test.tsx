// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import EstadoVacio from "./EstadoVacio";

afterEach(() => {
  cleanup();
});

describe("EstadoVacio", () => {
  it("representa un estado vacío como status con icono oculto y enlace", () => {
    render(
      <EstadoVacio
        titulo="Aún no tienes productos favoritos."
        descripcion="Usa el corazón para guardarlos."
        icono={<svg data-testid="icono-personalizado" />}
        accion={{ etiqueta: "Explorar catálogo", href: "/productos" }}
      />,
    );

    const estado = screen.getByRole("status");
    expect(estado.getAttribute("data-estado")).toBe("vacio");
    expect(
      screen.getByText("Aún no tienes productos favoritos."),
    ).toBeDefined();
    expect(screen.getByText("Usa el corazón para guardarlos.")).toBeDefined();

    const icono = screen.getByTestId("icono-personalizado");
    expect(icono.closest('[aria-hidden="true"]')).not.toBeNull();

    const enlace = screen.getByRole("link", { name: "Explorar catálogo" });
    expect(enlace.getAttribute("href")).toBe("/productos");
    expect(enlace.className).toContain("focus-visible:ring-2");
    expect(enlace.className).toContain(
      "focus-visible:ring-[var(--color-brand-blue)]",
    );
  });

  it("representa un error como alert y ejecuta la acción de reintento", () => {
    const reintentar = vi.fn();

    render(
      <EstadoVacio
        tipo="error"
        titulo="No pudimos cargar tus favoritos"
        descripcion="No fue posible conectarse con el servidor."
        accion={{ etiqueta: "Reintentar", onClick: reintentar }}
      />,
    );

    const alerta = screen.getByRole("alert");
    expect(alerta.getAttribute("data-estado")).toBe("error");
    expect(
      screen.getByText("No fue posible conectarse con el servidor."),
    ).toBeDefined();

    const boton = screen.getByRole("button", { name: "Reintentar" });
    expect(boton.className).toContain("focus-visible:ring-2");
    fireEvent.click(boton);
    expect(reintentar).toHaveBeenCalledTimes(1);
  });

  it("omite la acción cuando no se proporciona", () => {
    render(<EstadoVacio titulo="Sin resultados" />);

    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
