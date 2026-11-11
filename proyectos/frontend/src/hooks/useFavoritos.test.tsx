// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { useState } from "react";
import { CLAVE_FAVORITOS } from "@/data/favoritos";
import { useFavoritos } from "./useFavoritos";

function Harness() {
  const { ids, hidratado, alternar, quitar, limpiar } = useFavoritos();
  const [motivo, setMotivo] = useState("");

  return (
    <div>
      <span data-testid="ids">{ids.join(",")}</span>
      <span data-testid="hidratado">{String(hidratado)}</span>
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
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("hidrata los ids desde localStorage", async () => {
    localStorage.setItem(CLAVE_FAVORITOS, JSON.stringify([2, 1, 2]));

    render(<Harness />);

    await waitFor(() => {
      expect(screen.getByTestId("hidratado").textContent).toBe("true");
    });
    expect(screen.getByTestId("ids").textContent).toBe("2,1");
  });

  it("agrega, quita y persiste los cambios", () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: "Alternar 1" }));
    expect(screen.getByTestId("ids").textContent).toBe("1");
    expect(screen.getByTestId("motivo").textContent).toBe("agregado");
    expect(JSON.parse(localStorage.getItem(CLAVE_FAVORITOS) ?? "[]")).toEqual([
      1,
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Alternar 1" }));
    expect(screen.getByTestId("ids").textContent).toBe("");
    expect(screen.getByTestId("motivo").textContent).toBe("quitado");
    expect(localStorage.getItem(CLAVE_FAVORITOS)).toBeNull();
  });

  it("quita un id y limpia la lista", () => {
    render(<Harness />);

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

    localStorage.setItem(CLAVE_FAVORITOS, JSON.stringify([9, 8]));
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: CLAVE_FAVORITOS,
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
});
