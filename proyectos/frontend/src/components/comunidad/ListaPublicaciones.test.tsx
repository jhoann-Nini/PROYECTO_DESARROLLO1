// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { PublicacionResumen } from "@/types/comunidad";
import type { UsuarioSesion } from "@/types/producto";

const navegacion = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => navegacion,
  usePathname: () => "/comunidad",
  useSearchParams: () => new URLSearchParams(),
}));

const sesion = vi.hoisted(() => ({
  usuario: null as UsuarioSesion | null,
  cargando: false,
  error: null,
  establecerUsuario: vi.fn(),
  limpiarError: vi.fn(),
  cerrarSesion: vi.fn(),
  reintentar: vi.fn(),
}));
vi.mock("@/hooks/useSesionTecReview", () => ({ useSesionTecReview: () => sesion }));
vi.mock("@/components/AuthModal", () => ({
  default: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div role="dialog">Inicia sesión</div> : null),
}));
const api = vi.hoisted(() => ({
  obtenerPublicacionesComunidad: vi.fn(),
  obtenerPublicacionesProducto: vi.fn(),
}));
vi.mock("@/services/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/api")>()),
  ...api,
}));

import ListaPublicaciones from "./ListaPublicaciones";
import { ApiError } from "@/services/api";

function publicacion(id: number, titulo: string): PublicacionResumen {
  return {
    idPublicacion: id, tipo: "GENERAL", idProducto: null, nombreProducto: null, titulo,
    extracto: "Extracto", autor: "Ana", fechaCreacion: "2026-11-25T10:00:00", fechaUltimaActividad: "2026-11-25T10:00:00",
    respuestas: 2, meGusta: 1, estadoModeracion: null, cerrada: false,
  };
}

beforeEach(() => {
  sesion.usuario = null;
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ListaPublicaciones", () => {
  it("muestra el estado de carga y luego las publicaciones con enlace al detalle", async () => {
    api.obtenerPublicacionesComunidad.mockResolvedValue({ items: [publicacion(1, "Qué celular compro")], nextCursor: null, total: 1 });
    render(<ListaPublicaciones />);

    expect((screen.getByRole("status")).getAttribute("aria-busy")).toBe("true");
    const enlace = await screen.findByRole("link", { name: /qué celular compro/i });
    expect((enlace).getAttribute("href")).toBe("/comunidad/publicacion/1");
  });

  it("muestra el estado vacío", async () => {
    api.obtenerPublicacionesComunidad.mockResolvedValue({ items: [], nextCursor: null, total: 0 });
    render(<ListaPublicaciones />);
    expect(await screen.findByText(/todavía no hay publicaciones/i)).toBeTruthy();
  });

  it("muestra el error con Reintentar", async () => {
    api.obtenerPublicacionesComunidad
      .mockRejectedValueOnce(new ApiError("El servidor no responde", 500))
      .mockResolvedValueOnce({ items: [publicacion(1, "Ya cargó")], nextCursor: null, total: 1 });
    render(<ListaPublicaciones />);

    fireEvent.click(await screen.findByRole("button", { name: /reintentar/i }));
    expect(await screen.findByText("Ya cargó")).toBeTruthy();
  });

  it("carga más páginas con el cursor", async () => {
    api.obtenerPublicacionesComunidad
      .mockResolvedValueOnce({ items: [publicacion(1, "Primera")], nextCursor: "c1", total: 2 })
      .mockResolvedValueOnce({ items: [publicacion(2, "Segunda")], nextCursor: null, total: 2 });
    render(<ListaPublicaciones />);

    fireEvent.click(await screen.findByRole("button", { name: /cargar más/i }));

    expect(await screen.findByText("Segunda")).toBeTruthy();
    expect(screen.getByText("Primera")).toBeTruthy();
    expect(api.obtenerPublicacionesComunidad).toHaveBeenLastCalledWith({ orden: "actividad", cursor: "c1", limite: 20 });
    expect(screen.queryByRole("button", { name: /cargar más/i })).toBeNull();
  });

  it("cambia el orden y vuelve a la primera página", async () => {
    api.obtenerPublicacionesComunidad.mockResolvedValue({ items: [publicacion(1, "Primera")], nextCursor: null, total: 1 });
    render(<ListaPublicaciones />);
    await screen.findByText("Primera");

    fireEvent.change(screen.getByLabelText(/ordenar/i), { target: { value: "recientes" } });

    await waitFor(() =>
      expect(api.obtenerPublicacionesComunidad).toHaveBeenLastCalledWith({ orden: "recientes", cursor: null, limite: 20 }));
  });

  it("sin sesión, Nueva publicación abre el inicio de sesión", async () => {
    api.obtenerPublicacionesComunidad.mockResolvedValue({ items: [], nextCursor: null, total: 0 });
    render(<ListaPublicaciones />);
    fireEvent.click(await screen.findByRole("button", { name: /nueva publicación/i }));
    expect((screen.getByRole("dialog")).textContent).toContain("Inicia sesión");
  });

  it("lista las de un producto con su propio endpoint", async () => {
    api.obtenerPublicacionesProducto.mockResolvedValue({ items: [], nextCursor: null, total: 0 });
    render(<ListaPublicaciones idProducto={4} />);
    await waitFor(() => expect(api.obtenerPublicacionesProducto).toHaveBeenCalledWith(4, { orden: "actividad", cursor: null, limite: 20 }));
  });
});
