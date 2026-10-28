// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { CLAVE_COMPARADOR } from "@/data/comparador";
import { CLAVE_COMPARADOS_RECIENTES } from "@/data/comparadosRecientes";
import { useComparador } from "./useComparador";

function Harness() {
  const { ids, hidratado, agregar, quitar, limpiar, recientes } =
    useComparador();
  const [motivo, setMotivo] = useState("");

  return (
    <div>
      <span data-testid="ids">{ids.join(",")}</span>
      <span data-testid="recientes">{recientes.join(",")}</span>
      <span data-testid="hidratado">{String(hidratado)}</span>
      <span data-testid="motivo">{motivo}</span>

      {[1, 2, 3, 4, 5, 6].map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => setMotivo(agregar(id).motivo)}
        >
          Agregar {id}
        </button>
      ))}

      <button type="button" onClick={() => quitar(2)}>
        Quitar 2
      </button>
      <button type="button" onClick={() => quitar(3)}>
        Quitar 3
      </button>
      <button type="button" onClick={limpiar}>
        Limpiar
      </button>
    </div>
  );
}

describe("useComparador", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("hidrata los ids desde localStorage", async () => {
    localStorage.setItem(CLAVE_COMPARADOR, JSON.stringify([2, 1, 2]));

    render(<Harness />);

    await waitFor(() => {
      expect(screen.getByTestId("hidratado").textContent).toBe("true");
    });
    expect(screen.getByTestId("ids").textContent).toBe("2,1");
  });

  it("persiste un id agregado y lo expone en el estado", async () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: "Agregar 3" }));

    expect(screen.getByTestId("ids").textContent).toBe("3");
    expect(screen.getByTestId("motivo").textContent).toBe("agregado");
    expect(JSON.parse(localStorage.getItem(CLAVE_COMPARADOR) ?? "[]")).toEqual([
      3,
    ]);
  });

  it("no persiste duplicados ni supera el máximo", () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: "Agregar 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Agregar 1" }));
    expect(screen.getByTestId("motivo").textContent).toBe("duplicado");
    expect(screen.getByTestId("ids").textContent).toBe("1");

    for (const id of [2, 3, 4, 5]) {
      fireEvent.click(screen.getByRole("button", { name: `Agregar ${id}` }));
    }

    expect(screen.getByTestId("motivo").textContent).toBe("lleno");
    expect(screen.getByTestId("ids").textContent).toBe("1,2,3,4");
  });

  it("quita un id y limpia la selección", () => {
    render(<Harness />);

    for (const id of [1, 2, 3]) {
      fireEvent.click(screen.getByRole("button", { name: `Agregar ${id}` }));
    }

    fireEvent.click(screen.getByRole("button", { name: "Quitar 2" }));
    expect(screen.getByTestId("ids").textContent).toBe("1,3");

    fireEvent.click(screen.getByRole("button", { name: "Limpiar" }));
    expect(screen.getByTestId("ids").textContent).toBe("");
    expect(JSON.parse(localStorage.getItem(CLAVE_COMPARADOR) ?? "null")).toEqual(
      [],
    );
  });

  it("registra los productos comparados en orden, sin duplicados", async () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: "Agregar 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Agregar 2" }));

    await waitFor(() => {
      expect(screen.getByTestId("recientes").textContent).toBe("2,1");
    });
    expect(
      JSON.parse(localStorage.getItem(CLAVE_COMPARADOS_RECIENTES) ?? "[]"),
    ).toEqual([2, 1]);

    fireEvent.click(screen.getByRole("button", { name: "Agregar 2" }));

    expect(screen.getByTestId("recientes").textContent).toBe("2,1");
  });

  it("limita los comparados recientes a cinco", async () => {
    render(<Harness />);

    for (const id of [1, 2, 3, 4]) {
      fireEvent.click(screen.getByRole("button", { name: `Agregar ${id}` }));
    }
    fireEvent.click(screen.getByRole("button", { name: "Quitar 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Agregar 5" }));
    fireEvent.click(screen.getByRole("button", { name: "Quitar 3" }));
    fireEvent.click(screen.getByRole("button", { name: "Agregar 6" }));

    expect(screen.getByTestId("recientes").textContent).toBe("6,5,4,3,2");
    expect(
      JSON.parse(localStorage.getItem(CLAVE_COMPARADOS_RECIENTES) ?? "[]"),
    ).toEqual([6, 5, 4, 3, 2]);
  });

  it("hidrata los comparados recientes tras remontar", async () => {
    localStorage.setItem(CLAVE_COMPARADOS_RECIENTES, JSON.stringify([4, 2]));

    render(<Harness />);

    await waitFor(() => {
      expect(screen.getByTestId("hidratado").textContent).toBe("true");
    });
    expect(screen.getByTestId("recientes").textContent).toBe("4,2");
  });

  it("sincroniza cambios de otra pestaña con el evento storage", async () => {
    render(<Harness />);

    await waitFor(() => {
      expect(screen.getByTestId("hidratado").textContent).toBe("true");
    });

    localStorage.setItem(CLAVE_COMPARADOR, JSON.stringify([9, 8]));
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: CLAVE_COMPARADOR,
        newValue: JSON.stringify([9, 8]),
      }),
    );

    await waitFor(() => {
      expect(screen.getByTestId("ids").textContent).toBe("9,8");
    });
  });
});
