// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import ContadorPendientes from "./ContadorPendientes";

describe("ContadorPendientes", () => {
  afterEach(() => cleanup());

  it.each([0, null, undefined])("no se muestra con %s", (cantidad) => {
    const { container } = render(<ContadorPendientes cantidad={cantidad} />);
    expect(container.textContent).toBe("");
  });

  it("muestra la cantidad y la anuncia a lectores de pantalla", () => {
    render(<button>Revisión<ContadorPendientes cantidad={3} /></button>);
    expect(screen.getByRole("button", { name: "Revisión (3 pendientes)" })).toBeDefined();
  });

  it("usa el singular con un pendiente", () => {
    render(<button>Revisión<ContadorPendientes cantidad={1} /></button>);
    expect(screen.getByRole("button", { name: "Revisión (1 pendiente)" })).toBeDefined();
  });

  it("abrevia desde 100 sin perder la cifra real para lectores de pantalla", () => {
    render(<button>Cola<ContadorPendientes cantidad={150} /></button>);
    expect(screen.getByText("99+")).toBeDefined();
    expect(screen.getByRole("button", { name: "Cola (150 pendientes)" })).toBeDefined();
  });
});
