// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { CLAVE_FAVORITOS, MAX_FAVORITOS, claveFavoritos } from "@/data/favoritos";

const authMock = vi.hoisted(() => ({
  sesion: { user: { id: "user-1" } } as { user: { id: string } } | null,
  observadores: [] as Array<
    (evento: string, sesion: { user: { id: string } } | null) => void
  >,
  unsubscribe: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: async () => ({
        data: { session: authMock.sesion },
        error: null,
      }),
      onAuthStateChange: (
        callback: (
          evento: string,
          sesion: { user: { id: string } } | null,
        ) => void,
      ) => {
        authMock.observadores.push(callback);
        return {
          data: { subscription: { unsubscribe: authMock.unsubscribe } },
        };
      },
    },
  }),
}));

import BotonFavorito from "./BotonFavorito";

const CLAVE_USUARIO = claveFavoritos("user-1");

beforeEach(() => {
  localStorage.clear();
  authMock.sesion = { user: { id: "user-1" } };
  authMock.observadores.length = 0;
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("BotonFavorito", () => {
  it("guarda y quita un favorito de la cuenta activa", async () => {
    render(<BotonFavorito idProducto={7} nombreProducto="Producto 7" />);

    const boton = await screen.findByRole("button", {
      name: "Guardar en favoritos",
    });
    await waitFor(() => {
      expect((boton as HTMLButtonElement).disabled).toBe(false);
    });
    expect(boton.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(boton);

    expect(
      screen
        .getByRole("button", { name: "Guardado en favoritos" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(JSON.parse(localStorage.getItem(CLAVE_USUARIO) ?? "[]")).toEqual([7]);
    expect(localStorage.getItem(CLAVE_FAVORITOS)).toBeNull();
    expect(screen.getByRole("status").textContent).toContain(
      "Producto 7 se guardó en favoritos.",
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Guardado en favoritos" }),
    );

    expect(
      screen
        .getByRole("button", { name: "Guardar en favoritos" })
        .getAttribute("aria-pressed"),
    ).toBe("false");
    expect(localStorage.getItem(CLAVE_USUARIO)).toBeNull();
    expect(screen.getByRole("status").textContent).toContain(
      "Producto 7 se quitó de favoritos.",
    );
  });

  it("anuncia los cambios en el botón compacto con aria-pressed", async () => {
    render(
      <BotonFavorito idProducto={3} nombreProducto="Producto 3" compacto />,
    );

    const boton = await screen.findByRole("button", {
      name: "Guardar Producto 3 en favoritos",
    });
    await waitFor(() => {
      expect((boton as HTMLButtonElement).disabled).toBe(false);
    });
    expect(boton.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(boton);

    expect(
      screen
        .getByRole("button", { name: "Quitar Producto 3 de favoritos" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(screen.getByRole("status").textContent).toContain(
      "Producto 3 se guardó en favoritos.",
    );
    expect(localStorage.getItem(CLAVE_USUARIO)).toBe("[3]");

    fireEvent.click(
      screen.getByRole("button", { name: "Quitar Producto 3 de favoritos" }),
    );

    expect(
      screen
        .getByRole("button", { name: "Guardar Producto 3 en favoritos" })
        .getAttribute("aria-pressed"),
    ).toBe("false");
  });

  it("avisa cuando la lista alcanza el límite sin alterar la selección", async () => {
    const ids = Array.from(
      { length: MAX_FAVORITOS },
      (_, indice) => indice + 1,
    );
    localStorage.setItem(CLAVE_USUARIO, JSON.stringify(ids));

    render(
      <BotonFavorito
        idProducto={MAX_FAVORITOS + 1}
        nombreProducto="Producto extra"
      />,
    );

    const boton = await screen.findByRole("button", {
      name: `Favoritos llenos (${MAX_FAVORITOS}/${MAX_FAVORITOS})`,
    });
    await waitFor(() => {
      expect((boton as HTMLButtonElement).disabled).toBe(false);
    });

    fireEvent.click(boton);

    expect(screen.getByRole("status").textContent).toContain(
      `Favoritos admite hasta ${MAX_FAVORITOS} productos. Quita uno para guardar otro.`,
    );
    expect(JSON.parse(localStorage.getItem(CLAVE_USUARIO) ?? "[]")).toEqual(
      ids,
    );
    expect(
      screen
        .getByRole("button", {
          name: `Favoritos llenos (${MAX_FAVORITOS}/${MAX_FAVORITOS})`,
        })
        .getAttribute("aria-pressed"),
    ).toBe("false");
  });

  it("no guarda favoritos anónimos y pide iniciar sesión", async () => {
    authMock.sesion = null;
    localStorage.setItem(CLAVE_FAVORITOS, JSON.stringify([9]));
    localStorage.setItem(CLAVE_USUARIO, JSON.stringify([4]));

    render(<BotonFavorito idProducto={4} nombreProducto="Producto 4" />);

    const boton = await screen.findByRole("button", {
      name: "Guardar en favoritos",
    });
    await waitFor(() => {
      expect((boton as HTMLButtonElement).disabled).toBe(false);
    });

    fireEvent.click(boton);

    expect(await screen.findByRole("dialog")).toBeDefined();
    expect(screen.getByRole("status").textContent).toContain(
      "Inicia sesión para guardar productos en favoritos.",
    );
    expect(localStorage.getItem(CLAVE_FAVORITOS)).toBeNull();
    expect(JSON.parse(localStorage.getItem(CLAVE_USUARIO) ?? "[]")).toEqual([4]);
  });
});
