// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const api = vi.hoisted(() => ({ crearPublicacionComunidad: vi.fn() }));
vi.mock("@/services/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/api")>()),
  ...api,
}));

import FormularioPublicacion from "./FormularioPublicacion";
import { ApiError } from "@/services/api";
import { LIMITES_COMUNIDAD } from "@/types/comunidad";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function escribir(titulo: string, contenido: string) {
  fireEvent.change(screen.getByLabelText(/título/i), { target: { value: titulo } });
  fireEvent.change(screen.getByLabelText(/contenido/i), { target: { value: contenido } });
}

describe("FormularioPublicacion", () => {
  it("usa los mismos límites que el backend", () => {
    render(<FormularioPublicacion tipo="GENERAL" onCreada={vi.fn()} onRequiereSesion={vi.fn()} />);
    expect(screen.getByLabelText(/título/i).getAttribute("maxLength")).toBe(String(LIMITES_COMUNIDAD.tituloMax));
    expect(screen.getByLabelText(/contenido/i).getAttribute("maxLength")).toBe(String(LIMITES_COMUNIDAD.publicacionMax));
    expect(LIMITES_COMUNIDAD).toEqual({ tituloMin: 5, tituloMax: 150, publicacionMax: 5000, respuestaMax: 3000 });
  });

  it("no envía un título de menos de 5 caracteres", () => {
    render(<FormularioPublicacion tipo="GENERAL" onCreada={vi.fn()} onRequiereSesion={vi.fn()} />);
    escribir("abcd", "Contenido");
    fireEvent.click(screen.getByRole("button", { name: /publicar/i }));
    expect((screen.getByRole("alert")).textContent).toMatch(/entre 5 y 150/);
    expect(api.crearPublicacionComunidad).not.toHaveBeenCalled();
  });

  it("avisa antes de enviar que un texto ofensivo quedará en revisión", () => {
    render(<FormularioPublicacion tipo="GENERAL" onCreada={vi.fn()} onRequiereSesion={vi.fn()} />);
    escribir("Mala atención", "el vendedor es un idiota");
    expect((screen.getByRole("status")).textContent).toMatch(/revisión/i);
  });

  it("crea la publicación de producto y la entrega", async () => {
    const onCreada = vi.fn();
    api.crearPublicacionComunidad.mockResolvedValue({ idPublicacion: 9, estadoModeracion: "PUBLICADA" });
    render(<FormularioPublicacion tipo="PRODUCTO" idProducto={3} onCreada={onCreada} onRequiereSesion={vi.fn()} />);
    escribir("Batería del modelo", "¿Cuánto les dura?");
    fireEvent.click(screen.getByRole("button", { name: /publicar/i }));

    await waitFor(() => expect(onCreada).toHaveBeenCalledWith(expect.objectContaining({ idPublicacion: 9 })));
    expect(api.crearPublicacionComunidad).toHaveBeenCalledWith({
      tipo: "PRODUCTO", idProducto: 3, titulo: "Batería del modelo", contenido: "¿Cuánto les dura?",
    });
  });

  it("muestra el mensaje del servidor al superar la cuota (429)", async () => {
    api.crearPublicacionComunidad.mockRejectedValue(
      new ApiError("Alcanzaste el límite de 5 publicaciones por hora. Intenta más tarde.", 429));
    render(<FormularioPublicacion tipo="GENERAL" onCreada={vi.fn()} onRequiereSesion={vi.fn()} />);
    escribir("Título válido", "Contenido");
    fireEvent.click(screen.getByRole("button", { name: /publicar/i }));

    await waitFor(() => expect((screen.getByRole("alert")).textContent).toContain("5 publicaciones por hora"));
  });

  it("sin sesión (401) pide iniciar sesión", async () => {
    const onRequiereSesion = vi.fn();
    api.crearPublicacionComunidad.mockRejectedValue(new ApiError("Sin sesión", 401));
    render(<FormularioPublicacion tipo="GENERAL" onCreada={vi.fn()} onRequiereSesion={onRequiereSesion} />);
    escribir("Título válido", "Contenido");
    fireEvent.click(screen.getByRole("button", { name: /publicar/i }));

    await waitFor(() => expect(onRequiereSesion).toHaveBeenCalled());
  });
});
