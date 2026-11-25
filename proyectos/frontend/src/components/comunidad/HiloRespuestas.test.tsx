// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { RespuestaComunidad } from "@/types/comunidad";

const api = vi.hoisted(() => ({ obtenerRespuestasComunidad: vi.fn(), crearRespuestaComunidad: vi.fn() }));
vi.mock("@/services/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/api")>()),
  ...api,
}));

import HiloRespuestas from "./HiloRespuestas";

function respuesta(id: number, extra: Partial<RespuestaComunidad> = {}): RespuestaComunidad {
  return {
    idRespuesta: id, idRespuestaPadre: null, profundidad: 0, contenido: `Respuesta ${id}`, autor: "Ana",
    enRespuestaA: null, estadoVisible: "VISIBLE", estadoModeracion: null, respuestasHijas: 0, meGusta: 0,
    meGustaPropio: false, esAutor: false, fechaCreacion: "2026-11-25T10:00:00", fechaEdicion: null, ...extra,
  };
}

const props = { idPublicacion: 5, puedeResponder: true, autenticado: true, onRequiereSesion: vi.fn() };

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("HiloRespuestas", () => {
  it("muestra dos niveles al cargar, como listas anidadas con aria-level", async () => {
    api.obtenerRespuestasComunidad.mockImplementation(async (_id: number, { padre }: { padre?: number | null }) =>
      padre == null
        ? { items: [respuesta(1, { respuestasHijas: 1 })], nextCursor: null }
        : { items: [respuesta(2, { idRespuestaPadre: 1, profundidad: 1 })], nextCursor: null });
    render(<HiloRespuestas {...props} padre={null} nivel={0} />);

    const raiz = await screen.findByRole("list", { name: /respuestas/i });
    expect(await within(raiz).findByText("Respuesta 2")).toBeTruthy();
    const items = screen.getAllByRole("listitem");
    expect((items[0]).getAttribute("aria-level")).toBe("1");
    expect((items[1]).getAttribute("aria-level")).toBe("2");
  });

  it("en el nivel 1 muestra «Ver N respuestas» y las carga al pulsarlo", async () => {
    api.obtenerRespuestasComunidad.mockImplementation(async (_id: number, { padre }: { padre?: number | null }) =>
      padre === 10
        ? { items: [respuesta(11, { idRespuestaPadre: 10, profundidad: 2, enRespuestaA: "Luis" })], nextCursor: null }
        : { items: [respuesta(10, { profundidad: 1, respuestasHijas: 1 })], nextCursor: null });
    render(<HiloRespuestas {...props} padre={9} nivel={1} />);

    fireEvent.click(await screen.findByRole("button", { name: /ver 1 respuesta/i }));

    expect(await screen.findByText("Respuesta 11")).toBeTruthy();
    expect(screen.getByText(/en respuesta a @luis/i)).toBeTruthy();
  });

  it("una respuesta eliminada conserva su lugar sin texto", async () => {
    api.obtenerRespuestasComunidad.mockResolvedValue({
      items: [respuesta(3, { estadoVisible: "ELIMINADA", contenido: null, autor: null })], nextCursor: null });
    render(<HiloRespuestas {...props} padre={null} nivel={0} />);

    expect(await screen.findByText("Esta respuesta fue eliminada.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /responder/i })).toBeNull();
  });

  it("muestra el texto con enlaces como texto plano", async () => {
    api.obtenerRespuestasComunidad.mockResolvedValue({
      items: [respuesta(4, { contenido: "Visita http://spam.example" })], nextCursor: null });
    const { container } = render(<HiloRespuestas {...props} padre={null} nivel={0} />);

    expect(await screen.findByText(/http:\/\/spam\.example/)).toBeTruthy();
    expect(container.querySelector("a[href^='http']")).toBeNull();
  });

  it("una hermana recién creada no se repite al cargar más respuestas", async () => {
    api.obtenerRespuestasComunidad
      .mockResolvedValueOnce({ items: [respuesta(11, { idRespuestaPadre: 10, profundidad: 2 })], nextCursor: "c1" })
      .mockResolvedValueOnce({ items: [respuesta(12, { idRespuestaPadre: 10, profundidad: 2, enRespuestaA: "Ana" })], nextCursor: null });
    api.crearRespuestaComunidad.mockResolvedValue(respuesta(12, { idRespuestaPadre: 10, profundidad: 2, enRespuestaA: "Ana" }));
    render(<HiloRespuestas {...props} padre={10} nivel={2} />);

    fireEvent.click(await screen.findByRole("button", { name: /responder a ana/i }));
    fireEvent.change(screen.getByLabelText(/tu respuesta/i), { target: { value: "Respuesta 12" } });
    fireEvent.click(screen.getByRole("button", { name: /^responder$/i }));
    await screen.findByText("Respuesta 12");
    fireEvent.click(screen.getByRole("button", { name: /cargar más respuestas/i }));

    await waitFor(() => expect(api.obtenerRespuestasComunidad).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole("button", { name: /cargar más respuestas/i })).toBeNull());
    expect(screen.getAllByText("Respuesta 12")).toHaveLength(1);
  });

  it("Responder abre el formulario en línea y se usa con teclado", async () => {
    api.obtenerRespuestasComunidad.mockResolvedValue({ items: [respuesta(6)], nextCursor: null });
    render(<HiloRespuestas {...props} padre={null} nivel={0} />);

    const responder = await screen.findByRole("button", { name: /responder a ana/i });
    responder.focus();
    fireEvent.click(responder);

    expect(document.activeElement).toBe(screen.getByLabelText(/tu respuesta/i));
  });
});
