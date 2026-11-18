// @vitest-environment happy-dom
import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { useState } from "react";
import { CLAVE_FAVORITOS, claveFavoritos } from "@/data/favoritos";

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

import { useFavoritos } from "./useFavoritos";

const CLAVE_USUARIO = claveFavoritos("user-1");

function Harness() {
  const { ids, hidratado, autenticado, alternar, quitar, limpiar } =
    useFavoritos();
  const [motivo, setMotivo] = useState("");

  return (
    <div>
      <span data-testid="ids">{ids.join(",")}</span>
      <span data-testid="hidratado">{String(hidratado)}</span>
      <span data-testid="autenticado">{String(autenticado)}</span>
      <span data-testid="motivo">{motivo}</span>

      {[1, 2, 3].map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => setMotivo(alternar(id).motivo)}
        >
          Alternar {id}
        </button>
      ))}

      <button type="button" onClick={() => quitar(2)}>
        Quitar 2
      </button>
      <button type="button" onClick={limpiar}>
        Limpiar
      </button>
    </div>
  );
}

describe("useFavoritos", () => {
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

  it("hidrata los ids del usuario autenticado desde localStorage", async () => {
    localStorage.setItem(CLAVE_USUARIO, JSON.stringify([2, 1, 2]));

    render(<Harness />);

    await waitFor(() => {
      expect(screen.getByTestId("hidratado").textContent).toBe("true");
    });
    expect(screen.getByTestId("ids").textContent).toBe("2,1");
    expect(screen.getByTestId("autenticado").textContent).toBe("true");
  });

  it("agrega, quita y persiste los cambios de la cuenta activa", async () => {
    render(<Harness />);

    await waitFor(() => {
      expect(screen.getByTestId("hidratado").textContent).toBe("true");
    });

    fireEvent.click(screen.getByRole("button", { name: "Alternar 1" }));
    expect(screen.getByTestId("ids").textContent).toBe("1");
    expect(screen.getByTestId("motivo").textContent).toBe("agregado");
    expect(JSON.parse(localStorage.getItem(CLAVE_USUARIO) ?? "[]")).toEqual([1]);

    fireEvent.click(screen.getByRole("button", { name: "Alternar 1" }));
    expect(screen.getByTestId("ids").textContent).toBe("");
    expect(screen.getByTestId("motivo").textContent).toBe("quitado");
    expect(localStorage.getItem(CLAVE_USUARIO)).toBeNull();
  });

  it("quita un id y limpia la lista", async () => {
    render(<Harness />);

    await waitFor(() => {
      expect(screen.getByTestId("hidratado").textContent).toBe("true");
    });

    fireEvent.click(screen.getByRole("button", { name: "Alternar 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Alternar 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Alternar 3" }));

    fireEvent.click(screen.getByRole("button", { name: "Quitar 2" }));
    expect(screen.getByTestId("ids").textContent).toBe("1,3");

    fireEvent.click(screen.getByRole("button", { name: "Limpiar" }));
    expect(screen.getByTestId("ids").textContent).toBe("");
  });

  it("sincroniza cambios de otra pestaña con el evento storage", async () => {
    render(<Harness />);

    await waitFor(() => {
      expect(screen.getByTestId("hidratado").textContent).toBe("true");
    });

    localStorage.setItem(CLAVE_USUARIO, JSON.stringify([9, 8]));
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: CLAVE_USUARIO,
        newValue: JSON.stringify([9, 8]),
      }),
    );

    await waitFor(() => {
      expect(screen.getByTestId("ids").textContent).toBe("9,8");
    });
  });

  it("sincroniza dos instancias del hook en la misma pestaña", async () => {
    render(
      <>
        <Harness />
        <Harness />
      </>,
    );

    await waitFor(() => {
      expect(screen.getAllByTestId("hidratado")).toHaveLength(2);
      for (const estado of screen.getAllByTestId("hidratado")) {
        expect(estado.textContent).toBe("true");
      }
    });

    fireEvent.click(
      screen.getAllByRole("button", { name: "Alternar 1" })[0],
    );

    await waitFor(() => {
      for (const ids of screen.getAllByTestId("ids")) {
        expect(ids.textContent).toBe("1");
      }
    });
  });

  it("no hidrata ni guarda favoritos sin sesión y elimina la clave anónima", async () => {
    authMock.sesion = null;
    localStorage.setItem(CLAVE_FAVORITOS, JSON.stringify([5]));
    localStorage.setItem(CLAVE_USUARIO, JSON.stringify([1]));

    render(<Harness />);

    await waitFor(() => {
      expect(screen.getByTestId("hidratado").textContent).toBe("true");
    });

    expect(screen.getByTestId("ids").textContent).toBe("");
    expect(screen.getByTestId("autenticado").textContent).toBe("false");
    expect(localStorage.getItem(CLAVE_FAVORITOS)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Alternar 1" }));

    expect(screen.getByTestId("motivo").textContent).toBe("sin-sesion");
    expect(screen.getByTestId("ids").textContent).toBe("");
    expect(JSON.parse(localStorage.getItem(CLAVE_USUARIO) ?? "[]")).toEqual([1]);
  });

  it("deja de exponer los favoritos al cerrar la sesión", async () => {
    localStorage.setItem(CLAVE_USUARIO, JSON.stringify([1]));

    render(<Harness />);

    await waitFor(() => {
      expect(screen.getByTestId("ids").textContent).toBe("1");
    });

    act(() => {
      authMock.sesion = null;
      for (const observador of authMock.observadores) {
        observador("SIGNED_OUT", null);
      }
    });

    await waitFor(() => {
      expect(screen.getByTestId("ids").textContent).toBe("");
    });
    expect(screen.getByTestId("autenticado").textContent).toBe("false");
  });

  it("no muestra los favoritos de la cuenta anterior al cambiar de cuenta", async () => {
    localStorage.setItem(claveFavoritos("user-1"), JSON.stringify([1]));
    localStorage.setItem(claveFavoritos("user-2"), JSON.stringify([2]));

    render(<Harness />);

    await waitFor(() => {
      expect(screen.getByTestId("ids").textContent).toBe("1");
    });

    act(() => {
      authMock.sesion = null;
      for (const observador of authMock.observadores) {
        observador("SIGNED_OUT", null);
      }
    });

    await waitFor(() => {
      expect(screen.getByTestId("ids").textContent).toBe("");
    });

    act(() => {
      authMock.sesion = { user: { id: "user-2" } };
      for (const observador of authMock.observadores) {
        observador("SIGNED_IN", authMock.sesion);
      }
    });

    await waitFor(() => {
      expect(screen.getByTestId("ids").textContent).toBe("2");
    });
    expect(screen.getByTestId("autenticado").textContent).toBe("true");
    expect(JSON.parse(localStorage.getItem(CLAVE_USUARIO) ?? "[]")).toEqual([1]);
  });

  it("aísla los favoritos por cuenta", async () => {
    localStorage.setItem(claveFavoritos("user-1"), JSON.stringify([1]));
    localStorage.setItem(claveFavoritos("user-2"), JSON.stringify([2]));
    authMock.sesion = { user: { id: "user-2" } };

    render(<Harness />);

    await waitFor(() => {
      expect(screen.getByTestId("ids").textContent).toBe("2");
    });
  });
});
