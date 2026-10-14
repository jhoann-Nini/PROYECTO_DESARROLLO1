import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("api.ts - Cliente API del frontend", () => {
  const DEFAULT_API_URL = "http://localhost:8080";
  let originalEnv: string | undefined;
  const fetchMock = vi.fn();

  beforeEach(() => {
    originalEnv = process.env.NEXT_PUBLIC_API_URL;
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_API_URL = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_API_URL;
    }
    vi.restoreAllMocks();
  });

  async function loadApi(apiUrl?: string) {
    vi.resetModules();
    if (apiUrl !== undefined) {
      process.env.NEXT_PUBLIC_API_URL = apiUrl;
    } else {
      delete process.env.NEXT_PUBLIC_API_URL;
    }
    return await import("@/services/api");
  }

  describe("Construcción de la URL de productos", () => {
    it("debe construir la URL correctamente sin barra final en NEXT_PUBLIC_API_URL", async () => {
      const { obtenerProductos } = await loadApi("http://localhost:8080");
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [],
      } as unknown as Response);

      await obtenerProductos();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith("http://localhost:8080/api/productos");
    });

    it("debe remover la barra final de NEXT_PUBLIC_API_URL para evitar doble barra", async () => {
      const { obtenerProductos } = await loadApi("http://localhost:8080/");
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [],
      } as unknown as Response);

      await obtenerProductos();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith("http://localhost:8080/api/productos");
    });
  });

  describe("Respuesta HTTP exitosa", () => {
    it("debe retornar la lista de productos cuando la respuesta HTTP es 200 y es un arreglo", async () => {
      const { obtenerProductos } = await loadApi(DEFAULT_API_URL);
      const listaEsperada = [
        { id: 1, nombre: "Laptop Pro", precio: 1500 },
        { id: 2, nombre: "Mouse Óptico", precio: 25 },
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => listaEsperada,
      } as unknown as Response);

      const productos = await obtenerProductos();

      expect(productos).toEqual(listaEsperada);
      expect(Array.isArray(productos)).toBe(true);
      expect(productos).toHaveLength(2);
    });

    it("debe retornar un arreglo vacío cuando el servidor responde HTTP 200 con una lista vacía", async () => {
      const { obtenerProductos } = await loadApi(DEFAULT_API_URL);

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [],
      } as unknown as Response);

      const productos = await obtenerProductos();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith("http://localhost:8080/api/productos");
      expect(productos).toEqual([]);
      expect(Array.isArray(productos)).toBe(true);
      expect(productos).toHaveLength(0);
    });
  });

  describe("Respuesta HTTP con error del servidor (500)", () => {
    it("debe lanzar ApiError con el mensaje y status 500 correspondiente", async () => {
      const { obtenerProductos, ApiError } = await loadApi(DEFAULT_API_URL);

      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as unknown as Response);

      let errorCapturado: unknown;
      try {
        await obtenerProductos();
      } catch (err) {
        errorCapturado = err;
      }

      expect(errorCapturado).toBeInstanceOf(ApiError);
      expect(errorCapturado).toBeInstanceOf(Error);
      const apiError = errorCapturado as InstanceType<typeof ApiError>;
      expect(apiError.name).toBe("ApiError");
      expect(apiError.status).toBe(500);
      expect(apiError.message).toBe(
        "El servidor respondió con un error (500). Inténtalo de nuevo más tarde.",
      );
    });
  });

  describe("Error de conexión", () => {
    it("debe lanzar ApiError cuando fetch falla por error de red o backend inactivo", async () => {
      const { obtenerProductos, ApiError } = await loadApi(DEFAULT_API_URL);

      fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));

      let errorCapturado: unknown;
      try {
        await obtenerProductos();
      } catch (err) {
        errorCapturado = err;
      }

      expect(errorCapturado).toBeInstanceOf(ApiError);
      const apiError = errorCapturado as InstanceType<typeof ApiError>;
      expect(apiError.name).toBe("ApiError");
      expect(apiError.status).toBeUndefined();
      expect(apiError.message).toBe(
        "No fue posible conectarse con el servidor. Verifica que el backend esté activo e inténtalo de nuevo.",
      );
    });
  });

  describe("Respuesta JSON con estructura inesperada", () => {
    it("debe lanzar ApiError si el servidor responde con un objeto en lugar de un arreglo", async () => {
      const { obtenerProductos, ApiError } = await loadApi(DEFAULT_API_URL);

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ total: 0, items: [] }),
      } as unknown as Response);

      let errorCapturado: unknown;
      try {
        await obtenerProductos();
      } catch (err) {
        errorCapturado = err;
      }

      expect(errorCapturado).toBeInstanceOf(ApiError);
      const apiError = errorCapturado as InstanceType<typeof ApiError>;
      expect(apiError.name).toBe("ApiError");
      expect(apiError.status).toBeUndefined();
      expect(apiError.message).toBe(
        "La respuesta del servidor no tiene el formato esperado (lista de productos).",
      );
    });
  });

  describe("Respuesta con JSON malformado", () => {
    it("debe lanzar ApiError cuando el cuerpo de la respuesta no es JSON válido", async () => {
      const { obtenerProductos, ApiError } = await loadApi(DEFAULT_API_URL);

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError("Unexpected token < in JSON at position 0");
        },
      } as unknown as Response);

      let errorCapturado: unknown;
      try {
        await obtenerProductos();
      } catch (err) {
        errorCapturado = err;
      }

      expect(errorCapturado).toBeInstanceOf(ApiError);
      const apiError = errorCapturado as InstanceType<typeof ApiError>;
      expect(apiError.name).toBe("ApiError");
      expect(apiError.status).toBeUndefined();
      expect(apiError.message).toBe(
        "El servidor respondió, pero los datos recibidos no son JSON válido.",
      );
    });
  });

  describe("Variable NEXT_PUBLIC_API_URL ausente", () => {
    it("debe lanzar ApiError sin llamar a fetch cuando NEXT_PUBLIC_API_URL no está configurada", async () => {
      const { obtenerProductos, ApiError } = await loadApi(undefined);

      let errorCapturado: unknown;
      try {
        await obtenerProductos();
      } catch (err) {
        errorCapturado = err;
      }

      expect(errorCapturado).toBeInstanceOf(ApiError);
      const apiError = errorCapturado as InstanceType<typeof ApiError>;
      expect(apiError.name).toBe("ApiError");
      expect(apiError.status).toBeUndefined();
      expect(apiError.message).toBe("No se ha configurado la URL de la API.");
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
