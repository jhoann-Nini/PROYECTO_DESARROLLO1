// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import ResumenSesion from "./ResumenSesion";
import type { UsuarioSesion } from "@/types/producto";

const usuario: UsuarioSesion = {
  id: "u-1",
  nombre: "Adrián Pérez",
  usuario: "adrian",
  email: "adrian@example.com",
  rol: "Usuario registrado",
};

function crearProps(overrides: Partial<Parameters<typeof ResumenSesion>[0]> = {}) {
  return {
    cargando: false,
    usuario: null,
    error: null,
    esAdmin: false,
    esRepresentante: false,
    onAbrirAuth: vi.fn(),
    onCerrarSesion: vi.fn(),
    onReintentar: vi.fn(),
    onAbrirAdmin: vi.fn(),
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

describe("ResumenSesion", () => {
  it("muestra 'Verificando...' mientras carga la sesión", () => {
    render(<ResumenSesion {...crearProps({ cargando: true })} />);

    const estado = screen.getByText("Verificando...");
    expect(estado).toBeDefined();
    expect(estado.getAttribute("aria-live")).toBe("polite");
    expect(screen.queryByRole("button", { name: /Iniciar sesión/i })).toBeNull();
  });

  it("muestra 'Iniciar sesión' para visitantes", () => {
    const props = crearProps();
    render(<ResumenSesion {...props} />);

    const boton = screen.getByRole("button", { name: /Iniciar sesión/i });
    fireEvent.click(boton);
    expect(props.onAbrirAuth).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Cerrar sesión")).toBeNull();
  });

  it("muestra nombre, rol y 'Cerrar sesión' para un usuario", () => {
    const props = crearProps({ usuario });
    render(<ResumenSesion {...props} />);

    expect(screen.getByText("Adrián Pérez")).toBeDefined();
    expect(screen.getByText("• Usuario registrado")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    expect(props.onCerrarSesion).toHaveBeenCalledTimes(1);
  });

  it("muestra el enlace de administración solo para administradores", () => {
    const props = crearProps({
      usuario: { ...usuario, rol: "Administrador" },
      esAdmin: true,
    });
    render(<ResumenSesion {...props} />);

    const enlace = screen.getByRole("link", {
      name: "Panel de administración",
    });
    expect(enlace.getAttribute("href")).toBe("#administracion");

    fireEvent.click(enlace);
    expect(props.onAbrirAdmin).toHaveBeenCalledTimes(1);
  });

  it("no muestra el enlace de administración para usuarios normales", () => {
    render(<ResumenSesion {...crearProps({ usuario })} />);

    expect(
      screen.queryByRole("link", { name: "Panel de administración" }),
    ).toBeNull();
  });

  it("muestra el error y permite reintentar", () => {
    const props = crearProps({ error: "No se pudo verificar la sesión" });
    render(<ResumenSesion {...props} />);

    const alerta = screen.getByRole("alert");
    expect(alerta.textContent).toContain("No se pudo verificar la sesión");

    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(props.onReintentar).toHaveBeenCalledTimes(1);
  });
});
