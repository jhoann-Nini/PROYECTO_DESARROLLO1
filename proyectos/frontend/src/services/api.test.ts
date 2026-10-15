import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGetSession = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  }),
}));

describe("api.ts - Cliente API del frontend", () => {
  const DEFAULT_API_URL = "http://localhost:8080";
  let originalEnv: string | undefined;
  const fetchMock = vi.fn();

  beforeEach(() => {
    originalEnv = process.env.NEXT_PUBLIC_API_URL;
    fetchMock.mockReset();
    mockGetSession.mockReset();
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
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

  describe("Aprovisionamiento JIT de Usuario (obtenerMiPerfil)", () => {
    it("debe enviar el token explícito en la cabecera Authorization: Bearer", async () => {
      const { obtenerMiPerfil } = await loadApi(DEFAULT_API_URL);
      const perfilMock = {
        idUsuario: 10,
        nombre: "Usuario Test",
        correo: "test@tecreview.com",
        rol: "Usuario registrado",
        activo: true,
        fechaRegistro: "2026-10-14T22:00:00",
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => perfilMock,
      } as unknown as Response);

      const respuesta = await obtenerMiPerfil("mi-access-token-es256");

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("http://localhost:8080/api/usuarios/me");
      const headers = new Headers(init.headers);
      expect(headers.get("Authorization")).toBe("Bearer mi-access-token-es256");
      expect(respuesta).toEqual(perfilMock);
    });

    it("debe resolver el token desde la sesión activa de Supabase cuando se llama sin argumentos", async () => {
      const { obtenerMiPerfil } = await loadApi(DEFAULT_API_URL);
      const perfilMock = {
        idUsuario: 12,
        nombre: "Usuario Sesion",
        correo: "sesion@tecreview.com",
        rol: "Usuario registrado",
        activo: true,
        fechaRegistro: "2026-10-14T22:00:00",
      };

      mockGetSession.mockResolvedValueOnce({
        data: {
          session: {
            access_token: "token-desde-supabase-session",
          },
        },
        error: null,
      });

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => perfilMock,
      } as unknown as Response);

      const respuesta = await obtenerMiPerfil();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("http://localhost:8080/api/usuarios/me");
      const headers = new Headers(init.headers);
      expect(headers.get("Authorization")).toBe("Bearer token-desde-supabase-session");
      expect(respuesta).toEqual(perfilMock);
    });

    it("debe lanzar ApiError con status 401 si se llama sin argumentos y no existe sesión activa", async () => {
      const { obtenerMiPerfil, ApiError } = await loadApi(DEFAULT_API_URL);
      mockGetSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      let errorCapturado: unknown;
      try {
        await obtenerMiPerfil();
      } catch (err) {
        errorCapturado = err;
      }

      expect(errorCapturado).toBeInstanceOf(ApiError);
      const apiError = errorCapturado as InstanceType<typeof ApiError>;
      expect(apiError.status).toBe(401);
      expect(apiError.message).toContain("No se encontró una sesión de autenticación activa");
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("debe deduplicar peticiones concurrentes en vuelo para el mismo token realizando una sola llamada fetch", async () => {
      const { obtenerMiPerfil } = await loadApi(DEFAULT_API_URL);
      const perfilMock = {
        idUsuario: 10,
        nombre: "Usuario Test",
        correo: "test@tecreview.com",
        rol: "Usuario registrado",
        activo: true,
        fechaRegistro: "2026-10-14T22:00:00",
      };

      let resolverFetch!: (val: unknown) => void;
      const promesaFetch = new Promise((resolve) => {
        resolverFetch = resolve;
      });

      fetchMock.mockReturnValueOnce(promesaFetch);

      const p1 = obtenerMiPerfil("token-concurrente");
      const p2 = obtenerMiPerfil("token-concurrente");

      // Ambas peticiones concurrentes deben disparar un único fetch
      expect(fetchMock).toHaveBeenCalledTimes(1);

      resolverFetch({
        ok: true,
        status: 200,
        json: async () => perfilMock,
      });

      const [res1, res2] = await Promise.all([p1, p2]);
      expect(res1).toEqual(perfilMock);
      expect(res2).toEqual(perfilMock);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Una vez concluida la promesa, la clave en memoria se elimina y una petición posterior hace fetch de nuevo
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => perfilMock,
      } as unknown as Response);

      await obtenerMiPerfil("token-concurrente");
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("debe capturar el mensaje de error específico del backend cuando responde 409 Conflict", async () => {
      const { obtenerMiPerfil, ApiError } = await loadApi(DEFAULT_API_URL);

      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          timestamp: "2026-10-14T22:00:00",
          status: 409,
          error: "Conflict",
          message: "Existe una cuenta previa registrada con el correo test@tecreview.com sin vinculación segura.",
        }),
      } as unknown as Response);

      let errorCapturado: unknown;
      try {
        await obtenerMiPerfil("token-conflicto");
      } catch (err) {
        errorCapturado = err;
      }

      expect(errorCapturado).toBeInstanceOf(ApiError);
      const apiError = errorCapturado as InstanceType<typeof ApiError>;
      expect(apiError.status).toBe(409);
      expect(apiError.message).toContain("Existe una cuenta previa registrada");
    });
  });

  describe("mapearPerfilABusinessSession", () => {
    it("debe construir UsuarioSesion priorizando los datos del backend sobre metadatos del cliente", async () => {
      const { mapearPerfilABusinessSession } = await loadApi(DEFAULT_API_URL);

      const perfilBackend = {
        idUsuario: 42,
        nombre: "Nombre Oficial Backend",
        correo: "oficial@tecreview.com",
        rol: "Usuario registrado",
        activo: true,
        fechaRegistro: "2026-10-14T20:00:00",
      };

      const userSupabase = {
        id: "uuid-supabase-1234",
        user_metadata: {
          role: "admin", // intento de elevación en metadatos cliente
          nombre: "Nombre Falso Cliente",
          user_name: "oficial_user",
        },
      };

      const sesion = mapearPerfilABusinessSession(perfilBackend, userSupabase);

      expect(sesion.id).toBe("uuid-supabase-1234");
      expect(sesion.nombre).toBe("Nombre Oficial Backend");
      expect(sesion.email).toBe("oficial@tecreview.com");
      expect(sesion.rol).toBe("Usuario registrado"); // Rol inmutable del backend
      expect(sesion.idUsuario).toBe(42);
      expect(sesion.activo).toBe(true);
      expect(sesion.usuario).toBe("oficial_user");
    });
  });
});
