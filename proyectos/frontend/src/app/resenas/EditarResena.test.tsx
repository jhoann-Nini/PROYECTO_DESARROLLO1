// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ResenaResponse } from "@/services/api";

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    editarResena: vi.fn(),
    eliminarResena: vi.fn(),
  };
});

import { editarResena, eliminarResena } from "@/services/api";
import EditarResena from "./EditarResena";

const mockEditar = vi.mocked(editarResena);
const mockEliminar = vi.mocked(eliminarResena);

const RESENA: ResenaResponse = {
  idResena: 7,
  idProducto: 1,
  nombreProducto: "Galaxy S25",
  idUsuario: 10,
  nombreUsuario: "Ana Torres",
  comentario: "La batería irónicamente me decepciona.",
  fechaCreacion: "2026-10-20T12:00:00",
  estado: true,
};

function renderAcciones(
  overrides: {
    onEditada?: (resena: ResenaResponse) => void;
    onEliminada?: (idResena: number) => void;
  } = {}
) {
  return render(
    <EditarResena
      resena={RESENA}
      onEditada={overrides.onEditada ?? vi.fn()}
      onEliminada={overrides.onEliminada ?? vi.fn()}
    />
  );
}

afterEach(() => {
  cleanup();
  mockEditar.mockReset();
  mockEliminar.mockReset();
});

describe("EditarResena — acciones", () => {
  it("expone los botones discretos de editar y eliminar", () => {
    renderAcciones();

    expect(screen.getByRole("button", { name: "Editar reseña" }))
      .toBeDefined();
    expect(screen.getByRole("button", { name: "Eliminar reseña" }))
      .toBeDefined();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("no elimina sin confirmación y cancelable el diálogo", () => {
    const onEliminada = vi.fn();
    renderAcciones({ onEliminada });

    fireEvent.click(screen.getByRole("button", { name: "Eliminar reseña" }));

    const dialogo = screen.getByRole("dialog", {
      name: "Eliminar reseña",
    });
    expect(within(dialogo).getByText("¿Deseas eliminar tu opinión?"))
      .toBeDefined();
    expect(mockEliminar).not.toHaveBeenCalled();

    fireEvent.click(within(dialogo).getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onEliminada).not.toHaveBeenCalled();
  });

  it("elimina tras confirmar y avoca el id eliminado", async () => {
    const onEliminada = vi.fn();
    mockEliminar.mockResolvedValueOnce();

    renderAcciones({ onEliminada });

    fireEvent.click(screen.getByRole("button", { name: "Eliminar reseña" }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Eliminar",
      }),
    );

    await expect.poll(() => mockEliminar).toHaveBeenCalledWith(7);
    expect(onEliminada).toHaveBeenCalledWith(7);
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("edita con el comentario precargado y avoca la reseña actualizada", async () => {
    const onEditada = vi.fn();
    const editada: ResenaResponse = {
      ...RESENA,
      comentario: "Comentario tintado corregido.",
    };
    mockEditar.mockResolvedValueOnce(editada);

    renderAcciones({ onEditada });

    fireEvent.click(screen.getByRole("button", { name: "Editar reseña" }));

    const dialogo = screen.getByRole("dialog", { name: "Editar reseña" });
    const area = within(dialogo).getByLabelText(
      "Tu reseña actualizada"
    ) as HTMLTextAreaElement;
    expect(area.value).toBe("La batería irónicamente me decepciona.");

    fireEvent.change(area, {
      target: { value: "Comentario corregido." },
    });
    fireEvent.click(
      within(dialogo).getByRole("button", { name: "Guardar cambios" }),
    );

    await expect.poll(() => mockEditar).toHaveBeenCalledWith(7, "Comentario corregido.");
    expect(onEditada).toHaveBeenCalledWith(editada);
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });
});

describe("EditarResena — reacciona fiel al error del backend", () => {
  it("muestra un mensaje controlado cuando eliminar falla", async () => {
    mockEliminar.mockRejectedValueOnce(
      new Error("No fue posible eliminar la reseña.")
    );

    renderAcciones();

    fireEvent.click(screen.getByRole("button", { name: "Eliminar reseña" }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Eliminar",
      }),
    );

    expect(
      await screen.findByText(
        "No fue posible completar la acción. Inténtalo de nuevo más tarde."
      )
    ).toBeDefined();
    expect(screen.getByRole("dialog")).toBeDefined();
    expect(
      within(screen.getByRole("dialog"))
        .getByRole("button", { name: "Eliminar" })
        .hasAttribute("disabled")
    ).toBe(false);
  });
});

describe("EditarResena — accesibilidad del diálogo de edición", () => {
  it("cierra al presionar Escape y atrapa el foco con Tab", () => {
    renderAcciones();

    fireEvent.click(screen.getByRole("button", { name: "Editar reseña" }));
    const dialogo = screen.getByRole("dialog", { name: "Editar reseña" });

    const area = within(dialogo).getByLabelText(
      "Tu reseña actualizada"
    ) as HTMLTextAreaElement;
    const guardar = within(dialogo).getByRole("button", {
      name: "Guardar cambios",
    });

    expect(document.activeElement).toBe(area);

    fireEvent.keyDown(guardar, { key: "Tab" });
    expect(document.activeElement).toBe(area);

    fireEvent.keyDown(area, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(guardar);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("bloquea el scroll del documento mientras el diálogo está abierto", () => {
    renderAcciones();

    fireEvent.click(screen.getByRole("button", { name: "Editar reseña" }));
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.keyDown(window, { key: "Escape" });
    expect(document.body.style.overflow).toBe("");
  });
});
