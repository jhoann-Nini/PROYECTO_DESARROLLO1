// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

vi.mock("next/navigation", () => ({
  usePathname: () => "/productos",
}));

vi.mock("@/services/api", () => ({
  obtenerProductos: vi.fn().mockResolvedValue([]),
}));

import SiteHeader from "./SiteHeader";
import BottomNav from "./BottomNav";
import SiteFooter from "./SiteFooter";

afterEach(() => {
  cleanup();
});

describe("Shell de TecReview", () => {
  it("el header muestra la marca y enlaza a rutas existentes", () => {
    render(<SiteHeader />);

    const header = screen.getByRole("banner");
    expect(within(header).getByText("Tec")).toBeDefined();
    expect(within(header).getByText("Review")).toBeDefined();

    const inicio = within(header).getByRole("link", { name: "Inicio" });
    expect(inicio.getAttribute("href")).toBe("/");

    const productos = within(header).getByRole("link", { name: "Productos" });
    expect(productos.getAttribute("href")).toBe("/productos");
    expect(productos.getAttribute("aria-current")).toBe("page");

    const comparador = within(header).getByRole("link", {
      name: "Comparador",
    });
    expect(comparador.getAttribute("href")).toBe("/comparador");
  });

  it("enlaza las rutas secundarias del rediseño", () => {
    render(<SiteHeader />);

    const header = screen.getByRole("banner");
    for (const [etiqueta, href] of [
      ["Reseñas", "/resenas"],
      ["Blog", "/blog"],
      ["Favoritos", "/favoritos"],
    ]) {
      const item = within(header).getByRole("link", { name: etiqueta });
      expect(item.getAttribute("href")).toBe(href);
    }
  });

  it("el header renderiza las acciones que recibe", () => {
    render(
      <SiteHeader>
        <button type="button">Acción de sesión</button>
      </SiteHeader>
    );

    const header = screen.getByRole("banner");
    expect(
      within(header).getByRole("button", { name: "Acción de sesión" }),
    ).toBeDefined();
  });

  it("el header incluye el control de tema accesible", () => {
    render(<SiteHeader />);

    const header = screen.getByRole("banner");
    const botonTema = within(header).getByRole("button", {
      name: /Cambiar.*tema/i,
    });
    expect(botonTema.getAttribute("aria-label")).toMatch(/Cambiar/i);
  });

  it("abre el panel de búsqueda desde el botón y con Ctrl+K o Cmd+K", async () => {
    render(<SiteHeader />);

    const header = screen.getByRole("banner");
    const abrir = within(header).getByRole("button", {
      name: /Abrir búsqueda/i,
    });
    expect(abrir.getAttribute("aria-haspopup")).toBe("dialog");

    fireEvent.click(abrir);
    expect(await screen.findByRole("dialog")).toBeDefined();

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(await screen.findByRole("dialog")).toBeDefined();

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    fireEvent.keyDown(window, { key: "k", metaKey: true });
    expect(await screen.findByRole("dialog")).toBeDefined();
  });

  it("el bottom nav expone navegación accesible", () => {
    render(<BottomNav />);

    const nav = screen.getByRole("navigation", {
      name: /Navegación principal móvil/i,
    });
    expect(within(nav).getByRole("link", { name: "Inicio" })).toBeDefined();
    expect(within(nav).getByRole("link", { name: "Catálogo" })).toBeDefined();

    const comparador = within(nav).getByRole("link", {
      name: "Comparador",
    });
    expect(comparador.getAttribute("href")).toBe("/comparador");

    const favoritos = within(nav).getByRole("link", { name: "Favoritos" });
    expect(favoritos.getAttribute("href")).toBe("/favoritos");

    const perfil = within(nav).getByRole("link", { name: "Perfil" });
    expect(perfil.getAttribute("href")).toBe("/perfil");
  });

  it("el footer muestra la marca y el tagline", () => {
    render(<SiteFooter />);

    const footer = screen.getByRole("contentinfo");
    expect(
      within(footer).getByText(/© 2026 TecReview/i),
    ).toBeDefined();
    expect(
      within(footer).getByText(/Compara · Analiza · Decide/i),
    ).toBeDefined();
  });
});
