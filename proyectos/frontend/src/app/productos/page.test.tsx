// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import ProductosPage from "./page";
import { ApiError } from "@/services/api";
import type { Producto } from "@/types/producto";

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    obtenerProductos: vi.fn(),
  };
});

import { obtenerProductos } from "@/services/api";
const mockObtenerProductos = vi.mocked(obtenerProductos);

describe("Página /productos (ProductosPage)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe("Carga inicial", () => {
    it("debe mostrar el mensaje de carga mientras la consulta está en curso", () => {
      mockObtenerProductos.mockImplementation(() => new Promise(() => {}));

      render(<ProductosPage />);

      expect(
        screen.getByText("Consultando catálogo de productos en el servidor..."),
      ).toBeDefined();
      expect(screen.queryByText(/productos registrados/i)).toBeNull();
      expect(screen.queryByText(/Estado de conexión con el backend:/i)).toBeNull();
    });
  });

  describe("Respuesta vacía", () => {
    it("debe mostrar '0 productos registrados' y no renderizar tarjetas cuando la API devuelve []", async () => {
      mockObtenerProductos.mockResolvedValueOnce([]);

      render(<ProductosPage />);

      await waitFor(() => {
        expect(screen.getByText("0 productos registrados")).toBeDefined();
      });

      expect(
        screen.queryByText("Consultando catálogo de productos en el servidor..."),
      ).toBeNull();
      expect(screen.queryByText(/Estado de conexión con el backend:/i)).toBeNull();
      expect(screen.queryByText("Precio")).toBeNull();
    });
  });

  describe("Error HTTP 500", () => {
    it("debe mostrar el banner de alerta con el mensaje de error 500", async () => {
      mockObtenerProductos.mockRejectedValueOnce(
        new ApiError(
          "El servidor respondió con un error (500). Inténtalo de nuevo más tarde.",
          500,
        ),
      );

      render(<ProductosPage />);

      await waitFor(() => {
        expect(
          screen.getByText("Estado de conexión con el backend:"),
        ).toBeDefined();
      });

      expect(
        screen.getByText(
          "El servidor respondió con un error (500). Inténtalo de nuevo más tarde.",
        ),
      ).toBeDefined();
      expect(screen.queryByText(/productos registrados/i)).toBeNull();
      expect(
        screen.queryByText("Consultando catálogo de productos en el servidor..."),
      ).toBeNull();
    });
  });

  describe("Fallo de red", () => {
    it("debe mostrar el mensaje de error de conexión cuando el backend no está disponible", async () => {
      mockObtenerProductos.mockRejectedValueOnce(
        new ApiError(
          "No fue posible conectarse con el servidor. Verifica que el backend esté activo e inténtalo de nuevo.",
        ),
      );

      render(<ProductosPage />);

      await waitFor(() => {
        expect(
          screen.getByText("Estado de conexión con el backend:"),
        ).toBeDefined();
      });

      expect(
        screen.getByText(
          "No fue posible conectarse con el servidor. Verifica que el backend esté activo e inténtalo de nuevo.",
        ),
      ).toBeDefined();
      expect(screen.queryByText(/productos registrados/i)).toBeNull();
    });
  });

  describe("JSON malformado", () => {
    it("debe mostrar el mensaje de datos recibidos no válidos", async () => {
      mockObtenerProductos.mockRejectedValueOnce(
        new ApiError(
          "El servidor respondió, pero los datos recibidos no son JSON válido.",
        ),
      );

      render(<ProductosPage />);

      await waitFor(() => {
        expect(
          screen.getByText("Estado de conexión con el backend:"),
        ).toBeDefined();
      });

      expect(
        screen.getByText(
          "El servidor respondió, pero los datos recibidos no son JSON válido.",
        ),
      ).toBeDefined();
      expect(screen.queryByText(/productos registrados/i)).toBeNull();
    });
  });

  describe("Estructura inesperada", () => {
    it("debe mostrar el mensaje indicando que el formato no es el esperado", async () => {
      mockObtenerProductos.mockRejectedValueOnce(
        new ApiError(
          "La respuesta del servidor no tiene el formato esperado (lista de productos).",
        ),
      );

      render(<ProductosPage />);

      await waitFor(() => {
        expect(
          screen.getByText("Estado de conexión con el backend:"),
        ).toBeDefined();
      });

      expect(
        screen.getByText(
          "La respuesta del servidor no tiene el formato esperado (lista de productos).",
        ),
      ).toBeDefined();
      expect(screen.queryByText(/productos registrados/i)).toBeNull();
    });
  });

  describe("Respuesta exitosa con productos", () => {
    it("debe mostrar el contador de productos y las tarjetas con los nombres y descripciones correspondientes", async () => {
      const productosPrueba: Producto[] = [
        {
          idProducto: 101,
          nombre: "Laptop Pro X1",
          descripcion: "Computador portátil ultraligero",
          precioReferencia: 4500000,
          idCategoria: 3,
          idMarca: 1,
          imagen: null,
          estado: true,
        },
        {
          idProducto: 102,
          nombre: "Audífonos Inalámbricos Ultra",
          descripcion: "Cancelación activa de ruido",
          precioReferencia: 350000,
          idCategoria: 4,
          idMarca: 2,
          imagen: null,
          estado: true,
        },
      ];

      mockObtenerProductos.mockResolvedValueOnce(productosPrueba);

      render(<ProductosPage />);

      await waitFor(() => {
        expect(screen.getByText("2 productos registrados")).toBeDefined();
      });

      expect(screen.getByText("Laptop Pro X1")).toBeDefined();
      expect(screen.getByText("Computador portátil ultraligero")).toBeDefined();
      expect(screen.getByText("Audífonos Inalámbricos Ultra")).toBeDefined();
      expect(screen.getByText("Cancelación activa de ruido")).toBeDefined();
      expect(screen.getAllByText("Precio")).toHaveLength(2);
      expect(
        screen.queryByText("Consultando catálogo de productos en el servidor..."),
      ).toBeNull();
      expect(screen.queryByText(/Estado de conexión con el backend:/i)).toBeNull();
    });
  });
});
