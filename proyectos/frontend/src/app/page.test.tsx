// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import Home from "./page";
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

describe("Página principal / (Home)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  describe("1. Carga inicial", () => {
    it("debe mostrar el indicador de carga y el estado inicial 'Modo local' mientras la consulta está en curso", () => {
      mockObtenerProductos.mockImplementation(() => new Promise(() => {}));

      render(<Home />);

      // Cambiar a la pestaña del catálogo general para observar la sección dinámica
      fireEvent.click(screen.getByRole("button", { name: /Catálogo general/i }));

      expect(
        screen.getByText("Cargando catálogo de dispositivos..."),
      ).toBeDefined();
      expect(screen.getByText("Modo local")).toBeDefined();
      expect(screen.queryByText("Servidor conectado")).toBeNull();
    });
  });

  describe("2. API con productos", () => {
    it("debe mostrar los productos recibidos y la insignia 'Servidor conectado'", async () => {
      const productosBackend: Producto[] = [
        {
          idProducto: 991,
          nombre: "Monitor Profesional 4K HDR",
          descripcion: "Monitor IPS de precisión para creadores",
          precioReferencia: 650,
          idCategoria: 3,
          idMarca: 1,
          nombreCategoria: "Laptops / PCs",
          nombreMarca: "Asus",
          imagen: null,
          estado: true,
        },
      ];

      mockObtenerProductos.mockResolvedValueOnce(productosBackend);

      render(<Home />);

      fireEvent.click(screen.getByRole("button", { name: /Catálogo general/i }));

      await waitFor(() => {
        expect(screen.getByText("Servidor conectado")).toBeDefined();
      });

      expect(screen.getByText("Monitor Profesional 4K HDR")).toBeDefined();
      expect(
        screen.queryByText("Cargando catálogo de dispositivos..."),
      ).toBeNull();
      expect(screen.queryByText("Modo local")).toBeNull();
    });
  });

  describe("3. API con lista vacía ([])", () => {
    it("debe activar PRODUCTOS_MOCK y mostrar la insignia 'Modo local' ante un arreglo vacío", async () => {
      mockObtenerProductos.mockResolvedValueOnce([]);

      render(<Home />);

      fireEvent.click(screen.getByRole("button", { name: /Catálogo general/i }));

      await waitFor(() => {
        expect(
          screen.queryByText("Cargando catálogo de dispositivos..."),
        ).toBeNull();
      });

      expect(screen.getByText("Modo local")).toBeDefined();
      expect(screen.queryByText("Servidor conectado")).toBeNull();
      expect(
        screen.getByText("Nothing Phone (2a) Special Edition"),
      ).toBeDefined();
    });
  });

  describe("4. Error HTTP 500", () => {
    it("debe recurrir a datos simulados y no bloquear la interfaz ante error 500", async () => {
      mockObtenerProductos.mockRejectedValueOnce(
        new ApiError(
          "El servidor respondió con un error (500). Inténtalo de nuevo más tarde.",
          500,
        ),
      );

      render(<Home />);

      fireEvent.click(screen.getByRole("button", { name: /Catálogo general/i }));

      await waitFor(() => {
        expect(
          screen.queryByText("Cargando catálogo de dispositivos..."),
        ).toBeNull();
      });

      expect(screen.getByText("Modo local")).toBeDefined();
      expect(screen.queryByText("Servidor conectado")).toBeNull();
      expect(
        screen.getByText("Nothing Phone (2a) Special Edition"),
      ).toBeDefined();
    });
  });

  describe("5. Fallo de red", () => {
    it("debe recurrir a datos simulados cuando no es posible conectar con el servidor", async () => {
      mockObtenerProductos.mockRejectedValueOnce(
        new ApiError(
          "No fue posible conectarse con el servidor. Verifica que el backend esté activo e inténtalo de nuevo.",
        ),
      );

      render(<Home />);

      fireEvent.click(screen.getByRole("button", { name: /Catálogo general/i }));

      await waitFor(() => {
        expect(
          screen.queryByText("Cargando catálogo de dispositivos..."),
        ).toBeNull();
      });

      expect(screen.getByText("Modo local")).toBeDefined();
      expect(screen.queryByText("Servidor conectado")).toBeNull();
      expect(
        screen.getByText("Nothing Phone (2a) Special Edition"),
      ).toBeDefined();
    });
  });

  describe("6. JSON malformado", () => {
    it("debe recurrir a datos simulados cuando la respuesta no es JSON válido", async () => {
      mockObtenerProductos.mockRejectedValueOnce(
        new ApiError(
          "El servidor respondió, pero los datos recibidos no son JSON válido.",
        ),
      );

      render(<Home />);

      fireEvent.click(screen.getByRole("button", { name: /Catálogo general/i }));

      await waitFor(() => {
        expect(
          screen.queryByText("Cargando catálogo de dispositivos..."),
        ).toBeNull();
      });

      expect(screen.getByText("Modo local")).toBeDefined();
      expect(screen.queryByText("Servidor conectado")).toBeNull();
      expect(
        screen.getByText("Nothing Phone (2a) Special Edition"),
      ).toBeDefined();
    });
  });

  describe("7. Estructura inesperada", () => {
    it("debe recurrir a datos simulados cuando la respuesta no tiene formato de lista", async () => {
      mockObtenerProductos.mockRejectedValueOnce(
        new ApiError(
          "La respuesta del servidor no tiene el formato esperado (lista de productos).",
        ),
      );

      render(<Home />);

      fireEvent.click(screen.getByRole("button", { name: /Catálogo general/i }));

      await waitFor(() => {
        expect(
          screen.queryByText("Cargando catálogo de dispositivos..."),
        ).toBeNull();
      });

      expect(screen.getByText("Modo local")).toBeDefined();
      expect(screen.queryByText("Servidor conectado")).toBeNull();
      expect(
        screen.getByText("Nothing Phone (2a) Special Edition"),
      ).toBeDefined();
    });
  });
});
