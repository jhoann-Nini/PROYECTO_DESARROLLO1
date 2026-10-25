// @vitest-environment happy-dom
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

  describe("obtenerResenas", () => {
    it("debe consultar /api/resenas sin parámetros cuando no se pasa idProducto", async () => {
      const { obtenerResenas } = await loadApi(DEFAULT_API_URL);
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [
          {
            idResena: 1,
            idProducto: 10,
            nombreProducto: "Galaxy S25",
            idUsuario: 2,
            nombreUsuario: "Juan",
            comentario: "Excelente producto",
            fechaCreacion: "2026-10-15T10:00:00",
            estado: true,
          },
        ],
      } as unknown as Response);

      const resenas = await obtenerResenas();

      expect(fetchMock).toHaveBeenCalledWith("http://localhost:8080/api/resenas");
      expect(resenas).toHaveLength(1);
      expect(resenas[0].nombreProducto).toBe("Galaxy S25");
    });

    it("debe agregar query param ?idProducto=X cuando se proporciona idProducto", async () => {
      const { obtenerResenas } = await loadApi(DEFAULT_API_URL);
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [],
      } as unknown as Response);

      await obtenerResenas(15);

      expect(fetchMock).toHaveBeenCalledWith("http://localhost:8080/api/resenas?idProducto=15");
    });
  });

  describe("crearResena", () => {
    it("debe enviar POST /api/resenas con encabezado Authorization Bearer", async () => {
      const { crearResena } = await loadApi(DEFAULT_API_URL);
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: "token-usuario-valido" } },
        error: null,
      });

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          idResena: 5,
          idProducto: 12,
          nombreProducto: "Nothing Phone (2a)",
          idUsuario: 3,
          nombreUsuario: "TechFan",
          comentario: "Gran diseño transparente",
          fechaCreacion: "2026-10-16T12:00:00",
          estado: true,
        }),
      } as unknown as Response);

      const resena = await crearResena({
        idProducto: 12,
        comentario: "Gran diseño transparente",
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8080/api/resenas",
        expect.objectContaining({
          method: "POST",
          headers: expect.any(Headers),
          body: JSON.stringify({ idProducto: 12, comentario: "Gran diseño transparente" }),
        }),
      );

      const headersEnviados = fetchMock.mock.calls[0][1]?.headers as Headers;
      expect(headersEnviados.get("Authorization")).toBe("Bearer token-usuario-valido");
      expect(headersEnviados.get("Content-Type")).toBe("application/json");
      expect(resena.idResena).toBe(5);
    });

    it("debe rechazar la llamada si no hay sesión activa", async () => {
      const { crearResena, ApiError } = await loadApi(DEFAULT_API_URL);
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      await expect(
        crearResena({ idProducto: 10, comentario: "Intento anónimo" }),
      ).rejects.toThrow(ApiError);
    });
  });

  describe("Servicios CRUD de Productos (Fase 3.1)", () => {
    it("obtenerProductoPorId debe consultar GET /api/productos/{id}", async () => {
      const { obtenerProductoPorId } = await loadApi(DEFAULT_API_URL);
      const mockProducto = {
        idProducto: 15,
        nombre: "Phone Pro",
        descripcion: "Flagship",
        idCategoria: 1,
        idMarca: 2,
        imagen: "https://example.com/phone.png",
        precioReferencia: 899,
        estado: true,
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockProducto,
      } as unknown as Response);

      const res = await obtenerProductoPorId(15);
      expect(fetchMock).toHaveBeenCalledWith("http://localhost:8080/api/productos/15");
      expect(res.idProducto).toBe(15);
      expect(res.nombre).toBe("Phone Pro");
    });

    it("crearProducto debe enviar POST /api/productos con token Bearer", async () => {
      const { crearProducto } = await loadApi(DEFAULT_API_URL);
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: "token-admin-valido" } },
        error: null,
      });

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ idProducto: 20, nombre: "Nuevo Phone", estado: true }),
      } as unknown as Response);

      const requestData = {
        nombre: "Nuevo Phone",
        descripcion: "Gama alta",
        idCategoria: 1,
        idMarca: 2,
        imagen: null,
        precioReferencia: 999,
      };

      const res = await crearProducto(requestData);

      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8080/api/productos",
        expect.objectContaining({
          method: "POST",
          headers: expect.any(Headers),
          body: JSON.stringify(requestData),
        }),
      );

      const headers = fetchMock.mock.calls[0][1]?.headers as Headers;
      expect(headers.get("Authorization")).toBe("Bearer token-admin-valido");
      expect(res.idProducto).toBe(20);
    });

    it("actualizarProducto debe enviar PUT /api/productos/{id} con token Bearer", async () => {
      const { actualizarProducto } = await loadApi(DEFAULT_API_URL);
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: "token-admin-valido" } },
        error: null,
      });

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ idProducto: 20, nombre: "Phone Editado", estado: true }),
      } as unknown as Response);

      const requestData = {
        nombre: "Phone Editado",
        descripcion: "Gama alta v2",
        idCategoria: 1,
        idMarca: 2,
        imagen: null,
        precioReferencia: 1099,
      };

      const res = await actualizarProducto(20, requestData);

      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8080/api/productos/20",
        expect.objectContaining({
          method: "PUT",
          headers: expect.any(Headers),
          body: JSON.stringify(requestData),
        }),
      );
      expect(res.nombre).toBe("Phone Editado");
    });

    it("crearProducto y actualizarProducto deben serializar el campo caracteristicas cuando se proporciona (Fase 4.3)", async () => {
      const { crearProducto, actualizarProducto } = await loadApi(DEFAULT_API_URL);
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: "token-admin-valido" } },
        error: null,
      });

      const specsMock = {
        pantalla: "6.7'' LTPO OLED 120Hz",
        procesador: "Snapdragon 8 Gen 3",
        bateria: "5000 mAh · Carga 45W",
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ idProducto: 25, nombre: "Pro Phone", caracteristicas: specsMock }),
      } as unknown as Response);

      const reqCrear = {
        nombre: "Pro Phone",
        idCategoria: 1,
        idMarca: 2,
        caracteristicas: specsMock,
      };

      const resCrear = await crearProducto(reqCrear);
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8080/api/productos",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(reqCrear),
        }),
      );
      expect(resCrear.caracteristicas).toEqual(specsMock);

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ idProducto: 25, nombre: "Pro Phone v2", caracteristicas: specsMock }),
      } as unknown as Response);

      const reqActualizar = {
        nombre: "Pro Phone v2",
        idCategoria: 1,
        idMarca: 2,
        caracteristicas: specsMock,
      };

      const resActualizar = await actualizarProducto(25, reqActualizar);
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8080/api/productos/25",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify(reqActualizar),
        }),
      );
      expect(resActualizar.caracteristicas).toEqual(specsMock);
    });

    it("eliminarProducto debe enviar DELETE /api/productos/{id} y manejar HTTP 204 No Content", async () => {
      const { eliminarProducto } = await loadApi(DEFAULT_API_URL);
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: "token-admin-valido" } },
        error: null,
      });

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 204,
      } as unknown as Response);

      await expect(eliminarProducto(20)).resolves.toBeUndefined();

      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8080/api/productos/20",
        expect.objectContaining({
          method: "DELETE",
          headers: expect.any(Headers),
        }),
      );
    });

    it("maneja error 403 Forbidden cuando el backend rechaza la operación administrativa", async () => {
      const { crearProducto } = await loadApi(DEFAULT_API_URL);
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: "token-usuario-no-admin" } },
        error: null,
      });

      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ message: "Acceso denegado: se requiere rol Administrador." }),
      } as unknown as Response);

      await expect(
        crearProducto({ nombre: "Intento no autorizado", idCategoria: 1, idMarca: 1 }),
      ).rejects.toMatchObject({
        name: "ApiError",
        status: 403,
        message: "Acceso denegado: se requiere rol Administrador.",
      });
    });
  });

  describe("Servicios CRUD de Categorías y Marcas (Fase 3.1)", () => {
    it("obtenerCategorias debe consultar GET /api/categorias y validar formato de arreglo", async () => {
      const { obtenerCategorias } = await loadApi(DEFAULT_API_URL);
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [
          { idCategoria: 1, nombre: "Móviles", descripcion: "Teléfonos", estado: true },
        ],
      } as unknown as Response);

      const cats = await obtenerCategorias();
      expect(fetchMock).toHaveBeenCalledWith("http://localhost:8080/api/categorias");
      expect(cats).toHaveLength(1);
      expect(cats[0].nombre).toBe("Móviles");
    });

    it("crearCategoria debe enviar POST /api/categorias con token", async () => {
      const { crearCategoria } = await loadApi(DEFAULT_API_URL);
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: "token-admin" } },
        error: null,
      });

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ idCategoria: 5, nombre: "Smartwatches", estado: true }),
      } as unknown as Response);

      const cat = await crearCategoria({ nombre: "Smartwatches", descripcion: "Relojes inteligentes" });
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8080/api/categorias",
        expect.objectContaining({ method: "POST" }),
      );
      expect(cat.idCategoria).toBe(5);
    });

    it("eliminarCategoria debe enviar DELETE /api/categorias/{id}", async () => {
      const { eliminarCategoria } = await loadApi(DEFAULT_API_URL);
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: "token-admin" } },
        error: null,
      });

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 204,
      } as unknown as Response);

      await expect(eliminarCategoria(5)).resolves.toBeUndefined();
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8080/api/categorias/5",
        expect.objectContaining({ method: "DELETE" }),
      );
    });

    it("obtenerMarcas debe consultar GET /api/marcas", async () => {
      const { obtenerMarcas } = await loadApi(DEFAULT_API_URL);
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [
          { idMarca: 1, nombre: "Nothing", descripcion: "Industrial", estado: true },
        ],
      } as unknown as Response);

      const marcas = await obtenerMarcas();
      expect(fetchMock).toHaveBeenCalledWith("http://localhost:8080/api/marcas");
      expect(marcas).toHaveLength(1);
      expect(marcas[0].nombre).toBe("Nothing");
    });

    it("crearMarca debe enviar POST /api/marcas con token", async () => {
      const { crearMarca } = await loadApi(DEFAULT_API_URL);
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: "token-admin" } },
        error: null,
      });

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ idMarca: 8, nombre: "Google", estado: true }),
      } as unknown as Response);

      const marca = await crearMarca({ nombre: "Google", descripcion: "Pixel" });
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8080/api/marcas",
        expect.objectContaining({ method: "POST" }),
      );
      expect(marca.idMarca).toBe(8);
    });

    it("eliminarMarca debe enviar DELETE /api/marcas/{id}", async () => {
      const { eliminarMarca } = await loadApi(DEFAULT_API_URL);
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: "token-admin" } },
        error: null,
      });

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 204,
      } as unknown as Response);

      await expect(eliminarMarca(8)).resolves.toBeUndefined();
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8080/api/marcas/8",
        expect.objectContaining({ method: "DELETE" }),
      );
    });
  });

  describe("Servicios de Rankings (Fase 4.4 / 4.5)", () => {
    it("obtenerMejorValorados debe invocar GET /api/rankings/mejor-valorados sin parámetros por defecto", async () => {
      const { obtenerMejorValorados } = await loadApi(DEFAULT_API_URL);
      const rankingEsperado = [
        {
          idProducto: 1,
          nombre: "Sony WH-1000XM5",
          promedioPuntuacion: 4.85,
          cantidadValoraciones: 12,
          posicionRanking: 1,
        },
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => rankingEsperado,
      } as unknown as Response);

      const resultado = await obtenerMejorValorados();
      expect(fetchMock).toHaveBeenCalledWith("http://localhost:8080/api/rankings/mejor-valorados");
      expect(resultado).toEqual(rankingEsperado);
    });

    it("obtenerMejorValorados debe concatenar ?limit=5 cuando se especifica un límite válido", async () => {
      const { obtenerMejorValorados } = await loadApi(DEFAULT_API_URL);
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [],
      } as unknown as Response);

      await obtenerMejorValorados(5);
      expect(fetchMock).toHaveBeenCalledWith("http://localhost:8080/api/rankings/mejor-valorados?limit=5");
    });

    it("debe rechazar límites menores a 1, mayores a 100 o decimales con ApiError", async () => {
      const { obtenerMejorValorados, ApiError } = await loadApi(DEFAULT_API_URL);

      await expect(obtenerMejorValorados(0)).rejects.toThrow(ApiError);
      await expect(obtenerMejorValorados(-5)).rejects.toThrow(ApiError);
      await expect(obtenerMejorValorados(101)).rejects.toThrow(ApiError);
      await expect(obtenerMejorValorados(3.5)).rejects.toThrow(ApiError);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("obtenerMasDeseados debe invocar GET /api/rankings/mas-deseados y retornar lista vacía", async () => {
      const { obtenerMasDeseados } = await loadApi(DEFAULT_API_URL);
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [],
      } as unknown as Response);

      const resultado = await obtenerMasDeseados();
      expect(fetchMock).toHaveBeenCalledWith("http://localhost:8080/api/rankings/mas-deseados");
      expect(resultado).toEqual([]);
    });

    it("obtenerOfertas debe invocar GET /api/rankings/ofertas y retornar ofertas con descuentos calculados", async () => {
      const { obtenerOfertas } = await loadApi(DEFAULT_API_URL);
      const ofertasEsperadas = [
        {
          idProducto: 10,
          nombre: "Laptop Gaming 144Hz",
          precioReferencia: 400,
          precioActual: 300,
          ahorroMonetario: 100,
          porcentajeDescuento: 25,
          idEstablecimiento: 2,
          nombreEstablecimiento: "Amazon",
          posicionRanking: 1,
        },
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ofertasEsperadas,
      } as unknown as Response);

      const resultado = await obtenerOfertas();
      expect(fetchMock).toHaveBeenCalledWith("http://localhost:8080/api/rankings/ofertas");
      expect(resultado).toEqual(ofertasEsperadas);
    });

    it("obtenerMasComentados debe invocar GET /api/rankings/mas-comentados y retornar la interacción real", async () => {
      const { obtenerMasComentados } = await loadApi(DEFAULT_API_URL);
      const comentadosEsperados = [
        {
          idProducto: 4,
          nombre: "MacBook Pro M3",
          cantidadResenas: 18,
          posicionRanking: 1,
        },
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => comentadosEsperados,
      } as unknown as Response);

      const resultado = await obtenerMasComentados(10);
      expect(fetchMock).toHaveBeenCalledWith("http://localhost:8080/api/rankings/mas-comentados?limit=10");
      expect(resultado).toEqual(comentadosEsperados);
    });
  });

  describe("Servicios de Valoraciones (Fase 4.6)", () => {
    it("crearValoracion debe enviar POST /api/valoraciones con token Bearer", async () => {
      const { crearValoracion } = await loadApi(DEFAULT_API_URL);
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: "token-usuario-validador" } },
        error: null,
      });

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          idValoracion: 8,
          idProducto: 1,
          nombreProducto: "Samsung Galaxy S24 Ultra",
          idUsuario: 3,
          nombreUsuario: "Comprador",
          puntuacion: 5,
          fechaCreacion: "2026-10-20T10:00:00",
          estado: true,
        }),
      } as unknown as Response);

      const resultado = await crearValoracion({ idProducto: 1, puntuacion: 5 });
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8080/api/valoraciones",
        expect.objectContaining({
          method: "POST",
          headers: expect.any(Headers),
          body: JSON.stringify({ idProducto: 1, puntuacion: 5 }),
        }),
      );

      const headers = fetchMock.mock.calls[0][1]?.headers as Headers;
      expect(headers.get("Authorization")).toBe("Bearer token-usuario-validador");
      expect(headers.get("Content-Type")).toBe("application/json");
      expect(resultado.puntuacion).toBe(5);
    });

    it("crearValoracion debe rechazar puntuaciones fuera del rango 1 a 5 antes de invocar la red", async () => {
      const { crearValoracion, ApiError } = await loadApi(DEFAULT_API_URL);
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: "token-usuario-validador" } },
        error: null,
      });

      await expect(crearValoracion({ idProducto: 1, puntuacion: 0 })).rejects.toThrow(ApiError);
      await expect(crearValoracion({ idProducto: 1, puntuacion: 6 })).rejects.toThrow(ApiError);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("crearValoracion debe rechazar si no hay sesión activa", async () => {
      const { crearValoracion, ApiError } = await loadApi(DEFAULT_API_URL);
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      await expect(crearValoracion({ idProducto: 1, puntuacion: 4 })).rejects.toThrow(ApiError);
    });

    it("obtenerMiValoracion debe consultar GET /api/valoraciones/mi-valoracion y retornar la valoración", async () => {
      const { obtenerMiValoracion } = await loadApi(DEFAULT_API_URL);
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: "token-activo" } },
        error: null,
      });

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          idValoracion: 12,
          idProducto: 5,
          nombreProducto: "Apple iPad Pro",
          idUsuario: 3,
          nombreUsuario: "Tester",
          puntuacion: 4,
          fechaCreacion: "2026-10-20T11:00:00",
          estado: true,
        }),
      } as unknown as Response);

      const res = await obtenerMiValoracion(5);
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8080/api/valoraciones/mi-valoracion?idProducto=5",
        expect.objectContaining({ method: "GET" }),
      );
      expect(res?.puntuacion).toBe(4);
    });

    it("obtenerMiValoracion debe retornar null si no hay sesión o si responde 204 No Content", async () => {
      const { obtenerMiValoracion } = await loadApi(DEFAULT_API_URL);
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const resSinSesion = await obtenerMiValoracion(5);
      expect(resSinSesion).toBeNull();

      mockGetSession.mockResolvedValue({
        data: { session: { access_token: "token-activo" } },
        error: null,
      });
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 204,
      } as unknown as Response);

      const resNoContent = await obtenerMiValoracion(5);
      expect(resNoContent).toBeNull();
    });
  });

  describe("descargarCatalogoCsv - Exportación CSV", () => {
    it("debe fallar si no hay sesión activa de Supabase", async () => {
      const { descargarCatalogoCsv, ApiError } = await loadApi(DEFAULT_API_URL);
      mockGetSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      await expect(descargarCatalogoCsv()).rejects.toThrow(ApiError);
      await expect(descargarCatalogoCsv()).rejects.toThrow(
        "No se encontró una sesión de autenticación activa",
      );
    });

    it("debe enviar Authorization Bearer y descargar el Blob con nombre de Content-Disposition", async () => {
      const { descargarCatalogoCsv } = await loadApi(DEFAULT_API_URL);
      mockGetSession.mockResolvedValueOnce({
        data: { session: { access_token: "token-admin-123" } },
        error: null,
      });

      const fakeBlob = new Blob(["id_producto,nombre\n1,Samsung"], { type: "text/csv" });
      const headers = new Headers();
      headers.set("Content-Disposition", 'attachment; filename="catalogo_productos_20261021.csv"');
      headers.set("Content-Type", "text/csv; charset=UTF-8");

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers,
        blob: async () => fakeBlob,
      } as unknown as Response);

      const resultado = await descargarCatalogoCsv();

      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8080/api/productos/exportar-csv",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            Authorization: "Bearer token-admin-123",
          }),
        }),
      );

      expect(resultado.nombreArchivo).toBe("catalogo_productos_20261021.csv");
      expect(resultado.blob).toBe(fakeBlob);
    });

    it("debe usar nombre por defecto si no hay cabecera Content-Disposition", async () => {
      const { descargarCatalogoCsv } = await loadApi(DEFAULT_API_URL);
      mockGetSession.mockResolvedValueOnce({
        data: { session: { access_token: "token-admin-123" } },
        error: null,
      });

      const fakeBlob = new Blob(["id_producto,nombre\n1,Samsung"], { type: "text/csv" });
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        blob: async () => fakeBlob,
      } as unknown as Response);

      const resultado = await descargarCatalogoCsv();
      expect(resultado.nombreArchivo).toBe("catalogo_productos.csv");
    });

    it("debe rechazar con mensaje adecuado si el servidor responde 403 Forbidden", async () => {
      const { descargarCatalogoCsv } = await loadApi(DEFAULT_API_URL);
      mockGetSession.mockResolvedValueOnce({
        data: { session: { access_token: "token-no-admin" } },
        error: null,
      });

      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ message: "Acceso denegado" }),
      } as unknown as Response);

      await expect(descargarCatalogoCsv()).rejects.toThrow(
        "No tienes permisos de administrador para exportar el catálogo",
      );
    });

    it("debe rechazar con mensaje adecuado si falla la red", async () => {
      const { descargarCatalogoCsv } = await loadApi(DEFAULT_API_URL);
      mockGetSession.mockResolvedValueOnce({
        data: { session: { access_token: "token-admin" } },
        error: null,
      });

      fetchMock.mockRejectedValueOnce(new Error("Network connection error"));

      await expect(descargarCatalogoCsv()).rejects.toThrow(
        "No fue posible conectarse con el servidor para exportar el catálogo",
      );
    });
  });

  describe("dispararDescargaArchivo", () => {
    it("crea un enlace temporal y simula el click para descargar el archivo", async () => {
      const { dispararDescargaArchivo } = await loadApi(DEFAULT_API_URL);
      const fakeBlob = new Blob(["test"], { type: "text/csv" });

      const createObjectURLMock = vi.fn().mockReturnValue("blob:http://localhost/test-uuid");
      const revokeObjectURLMock = vi.fn();
      vi.stubGlobal("URL", {
        createObjectURL: createObjectURLMock,
        revokeObjectURL: revokeObjectURLMock,
      });

      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
      const appendChildSpy = vi.spyOn(document.body, "appendChild");
      const removeChildSpy = vi.spyOn(document.body, "removeChild");

      dispararDescargaArchivo(fakeBlob, "test.csv");

      expect(createObjectURLMock).toHaveBeenCalledWith(fakeBlob);
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
      expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:http://localhost/test-uuid");
    });
  });

  describe("obtenerProductosPorCategoria", () => {
    it("debe consultar /api/productos?idCategoria=<id> con el identificador real", async () => {
      const { obtenerProductosPorCategoria } = await loadApi(DEFAULT_API_URL);
      const productos = [{ idProducto: 1, nombre: "Equipo" }];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => productos,
      } as unknown as Response);

      const resultado = await obtenerProductosPorCategoria(17);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8080/api/productos?idCategoria=17",
      );
      expect(resultado).toEqual(productos);
    });

    it("debe rechazar identificadores inválidos sin llamar a la API", async () => {
      const { obtenerProductosPorCategoria, ApiError } = await loadApi(DEFAULT_API_URL);

      await expect(obtenerProductosPorCategoria(0)).rejects.toBeInstanceOf(ApiError);
      await expect(obtenerProductosPorCategoria(-4)).rejects.toBeInstanceOf(ApiError);
      await expect(obtenerProductosPorCategoria(1.5)).rejects.toBeInstanceOf(ApiError);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("debe lanzar ApiError cuando la respuesta no es una lista", async () => {
      const { obtenerProductosPorCategoria, ApiError } = await loadApi(DEFAULT_API_URL);

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ productos: [] }),
      } as unknown as Response);

      await expect(obtenerProductosPorCategoria(3)).rejects.toBeInstanceOf(ApiError);
    });
  });
});

