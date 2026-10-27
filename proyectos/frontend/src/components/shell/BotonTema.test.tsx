// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import BotonTema from "./BotonTema";
import { CLAVE_TEMA } from "@/lib/tema";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
  delete document.documentElement.dataset.tema;
  document.documentElement.style.colorScheme = "";
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.classList.remove("dark");
  delete document.documentElement.dataset.tema;
  document.documentElement.style.colorScheme = "";
});

describe("BotonTema", () => {
  it("arranca en oscuro y alterna a claro, persistiendo la elección", async () => {
    render(<BotonTema />);

    const botonClaro = await screen.findByRole("button", {
      name: "Cambiar a tema claro",
    });

    fireEvent.click(botonClaro);

    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem(CLAVE_TEMA)).toBe("claro");
    expect(
      screen.getByRole("button", { name: "Cambiar a tema oscuro" }),
    ).toBeDefined();

    fireEvent.click(
      screen.getByRole("button", { name: "Cambiar a tema oscuro" }),
    );

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem(CLAVE_TEMA)).toBe("oscuro");
    expect(
      screen.getByRole("button", { name: "Cambiar a tema claro" }),
    ).toBeDefined();
  });

  it("respeta la preferencia guardada al montar", async () => {
    localStorage.setItem(CLAVE_TEMA, "claro");

    render(<BotonTema />);

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    const boton = screen.getByRole("button", {
      name: "Cambiar a tema oscuro",
    });
    expect(boton.getAttribute("aria-pressed")).toBe("false");
  });

  it("sincroniza el tema cuando otra pestaña cambia la preferencia", async () => {
    localStorage.setItem(CLAVE_TEMA, "claro");

    render(<BotonTema />);

    await screen.findByRole("button", { name: "Cambiar a tema oscuro" });

    localStorage.setItem(CLAVE_TEMA, "oscuro");
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: CLAVE_TEMA,
        newValue: "oscuro",
      }),
    );

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    expect(
      screen.getByRole("button", { name: "Cambiar a tema claro" }),
    ).toBeDefined();
  });
});
