// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const api = vi.hoisted(() => ({
  darMeGustaComunidad: vi.fn(),
  retirarMeGustaComunidad: vi.fn(),
}));
vi.mock("@/services/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/api")>()),
  ...api,
}));

import BotonMeGusta from "./BotonMeGusta";
import { ApiError } from "@/services/api";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("BotonMeGusta", () => {
  it("da el Me gusta de forma optimista y confirma el conteo del servidor", async () => {
    api.darMeGustaComunidad.mockResolvedValue({ meGusta: 5, meGustaPropio: true });
    render(<BotonMeGusta tipo="publicaciones" id={7} meGusta={3} meGustaPropio={false} autenticado onRequiereSesion={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /me gusta/i }));

    expect((screen.getByRole("button", { name: /me gusta/i })).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("4")).toBeTruthy();
    await waitFor(() => expect(screen.getByText("5")).toBeTruthy());
    expect(api.darMeGustaComunidad).toHaveBeenCalledWith("publicaciones", 7);
  });

  it("revierte el estado si la petición falla y muestra el motivo", async () => {
    api.retirarMeGustaComunidad.mockRejectedValue(new ApiError("Usuario inactivo o suspendido.", 403));
    render(<BotonMeGusta tipo="respuestas" id={2} meGusta={1} meGustaPropio autenticado onRequiereSesion={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /me gusta/i }));

    await waitFor(() => expect((screen.getByRole("alert")).textContent).toContain("Usuario inactivo o suspendido."));
    expect((screen.getByRole("button", { name: /me gusta/i })).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("1")).toBeTruthy();
  });

  it("sin sesión pide iniciar sesión y no llama al servidor", () => {
    const onRequiereSesion = vi.fn();
    render(<BotonMeGusta tipo="publicaciones" id={7} meGusta={0} meGustaPropio={false} autenticado={false} onRequiereSesion={onRequiereSesion} />);

    fireEvent.click(screen.getByRole("button", { name: /me gusta/i }));

    expect(onRequiereSesion).toHaveBeenCalled();
    expect(api.darMeGustaComunidad).not.toHaveBeenCalled();
  });
});
