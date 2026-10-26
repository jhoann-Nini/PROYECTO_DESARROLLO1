// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import BotonTema from "./BotonTema";
import { CLAVE_TEMA } from "@/lib/tema";

const matchMediaOriginal = window.matchMedia;

function simularSistemaOscuro(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
  delete document.documentElement.dataset.tema;
  document.documentElement.style.colorScheme = "";
  simularSistemaOscuro(false);
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.classList.remove("dark");
  delete document.documentElement.dataset.tema;
  document.documentElement.style.colorScheme = "";
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: matchMediaOriginal,
  });
});

describe("BotonTema", () => {
  it("alterna entre claro y oscuro, y persiste la elección", async () => {
    render(<BotonTema />);

    const botonOscuro = await screen.findByRole("button", {
      name: "Cambiar a tema oscuro",
    });

    fireEvent.click(botonOscuro);

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem(CLAVE_TEMA)).toBe("oscuro");
    expect(
      screen.getByRole("button", { name: "Cambiar a tema claro" }),
    ).toBeDefined();

    fireEvent.click(
      screen.getByRole("button", { name: "Cambiar a tema claro" }),
    );

    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem(CLAVE_TEMA)).toBe("claro");
    expect(
      screen.getByRole("button", { name: "Cambiar a tema oscuro" }),
    ).toBeDefined();
  });

  it("respeta la preferencia guardada al montar", async () => {
    localStorage.setItem(CLAVE_TEMA, "oscuro");

    render(<BotonTema />);

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    const boton = screen.getByRole("button", {
      name: "Cambiar a tema claro",
    });
    expect(boton.getAttribute("aria-pressed")).toBe("true");
  });

  it("sincroniza el tema cuando otra pestaña cambia la preferencia", async () => {
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

  it("aplica el cambio del sistema mientras no haya preferencia guardada", async () => {
    let alCambiar: ((evento: MediaQueryListEvent) => void) | null = null;
    const cambiarSistemaAOscuro = () => {
      alCambiar?.({ matches: true } as MediaQueryListEvent);
    };

    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(
          (_tipo: string, listener: (evento: MediaQueryListEvent) => void) => {
            alCambiar = listener;
          },
        ),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    render(<BotonTema />);

    await screen.findByRole("button", { name: "Cambiar a tema oscuro" });

    cambiarSistemaAOscuro();

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
      expect(
        screen.getByRole("button", { name: "Cambiar a tema claro" }),
      ).toBeDefined();
    });
  });
});
