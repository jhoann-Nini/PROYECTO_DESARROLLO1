// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("./CategoriaPageContent", () => ({
  default: ({ slug }: { slug: string }) => <div>slug-recibido:{slug}</div>,
}));

import CategoriaPage from "./page";

describe("Ruta /categorias/[slug]", () => {
  it("resuelve el parámetro dinámico de la URL y lo entrega al contenido de la categoría", async () => {
    const pagina = await CategoriaPage({
      params: Promise.resolve({ slug: "auriculares" }),
    });

    render(pagina);

    expect(screen.getByText("slug-recibido:auriculares")).toBeDefined();
  });
});
