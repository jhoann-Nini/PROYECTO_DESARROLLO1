// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import BotonCompartir from "./BotonCompartir";

const URL_COMPARTIR = "https://tecreview.test/productos/204";

function definirShare(valor: unknown) {
  Object.defineProperty(navigator, "share", {
    value: valor,
    configurable: true,
    writable: true,
  });
}

function definirClipboard(valor: unknown) {
  Object.defineProperty(navigator, "clipboard", {
    value: valor,
    configurable: true,
    writable: true,
  });
}

beforeEach(() => {
  definirShare(undefined);
  definirClipboard(undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("BotonCompartir", () => {
  it("usa navigator.share cuando está disponible", async () => {
    const compartir = vi.fn().mockResolvedValue(undefined);
    definirShare(compartir);

    render(
      <BotonCompartir titulo="Galaxy S25" url={URL_COMPARTIR} />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Compartir producto" }),
    );

    await waitFor(() => {
      expect(compartir).toHaveBeenCalledTimes(1);
    });
    expect(compartir).toHaveBeenCalledWith({
      title: "Galaxy S25",
      text: "Galaxy S25",
      url: URL_COMPARTIR,
    });
    expect(await screen.findByText("Enlace compartido.")).toBeDefined();
  });

  it("copia al portapapeles y anuncia el enlace cuando no hay Web Share", async () => {
    const escribir = vi.fn().mockResolvedValue(undefined);
    definirClipboard({ writeText: escribir });

    render(
      <BotonCompartir titulo="Galaxy S25" url={URL_COMPARTIR} />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Compartir producto" }),
    );

    await waitFor(() => {
      expect(escribir).toHaveBeenCalledWith(URL_COMPARTIR);
    });
    const aviso = screen.getByRole("status");
    expect(aviso.textContent).toContain("Enlace copiado.");
  });

  it("cae al portapapeles si Web Share falla por una razón distinta a la cancelación", async () => {
    definirShare(vi.fn().mockRejectedValue(new Error("No disponible")));
    const escribir = vi.fn().mockResolvedValue(undefined);
    definirClipboard({ writeText: escribir });

    render(
      <BotonCompartir titulo="Galaxy S25" url={URL_COMPARTIR} />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Compartir producto" }),
    );

    await waitFor(() => {
      expect(escribir).toHaveBeenCalledWith(URL_COMPARTIR);
    });
    expect(screen.getByRole("status").textContent).toContain("Enlace copiado.");
  });

  it("no muestra error si el usuario cancela la hoja de compartir", async () => {
    const cancelacion = new DOMException("Cancelado", "AbortError");
    definirShare(vi.fn().mockRejectedValue(cancelacion));
    const escribir = vi.fn().mockResolvedValue(undefined);
    definirClipboard({ writeText: escribir });

    render(
      <BotonCompartir titulo="Galaxy S25" url={URL_COMPARTIR} />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Compartir producto" }),
    );

    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toBe("");
    });
    expect(escribir).not.toHaveBeenCalled();
  });

  it("anuncia un fallo controlado si el portapapeles no está disponible", async () => {
    render(
      <BotonCompartir titulo="Galaxy S25" url={URL_COMPARTIR} />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Compartir producto" }),
    );

    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toContain(
        "No pudimos copiar el enlace.",
      );
    });
  });

  it("anuncia un fallo controlado si el portapapeles rechaza la escritura", async () => {
    definirClipboard({
      writeText: vi.fn().mockRejectedValue(new Error("Permiso denegado")),
    });

    render(
      <BotonCompartir titulo="Galaxy S25" url={URL_COMPARTIR} />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Compartir producto" }),
    );

    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toContain(
        "No pudimos copiar el enlace.",
      );
    });
  });
});
