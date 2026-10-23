import { describe, expect, it } from "vitest";
import {
  esAdministrador,
  esRepresentante,
  esUsuarioRegistrado,
  type UsuarioSesion,
} from "./producto";

describe("Validadores de roles del sistema (Hallazgo 2 - Fase 2)", () => {
  it("esAdministrador valida positivamente rol Administrador ignorando mayúsculas y espacios", () => {
    expect(esAdministrador({ rol: "Administrador" } as UsuarioSesion)).toBe(true);
    expect(esAdministrador({ rol: "administrador" } as UsuarioSesion)).toBe(true);
    expect(esAdministrador({ rol: " ADMINISTRADOR " } as UsuarioSesion)).toBe(true);

    expect(esAdministrador({ rol: "Usuario registrado" } as UsuarioSesion)).toBe(false);
    expect(esAdministrador({ rol: "Representante de establecimiento" } as UsuarioSesion)).toBe(false);
    expect(esAdministrador(null)).toBe(false);
    expect(esAdministrador(undefined)).toBe(false);
    expect(esAdministrador({} as UsuarioSesion)).toBe(false);
  });

  it("esRepresentante valida positivamente rol Representante de establecimiento", () => {
    expect(esRepresentante({ rol: "Representante de establecimiento" } as UsuarioSesion)).toBe(true);
    expect(esRepresentante({ rol: "representante de establecimiento" } as UsuarioSesion)).toBe(true);

    expect(esRepresentante({ rol: "Administrador" } as UsuarioSesion)).toBe(false);
    expect(esRepresentante({ rol: "Usuario registrado" } as UsuarioSesion)).toBe(false);
    expect(esRepresentante(null)).toBe(false);
  });

  it("esUsuarioRegistrado valida positivamente rol Usuario registrado", () => {
    expect(esUsuarioRegistrado({ rol: "Usuario registrado" } as UsuarioSesion)).toBe(true);
    expect(esUsuarioRegistrado({ rol: "usuario registrado" } as UsuarioSesion)).toBe(true);

    expect(esUsuarioRegistrado({ rol: "Administrador" } as UsuarioSesion)).toBe(false);
    expect(esUsuarioRegistrado({ rol: "Representante de establecimiento" } as UsuarioSesion)).toBe(false);
    expect(esUsuarioRegistrado(null)).toBe(false);
  });
});
