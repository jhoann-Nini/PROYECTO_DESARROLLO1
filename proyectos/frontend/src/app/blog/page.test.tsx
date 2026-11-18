// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ARTICULOS_BLOG } from "@/data/blog";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

import BlogPage from "./page";
import ArticuloBlogPage, { generateStaticParams } from "./[slug]/page";

afterEach(() => {
  cleanup();
});

describe("Blog", () => {
  it("lista el artículo destacado y las demás guías", () => {
    render(<BlogPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Blog de TecReview" }),
    ).toBeDefined();
    expect(
      screen.getByRole("heading", { level: 2, name: ARTICULOS_BLOG[0].titulo }),
    ).toBeDefined();

    for (const articulo of ARTICULOS_BLOG.slice(1)) {
      expect(screen.getByText(articulo.titulo)).toBeDefined();
    }
  });

  it("enlaza todas las guías, la categoría destacada y el comparador", () => {
    render(<BlogPage />);

    for (const articulo of ARTICULOS_BLOG) {
      const enlaces = screen.getAllByRole("link", { name: articulo.titulo });
      expect(
        enlaces.some(
          (enlace) =>
            enlace.getAttribute("href") === `/blog/${articulo.slug}`,
        ),
      ).toBe(true);
    }

    const destacado = ARTICULOS_BLOG[0];
    expect(
      screen
        .getByRole("link", {
          name: `Ver ${destacado.categoriaEtiqueta} en el catálogo →`,
        })
        .getAttribute("href"),
    ).toBe(`/categorias/${destacado.categoriaSlug}`);
    expect(
      screen
        .getByRole("link", { name: "Abrir comparador" })
        .getAttribute("href"),
    ).toBe("/comparador");
  });

  it("describe la ausencia de datos sin prometer un marcador en la ficha", () => {
    render(<BlogPage />);

    expect(screen.queryByText(/la muestra como ausente/i)).toBeNull();
    expect(screen.getByText(/omite el campo/i)).toBeDefined();
  });

  it("genera una ruta estática por artículo", () => {
    expect(generateStaticParams()).toEqual(
      ARTICULOS_BLOG.map((articulo) => ({ slug: articulo.slug })),
    );
  });

  it("renderiza el artículo con sus secciones y puntos clave", async () => {
    const articulo = ARTICULOS_BLOG[0];
    const pagina = await ArticuloBlogPage({
      params: Promise.resolve({ slug: articulo.slug }),
    });

    render(pagina);

    expect(
      screen.getByRole("heading", { level: 1, name: articulo.titulo }),
    ).toBeDefined();
    expect(screen.getByText(articulo.secciones[0].titulo)).toBeDefined();
    expect(screen.getByText(articulo.puntosClave[0])).toBeDefined();
    expect(screen.getByText("Puntos clave")).toBeDefined();
  });

  it.each(ARTICULOS_BLOG)(
    "enlaza categoría, comparador y reseñas desde $slug",
    async (articulo) => {
      const pagina = await ArticuloBlogPage({
        params: Promise.resolve({ slug: articulo.slug }),
      });

      render(pagina);

      expect(
        screen
          .getByRole("link", { name: `Ver ${articulo.categoriaEtiqueta}` })
          .getAttribute("href"),
      ).toBe(`/categorias/${articulo.categoriaSlug}`);
      expect(
        screen
          .getByRole("link", { name: "Abrir comparador" })
          .getAttribute("href"),
      ).toBe("/comparador");
      expect(
        screen
          .getByRole("link", { name: "Ver reseñas de la comunidad" })
          .getAttribute("href"),
      ).toBe("/resenas");
    },
  );

  it("devuelve notFound para un slug inexistente", async () => {
    await expect(
      ArticuloBlogPage({ params: Promise.resolve({ slug: "no-existe" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
