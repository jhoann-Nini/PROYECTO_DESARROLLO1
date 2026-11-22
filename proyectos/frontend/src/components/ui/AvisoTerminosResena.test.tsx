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
        "Tu opinión tiene lenguaje que no se permite. Corrígelo para poder publicarla.",
      ),
    ).toBeDefined();

    const icono = container.querySelector("svg");
    expect(icono?.getAttribute("aria-hidden")).toBe("true");
  });

  // Caso 6: el aviso depende del nivel de riesgo.
  it("con riesgo bajo solo sugiere revisar el tono", () => {
    render(<AvisoTerminosResena riesgo="bajo" />);
    expect(screen.getByRole("status").textContent).toBe(
      "Algunas palabras pueden sonar ofensivas. Puedes publicar, pero revisa el tono.",
    );
  });

  it("con riesgo medio o alto pide corregir antes de publicar", () => {
    render(<AvisoTerminosResena riesgo="alto" />);
    expect(screen.getByRole("status").textContent).toMatch(/Corrígelo para poder publicarla/);
  });

  it("sin riesgo no muestra nada", () => {
    render(<AvisoTerminosResena riesgo="ninguno" />);
    expect(screen.queryByRole("status")).toBeNull();
  });
});

