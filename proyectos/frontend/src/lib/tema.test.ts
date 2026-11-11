// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  CLAVE_TEMA,
  SCRIPT_TEMA,
  aplicarTema,
  guardarTema,
  leerTemaGuardado,
  obtenerTemaDelDocumento,
  obtenerTemaInicial,
} from "./tema";

function limpiarDocumento() {
  document.documentElement.classList.remove("dark");
  delete document.documentElement.dataset.tema;
  document.documentElement.style.colorScheme = "";
}

beforeEach(() => {
  localStorage.clear();
  limpiarDocumento();
});

afterEach(() => {
  localStorage.clear();
  limpiarDocumento();
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

  it("la preferencia guardada tiene prioridad sobre el tema por defecto", () => {
    expect(obtenerTemaInicial()).toBe("oscuro");

    localStorage.setItem(CLAVE_TEMA, "claro");
    expect(obtenerTemaInicial()).toBe("claro");

    localStorage.setItem(CLAVE_TEMA, "oscuro");
    expect(obtenerTemaInicial()).toBe("oscuro");
  });

  it("usa oscuro por defecto cuando no hay preferencia guardada", () => {
    expect(obtenerTemaInicial()).toBe("oscuro");
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
  it("aplica oscuro por defecto antes de renderizar", () => {
    new Function(SCRIPT_TEMA)();

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.dataset.tema).toBe("oscuro");
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("aplica oscuro desde localStorage antes de renderizar", () => {
    localStorage.setItem(CLAVE_TEMA, "oscuro");

    new Function(SCRIPT_TEMA)();

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.dataset.tema).toBe("oscuro");
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("respeta el tema claro guardado", () => {
    localStorage.setItem(CLAVE_TEMA, "claro");

    new Function(SCRIPT_TEMA)();

    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.dataset.tema).toBe("claro");
    expect(document.documentElement.style.colorScheme).toBe("light");
  });
});
