// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import RatingStars from "./RatingStars";

afterEach(() => {
  cleanup();
});

describe("RatingStars", () => {
  it("muestra el formato compacto de nota y opiniones", () => {
    render(<RatingStars rating={4.5} cantidadResenas={12} />);

    expect(
      screen.getByRole("img", { name: /Valoración 4,5 de 5/i }),
    ).toBeDefined();
    expect(screen.getByText("4,5")).toBeDefined();
    expect(screen.getByText("(12 opiniones)")).toBeDefined();
  });

  it("usa el singular cuando hay una sola opinión", () => {
    render(<RatingStars rating={5} cantidadResenas={1} />);

    expect(screen.getByText("(1 opinión)")).toBeDefined();
  });

  it("muestra 0,0 y 'Sin opiniones' cuando no hay rating", () => {
    render(<RatingStars rating={null} cantidadResenas={null} />);

    expect(screen.getByText("0,0")).toBeDefined();
    expect(screen.getByText("Sin opiniones")).toBeDefined();
    expect(
      screen.getByRole("img", { name: "Sin opiniones" }),
    ).toBeDefined();
  });

  it("conserva la etiqueta de cantidad heredada", () => {
    render(
      <RatingStars
        rating={4.2}
        cantidadResenas={8}
        etiquetaCantidad="valoraciones"
      />,
    );

    expect(screen.getByText("(8 valoraciones)")).toBeDefined();
  });
});
