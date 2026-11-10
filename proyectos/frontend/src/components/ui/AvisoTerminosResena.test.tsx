// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import AvisoTerminosResena from "./AvisoTerminosResena";

afterEach(() => {
  cleanup();
});

describe("AvisoTerminosResena", () => {
  it("anuncia el texto como status accesible y oculta el icono decorativo", () => {
    const { container } = render(<AvisoTerminosResena />);

    const aviso = screen.getByRole("status");
    expect(aviso.getAttribute("aria-live")).toBe("polite");
    expect(aviso.getAttribute("aria-atomic")).toBe("true");
    expect(
      screen.getByText(
        "Tu reseña contiene términos que requieren revisión antes de publicarse.",
      ),
    ).toBeDefined();

    const icono = container.querySelector("svg");
    expect(icono?.getAttribute("aria-hidden")).toBe("true");
  });
});
