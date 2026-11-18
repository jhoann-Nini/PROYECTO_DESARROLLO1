// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CLAVE_COMPARADOR } from "@/data/comparador";
import { CLAVE_COMPARADOS_RECIENTES } from "@/data/comparadosRecientes";
import type { Producto } from "@/types/producto";

vi.mock("@/services/api", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/services/api")>(),
  obtenerProductos: vi.fn(),
}));
import { obtenerProductos } from "@/services/api";
import BotonComparador from "./BotonComparador";

const CATALOGO: Producto[] = [1, 2, 3].map((idProducto) => ({
  idProducto,
  nombre: `Producto ${idProducto}`,
  idCategoria: idProducto === 3 ? 20 : 10,
  nombreCategoria: idProducto === 3 ? "Auriculares" : "Celulares",
  idMarca: 1,
  descripcion: null,
  imagen: null,
  precioReferencia: null,
  estado: true,
}));

beforeEach(() => {
  localStorage.clear();
  vi.mocked(obtenerProductos).mockResolvedValue(CATALOGO);
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.resetAllMocks();
});

describe("BotonComparador", () => {
  it("bloquea otra categoría desde la ficha sin alterar selección ni historial", async () => {
    localStorage.setItem(CLAVE_COMPARADOR, "[1,2]");
    localStorage.setItem(CLAVE_COMPARADOS_RECIENTES, "[2,1]");
    render(<BotonComparador idProducto={3} nombreProducto="Producto 3" />);
    expect(await screen.findByText(/Solo puedes comparar productos de Celulares/)).toBeDefined();
    const boton = screen.getByRole("button", { name: "Agregar al comparador" }) as HTMLButtonElement;
    expect(boton.disabled).toBe(true);
    fireEvent.click(boton);
    expect(localStorage.getItem(CLAVE_COMPARADOR)).toBe("[1,2]");
    expect(localStorage.getItem(CLAVE_COMPARADOS_RECIENTES)).toBe("[2,1]");
  });

  it("depura una selección mixta y permite agregar un producto compatible", async () => {
    localStorage.setItem(CLAVE_COMPARADOR, "[99,1,3]");
    render(<BotonComparador idProducto={2} nombreProducto="Producto 2" />);
    const boton = await screen.findByRole("button", { name: "Agregar al comparador" });
    await waitFor(() => expect((boton as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(boton);
    expect(JSON.parse(localStorage.getItem(CLAVE_COMPARADOR) ?? "[]")).toEqual([1, 2]);
    fireEvent.click(screen.getByRole("button", { name: "Quitar del comparador" }));
    expect(JSON.parse(localStorage.getItem(CLAVE_COMPARADOR) ?? "[]")).toEqual([1]);
  });

  it("conserva la selección y bloquea adiciones si falla la validación; permite reintentar", async () => {
    localStorage.setItem(CLAVE_COMPARADOR, "[1,3]");
    vi.mocked(obtenerProductos).mockRejectedValueOnce(new Error("Sin conexión"));
    render(<BotonComparador idProducto={2} nombreProducto="Producto 2" />);
    const reintentar = await screen.findByRole("button", { name: "Reintentar comparador" });
    expect(localStorage.getItem(CLAVE_COMPARADOR)).toBe("[1,3]");
    expect((screen.getByRole("button", { name: "Agregar al comparador" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(reintentar);
    const boton = await screen.findByRole("button", { name: "Agregar al comparador" });
    await waitFor(() => expect((boton as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(boton);
    expect(JSON.parse(localStorage.getItem(CLAVE_COMPARADOR) ?? "[]")).toEqual([1, 2]);
  });

  it("no altera la selección mientras carga el catálogo", async () => {
    localStorage.setItem(CLAVE_COMPARADOR, "[1,3]");
    vi.mocked(obtenerProductos).mockReturnValue(new Promise(() => {}));
    render(<BotonComparador idProducto={2} nombreProducto="Producto 2" />);
    const boton = screen.getByRole("button", { name: "Cargando comparador…" }) as HTMLButtonElement;
    expect(boton.disabled).toBe(true);
    fireEvent.click(boton);
    expect(localStorage.getItem(CLAVE_COMPARADOR)).toBe("[1,3]");
  });
});
