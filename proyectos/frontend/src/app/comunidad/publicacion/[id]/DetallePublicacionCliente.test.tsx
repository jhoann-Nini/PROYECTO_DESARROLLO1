// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { PublicacionDetalle } from "@/types/comunidad";
import type { UsuarioSesion } from "@/types/producto";

const navegacion = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => navegacion,
  usePathname: () => "/comunidad/publicacion/1",
  useSearchParams: () => new URLSearchParams(),
}));
const sesion = vi.hoisted(() => ({
  usuario: { id: "u1", nombre: "Ana", usuario: "ana", email: "ana@test.local" } as UsuarioSesion | null,
  cargando: false, error: null, establecerUsuario: vi.fn(), limpiarError: vi.fn(), cerrarSesion: vi.fn(), reintentar: vi.fn(),
}));
vi.mock("@/hooks/useSesionTecReview", () => ({ useSesionTecReview: () => sesion }));
vi.mock("@/components/AuthModal", () => ({ default: () => null }));
const api = vi.hoisted(() => ({
  obtenerPublicacionComunidad: vi.fn(),
  obtenerRespuestasComunidad: vi.fn(),
  editarPublicacionComunidad: vi.fn(),
  eliminarPublicacionComunidad: vi.fn(),
}));
vi.mock("@/services/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/api")>()),
  ...api,
}));

import DetallePublicacionCliente from "./DetallePublicacionCliente";
import { ApiError } from "@/services/api";

function detalle(extra: Partial<PublicacionDetalle> = {}): PublicacionDetalle {
  return {
    idPublicacion: 1, tipo: "GENERAL", idProducto: null, nombreProducto: null, titulo: "Qué celular compro",
    contenido: "Vi uno en https://tienda.example\n¿Opiniones?", autor: "Luis", fechaCreacion: "2026-11-25T10:00:00",
    fechaEdicion: null, fechaUltimaActividad: "2026-11-25T10:00:00", respuestas: 0, meGusta: 2, meGustaPropio: false,
    esAutor: false, estadoModeracion: null, cerrada: false, ...extra,
  };
}

beforeEach(() => {
  api.obtenerRespuestasComunidad.mockResolvedValue({ items: [], nextCursor: null });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("DetallePublicacionCliente", () => {
  it("muestra la publicación como texto plano, con estado de carga", async () => {
    api.obtenerPublicacionComunidad.mockResolvedValue(detalle());
    const { container } = render(<DetallePublicacionCliente idPublicacion={1} />);

    expect(screen.getByRole("status").getAttribute("aria-busy")).toBe("true");
    expect(await screen.findByRole("heading", { name: "Qué celular compro" })).toBeTruthy();
    expect(container.querySelector("a[href^='https://tienda']")).toBeNull();
    expect(screen.getByLabelText(/tu respuesta/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^editar$/i })).toBeNull();
  });

  it("404: no existe o no está disponible", async () => {
    api.obtenerPublicacionComunidad.mockRejectedValue(new ApiError("Publicación no encontrada con id 1", 404));
    render(<DetallePublicacionCliente idPublicacion={1} />);
    expect(await screen.findByText(/no existe o ya no está disponible/i)).toBeTruthy();
  });

  it("error de red con Reintentar", async () => {
    api.obtenerPublicacionComunidad
      .mockRejectedValueOnce(new ApiError("El servidor no responde", 500))
      .mockResolvedValueOnce(detalle());
    render(<DetallePublicacionCliente idPublicacion={1} />);
    fireEvent.click(await screen.findByRole("button", { name: /reintentar/i }));
    expect(await screen.findByRole("heading", { name: "Qué celular compro" })).toBeTruthy();
  });

  it("el autor ve el aviso de revisión y puede editar; un 403 muestra el motivo", async () => {
    api.obtenerPublicacionComunidad.mockResolvedValue(detalle({ esAutor: true, estadoModeracion: "PENDIENTE" }));
    api.editarPublicacionComunidad.mockRejectedValue(
      new ApiError("Tu cuenta no puede publicar ni reportar hasta el 2 de diciembre de 2026 por reincidencia.", 403));
    render(<DetallePublicacionCliente idPublicacion={1} />);

    expect((await screen.findByText(/en revisión/i)).textContent).toMatch(/solo tú y los moderadores/i);
    fireEvent.click(screen.getByRole("button", { name: /^editar$/i }));
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("por reincidencia"));
  });

  it("una publicación cerrada no ofrece responder", async () => {
    api.obtenerPublicacionComunidad.mockResolvedValue(detalle({ cerrada: true }));
    render(<DetallePublicacionCliente idPublicacion={1} />);
    expect(await screen.findByText(/está cerrada/i)).toBeTruthy();
    expect(screen.queryByLabelText(/tu respuesta/i)).toBeNull();
  });

  it("eliminar la propia vuelve a la comunidad", async () => {
    api.obtenerPublicacionComunidad.mockResolvedValue(detalle({ esAutor: true }));
    api.eliminarPublicacionComunidad.mockResolvedValue(undefined);
    render(<DetallePublicacionCliente idPublicacion={1} />);

    fireEvent.click(await screen.findByRole("button", { name: /^eliminar$/i }));
    fireEvent.click(screen.getByRole("button", { name: /sí, eliminar/i }));

    await waitFor(() => expect(navegacion.push).toHaveBeenCalledWith("/comunidad"));
  });
});
