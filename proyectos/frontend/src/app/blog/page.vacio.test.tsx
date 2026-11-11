// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

vi.mock("@/data/blog", () => ({
  ARTICULOS_BLOG: [],
  calcularMinutosLectura: () => 1,
}));

import BlogPage from "./page";

afterEach(() => {
  cleanup();
});

describe("Blog sin artículos", () => {
  it("muestra el estado vacío reutilizable con enlace al catálogo", () => {
    render(<BlogPage />);

    const estado = screen.getByRole("status");
    expect(estado.getAttribute("data-estado")).toBe("vacio");
    expect(
      screen.getByText("Todavía no hay guías publicadas."),
    ).toBeDefined();
    expect(
      screen.getByRole("link", { name: "Explorar catálogo" }).getAttribute(
        "href",
      ),
    ).toBe("/productos");
    expect(screen.queryByText("Más guías")).toBeNull();
  });
});
