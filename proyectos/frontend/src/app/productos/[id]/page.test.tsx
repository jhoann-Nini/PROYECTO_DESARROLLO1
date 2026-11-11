// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import type { ProductoResponse } from "@/types/producto";

const { mockNotFound, mockObtenerProductoPorId } = vi.hoisted(() => ({
  mockNotFound: vi.fn((): never => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  mockObtenerProductoPorId: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: mockNotFound,
}));

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    obtenerProductoPorId: mockObtenerProductoPorId,
  };
});

vi.mock("./DetalleProductoCliente", () => ({
  default: () => null,
}));

import { ApiError, obtenerProductoPorId } from "@/services/api";
import DetalleProductoPage from "./page";

const PRODUCTO: ProductoResponse = {
  idProducto: 24,
  nombre: "Producto de prueba",
  descripcion: null,
  idCategoria: 1,
  idMarca: 1,
  imagen: null,
  precioReferencia: null,
  estado: true,
};

const mockProducto = vi.mocked(obtenerProductoPorId);

function crearProps(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  mockNotFound.mockClear();
  mockProducto.mockReset();
});

describe("DetalleProductoPage", () => {
  it("consulta el producto y entrega el cliente con el id validado", async () => {
    mockProducto.mockResolvedValue(PRODUCTO);

    const resultado = (await DetalleProductoPage(
      crearProps("24"),
    )) as ReactElement<{ idProducto: number }>;

    expect(mockProducto).toHaveBeenCalledWith(24);
    expect(mockNotFound).not.toHaveBeenCalled();
    expect(resultado.props.idProducto).toBe(24);
  });

  it("devuelve 404 sin consultar la API cuando el id no es válido", async () => {
    await expect(DetalleProductoPage(crearProps("abc"))).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );

    expect(mockProducto).not.toHaveBeenCalled();
    expect(mockNotFound).toHaveBeenCalledTimes(1);
  });

  it("devuelve 404 cuando la API responde que el producto no existe", async () => {
    mockProducto.mockRejectedValue(
      new ApiError("Producto no encontrado", 404),
    );

    await expect(DetalleProductoPage(crearProps("999999"))).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );

    expect(mockNotFound).toHaveBeenCalledTimes(1);
  });

  it("mantiene el error en el cliente si la API falla por otra causa", async () => {
    mockProducto.mockRejectedValue(new ApiError("Backend no disponible", 500));

    const resultado = (await DetalleProductoPage(
      crearProps("24"),
    )) as ReactElement<{ idProducto: number }>;

    expect(mockNotFound).not.toHaveBeenCalled();
    expect(resultado.props.idProducto).toBe(24);
  });
});
