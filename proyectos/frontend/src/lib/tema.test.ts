// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CLAVE_TEMA,
  SCRIPT_TEMA,
  aplicarTema,
  guardarTema,
  leerTemaGuardado,
  obtenerTemaDelDocumento,
  obtenerTemaInicial,
  prefiereTemaOscuro,
} from "./tema";

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

function limpiarDocumento() {
  document.documentElement.classList.remove("dark");
  delete document.documentElement.dataset.tema;
  document.documentElement.style.colorScheme = "";
}

beforeEach(() => {
  localStorage.clear();
  limpiarDocumento();
  simularSistemaOscuro(false);
});

afterEach(() => {
  localStorage.clear();
  limpiarDocumento();
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: matchMediaOriginal,
  });
});

describe("preferencia de tema", () => {
  it("solo acepta valores conocidos en localStorage", () => {
    expect(leerTemaGuardado()).toBeNull();

    localStorage.setItem(CLAVE_TEMA, "morado");
    expect(leerTemaGuardado()).toBeNull();

    localStorage.setItem(CLAVE_TEMA, "oscuro");
    expect(leerTemaGuardado()).toBe("oscuro");

    localStorage.setItem(CLAVE_TEMA, "claro");
    expect(leerTemaGuardado()).toBe("claro");
  });

  it("la preferencia guardada tiene prioridad sobre el sistema", () => {
    simularSistemaOscuro(true);
    localStorage.setItem(CLAVE_TEMA, "claro");

    expect(prefiereTemaOscuro()).toBe(true);
    expect(obtenerTemaInicial()).toBe("claro");
  });

  it("usa prefers-color-scheme cuando no hay preferencia guardada", () => {
    simularSistemaOscuro(true);

    expect(obtenerTemaInicial()).toBe("oscuro");

    simularSistemaOscuro(false);
    expect(obtenerTemaInicial()).toBe("claro");
  });

  it("aplica la clase, el dataset y color-scheme", () => {
    aplicarTema("oscuro");

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.dataset.tema).toBe("oscuro");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(obtenerTemaDelDocumento()).toBe("oscuro");

    aplicarTema("claro");

    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.dataset.tema).toBe("claro");
    expect(document.documentElement.style.colorScheme).toBe("light");
    expect(obtenerTemaDelDocumento()).toBe("claro");
  });

  it("guarda la preferencia de forma segura", () => {
    guardarTema("oscuro");
    expect(localStorage.getItem(CLAVE_TEMA)).toBe("oscuro");
  });
});

describe("script previo a la hidratación", () => {
  it("aplica oscuro desde localStorage antes de renderizar", () => {
    localStorage.setItem(CLAVE_TEMA, "oscuro");

    new Function(SCRIPT_TEMA)();

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.dataset.tema).toBe("oscuro");
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("respeta el tema claro guardado aunque el sistema sea oscuro", () => {
    simularSistemaOscuro(true);
    localStorage.setItem(CLAVE_TEMA, "claro");

    new Function(SCRIPT_TEMA)();

    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.dataset.tema).toBe("claro");
  });

  it("usa el sistema cuando no hay preferencia guardada", () => {
    simularSistemaOscuro(true);

    new Function(SCRIPT_TEMA)();

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.dataset.tema).toBe("oscuro");
  });
});
