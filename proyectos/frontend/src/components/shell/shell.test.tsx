// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  usePathname: () => "/productos",
}));

import SiteHeader from "./SiteHeader";
import BottomNav from "./BottomNav";
import SiteFooter from "./SiteFooter";

afterEach(() => {
  cleanup();
});

describe("Shell de TecnoReview", () => {
  it("el header muestra la marca y enlaza a rutas existentes", () => {
    render(<SiteHeader />);

    const header = screen.getByRole("banner");
    expect(within(header).getByText("Tecno")).toBeDefined();
    expect(within(header).getByText("Review")).toBeDefined();

    const inicio = within(header).getByRole("link", { name: "Inicio" });
    expect(inicio.getAttribute("href")).toBe("/");

    const productos = within(header).getByRole("link", { name: "Productos" });
    expect(productos.getAttribute("href")).toBe("/productos");
    expect(productos.getAttribute("aria-current")).toBe("page");
  });

  it("marca las rutas futuras como no disponibles sin href", () => {
    render(<SiteHeader />);

    const header = screen.getByRole("banner");
    for (const etiqueta of ["Comparador", "Reseñas", "Blog"]) {
      const item = within(header).getByText(etiqueta);
      expect(item.getAttribute("aria-disabled")).toBe("true");
      expect(item.getAttribute("title")).toBe("Próximamente");
      expect(item.closest("a")).toBeNull();
    }
  });

  it("el bottom nav expone navegación accesible", () => {
    render(<BottomNav />);

    const nav = screen.getByRole("navigation", {
      name: /Navegación principal móvil/i,
    });
    expect(within(nav).getByRole("link", { name: "Inicio" })).toBeDefined();
    expect(within(nav).getByRole("link", { name: "Catálogo" })).toBeDefined();

    const comparador = within(nav).getByText("Comparador");
    expect(comparador.getAttribute("aria-disabled")).toBe("true");
    const perfil = within(nav).getByText("Perfil");
    expect(perfil.getAttribute("aria-disabled")).toBe("true");
  });

  it("el footer muestra la marca y el tagline", () => {
    render(<SiteFooter />);

    const footer = screen.getByRole("contentinfo");
    expect(
      within(footer).getByText(/© 2026 TecnoReview/i),
    ).toBeDefined();
    expect(
      within(footer).getByText(/Compara · Analiza · Decide/i),
    ).toBeDefined();
  });
});
