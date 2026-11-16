import { describe, expect, it } from "vitest";
import {
  esAdministrador,
  esModerador,
  esRepresentante,
  esUsuarioRegistrado,
  puedeModerar,
  type UsuarioSesion,
} from "./producto";

// Los validadores requieren estado activo confirmado por el backend.
const sesion = (datos: Partial<UsuarioSesion>): UsuarioSesion =>
  ({
    id: "usuario-prueba",
    nombre: "Usuario de prueba",
    usuario: "prueba",
    email: "prueba@example.com",
    activo: true,
    ...datos,
  }) as UsuarioSesion;

describe("Validadores de roles del sistema", () => {
  it("valida el rol Administrador ignorando mayúsculas y espacios", () => {
    expect(esAdministrador(sesion({ rol: "Administrador" }))).toBe(true);
    expect(esAdministrador(sesion({ rol: "administrador" }))).toBe(true);
    expect(esAdministrador(sesion({ rol: " ADMINISTRADOR " }))).toBe(true);

    expect(esAdministrador(sesion({ rol: "Usuario registrado" }))).toBe(false);
    expect(esAdministrador(sesion({ rol: "Representante de establecimiento" }))).toBe(false);
    expect(esAdministrador(null)).toBe(false);
    expect(esAdministrador(undefined)).toBe(false);
    expect(esAdministrador(sesion({}))).toBe(false);
  });

  it("valida el rol Representante de establecimiento", () => {
    expect(esRepresentante(sesion({ rol: "Representante de establecimiento" }))).toBe(true);
    expect(esRepresentante(sesion({ rol: "representante de establecimiento" }))).toBe(true);

    expect(esRepresentante(sesion({ rol: "Administrador" }))).toBe(false);
    expect(esRepresentante(sesion({ rol: "Usuario registrado" }))).toBe(false);
    expect(esRepresentante(null)).toBe(false);
  });

  it("valida el rol Usuario registrado", () => {
    expect(esUsuarioRegistrado(sesion({ rol: "Usuario registrado" }))).toBe(true);
    expect(esUsuarioRegistrado(sesion({ rol: "usuario registrado" }))).toBe(true);

    expect(esUsuarioRegistrado(sesion({ rol: "Administrador" }))).toBe(false);
    expect(esUsuarioRegistrado(sesion({ rol: "Representante de establecimiento" }))).toBe(false);
    expect(esUsuarioRegistrado(null)).toBe(false);
  });

  it("valida únicamente el rol Moderador", () => {
    expect(esModerador(sesion({ rol: "Moderador" }))).toBe(true);
    expect(esModerador(sesion({ rol: " moderador " }))).toBe(true);

    expect(esModerador(sesion({ rol: "Administrador" }))).toBe(false);
    expect(esModerador(sesion({ rol: "Usuario registrado" }))).toBe(false);
    expect(esModerador(null)).toBe(false);
  });

  it("permite moderar a Moderadores y Administradores activos", () => {
    expect(puedeModerar(sesion({ rol: "Moderador" }))).toBe(true);
    expect(puedeModerar(sesion({ rol: "Administrador" }))).toBe(true);

    expect(puedeModerar(sesion({ rol: "Usuario registrado" }))).toBe(false);
    expect(puedeModerar(sesion({ rol: "Representante de establecimiento" }))).toBe(false);
    expect(puedeModerar(null)).toBe(false);
  });

  it("considera todos los roles activos de una cuenta multirrol", () => {
    const adminSecundario = sesion({
      rol: "Usuario registrado",
      roles: ["Usuario registrado", "Administrador"],
    });

    expect(esAdministrador(adminSecundario)).toBe(true);
    expect(puedeModerar(adminSecundario)).toBe(true);
    expect(
      esRepresentante(
        sesion({
          rol: "Usuario registrado",
          roles: ["Usuario registrado", "Representante de establecimiento"],
        }),
      ),
    ).toBe(true);
    expect(
      esModerador(
        sesion({
          rol: "Usuario registrado",
          roles: ["Moderador", "Usuario registrado"],
        }),
      ),
    ).toBe(true);
    expect(esUsuarioRegistrado(adminSecundario)).toBe(true);
  });

  it("rechaza todos los roles cuando la cuenta está suspendida", () => {
    const suspendido = sesion({
      rol: "Administrador",
      roles: ["Administrador", "Moderador", "Representante de establecimiento"],
      activo: false,
    });

    expect(esAdministrador(suspendido)).toBe(false);
    expect(esModerador(suspendido)).toBe(false);
    expect(esRepresentante(suspendido)).toBe(false);
    expect(esUsuarioRegistrado(suspendido)).toBe(false);
    expect(puedeModerar(suspendido)).toBe(false);
  });

  it("falla de forma segura cuando el estado de la cuenta no está confirmado", () => {
    const sinEstado = sesion({ rol: "Administrador", activo: undefined });

    expect(esAdministrador(sinEstado)).toBe(false);
    expect(esModerador(sinEstado)).toBe(false);
    expect(esRepresentante(sinEstado)).toBe(false);
    expect(esUsuarioRegistrado(sinEstado)).toBe(false);
    expect(puedeModerar(sinEstado)).toBe(false);
  });
});
