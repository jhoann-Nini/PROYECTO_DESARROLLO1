// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import ContenidoNoVisible from "./ContenidoNoVisible";
import TextoPlano from "./TextoPlano";

afterEach(cleanup);

describe("ContenidoNoVisible", () => {
  it.each([
    ["ELIMINADA", "Esta respuesta fue eliminada."],
    ["OCULTA", "Esta respuesta no está disponible."],
    ["EN_REVISION", "Esta respuesta está en revisión."],
  ] as const)("%s muestra un aviso sin el texto", (estado, aviso) => {
    render(<ContenidoNoVisible estado={estado} />);
    expect(screen.getByText(aviso)).toBeTruthy();
  });
});

describe("TextoPlano", () => {
  it("muestra los enlaces como texto, sin convertirlos en vínculos", () => {
    const { container } = render(<TextoPlano texto={"Mira https://ejemplo.com\ny <b>esto</b>"} />);
    expect(container.querySelector("a")).toBeNull();
    expect(container.querySelector("b")).toBeNull();
    expect(container.textContent).toContain("https://ejemplo.com");
    expect(container.textContent).toContain("<b>esto</b>");
  });
});
