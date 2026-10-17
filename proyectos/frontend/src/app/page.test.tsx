// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import Home from "./page";
import { ApiError } from "@/services/api";
import type { Producto } from "@/types/producto";

const mockOnAuthStateChange = vi.fn();
const mockGetSession = vi.fn();
const mockSignOut = vi.fn().mockResolvedValue({ error: null });

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      onAuthStateChange: mockOnAuthStateChange,
      getSession: mockGetSession,
      signOut: mockSignOut,
    },
  }),
}));

const mockObtenerProductos = vi.fn();
const mockObtenerMiPerfil = vi.fn();
const mockObtenerResenas = vi.fn();
const mockCrearResena = vi.fn();

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    obtenerProductos: (...args: unknown[]) => mockObtenerProductos(...args),
    obtenerMiPerfil: (...args: unknown[]) => mockObtenerMiPerfil(...args),
    obtenerResenas: (...args: unknown[]) => mockObtenerResenas(...args),
    crearResena: (...args: unknown[]) => mockCrearResena(...args),
  };
});

describe("Página principal / (Home)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockObtenerResenas.mockResolvedValue([]);
    mockOnAuthStateChange.mockReturnValue({
      data: {
        subscription: { unsubscribe: vi.fn() },
      },
    });
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
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

  describe("8. Sincronización JIT de Sesión", () => {
    it("debe consultar obtenerMiPerfil y mostrar el nombre y rol del perfil de negocio en la barra superior", async () => {
      mockObtenerProductos.mockResolvedValueOnce([]);

      mockGetSession.mockResolvedValueOnce({
        data: {
          session: {
            access_token: "test.jwt.token",
            user: {
              id: "usr-uuid-1",
              email: "juan@tecreview.com",
            },
          },
        },
        error: null,
      });

      mockObtenerMiPerfil.mockResolvedValueOnce({
        idUsuario: 55,
        nombre: "Juan Pérez Backend",
        correo: "juan@tecreview.com",
        rol: "Usuario registrado",
        activo: true,
        fechaRegistro: "2026-10-14T20:00:00",
      });

      render(<Home />);

      await waitFor(() => {
        expect(mockObtenerMiPerfil).toHaveBeenCalledWith("test.jwt.token");
      });

      await waitFor(() => {
        expect(screen.getByText("Juan Pérez Backend")).toBeDefined();
        expect(screen.getByText("• Usuario registrado")).toBeDefined();
      });
    });

    it("debe evitar llamadas duplicadas a obtenerMiPerfil cuando coincidan onAuthStateChange y getSession para el mismo token", async () => {
      mockObtenerProductos.mockResolvedValueOnce([]);

      const mockSession = {
        access_token: "token.coincidente.123",
        user: {
          id: "usr-uuid-2",
          email: "mismo@tecreview.com",
        },
      };

      // Simular que onAuthStateChange emite inmediatamente la sesión
      mockOnAuthStateChange.mockImplementation((callback: (event: string, session: typeof mockSession) => void) => {
        callback("INITIAL_SESSION", mockSession);
        return {
          data: { subscription: { unsubscribe: vi.fn() } },
        };
      });

      // Y que getSession retorna la misma sesión en paralelo
      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      mockObtenerMiPerfil.mockResolvedValue({
        idUsuario: 56,
        nombre: "Usuario Sin Duplicados",
        correo: "mismo@tecreview.com",
        rol: "Usuario registrado",
        activo: true,
        fechaRegistro: "2026-10-14T20:00:00",
      });

      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText("Usuario Sin Duplicados")).toBeDefined();
      });

      // Debe haberse invocado exactamente 1 vez a obtenerMiPerfil a pesar de ambos disparos
      expect(mockObtenerMiPerfil).toHaveBeenCalledTimes(1);
    });

    it("si obtenerMiPerfil falla con 409 Conflict, no muestra sesión de negocio válida, revoca sesión local en Supabase y expone el mensaje de error", async () => {
      mockObtenerProductos.mockResolvedValueOnce([]);

      mockGetSession.mockResolvedValueOnce({
        data: {
          session: {
            access_token: "token.conflicto.409",
            user: {
              id: "usr-uuid-conflict",
              email: "historico@tecreview.com",
            },
          },
        },
        error: null,
      });

      mockObtenerMiPerfil.mockRejectedValueOnce(
        new ApiError("Existe una cuenta previa registrada con el correo historico@tecreview.com sin vinculación segura.", 409)
      );

      render(<Home />);

      await waitFor(() => {
        expect(mockObtenerMiPerfil).toHaveBeenCalledWith("token.conflicto.409");
      });

      await waitFor(() => {
        expect(screen.getByText(/sin vinculación segura/i)).toBeDefined();
      });

      // No debe mostrar un perfil activo, debe mantener el botón de iniciar sesión
      expect(screen.queryByText("Cerrar sesión")).toBeNull();
      expect(screen.getByRole("button", { name: /Iniciar sesión/i })).toBeDefined();

      // Debe haber revocado la sesión local en Supabase (H-02)
      expect(mockSignOut).toHaveBeenCalledWith({ scope: "local" });
    });

    it("ante un error transitorio de red durante la actualización del token, preserva el perfil previamente validado y permite reintentar", async () => {
      mockObtenerProductos.mockResolvedValueOnce([]);

      let authListenerCallback: ((event: string, session: unknown) => void) | undefined;
      mockOnAuthStateChange.mockImplementation((callback: (event: string, session: unknown) => void) => {
        authListenerCallback = callback;
        return {
          data: { subscription: { unsubscribe: vi.fn() } },
        };
      });

      const initialSession = {
        access_token: "token.inicial.valido",
        user: { id: "usr-transient-1", email: "transient@tecreview.com" },
      };

      mockGetSession.mockResolvedValue({
        data: { session: initialSession },
        error: null,
      });

      mockObtenerMiPerfil.mockResolvedValueOnce({
        idUsuario: 88,
        nombre: "Usuario Resiliente",
        correo: "transient@tecreview.com",
        rol: "Usuario registrado",
        activo: true,
        fechaRegistro: "2026-10-14T20:00:00",
      });

      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText("Usuario Resiliente")).toBeDefined();
      });

      // Ahora simulamos un evento TOKEN_REFRESHED con fallo transitorio de red (sin status HTTP)
      const refreshedSession = {
        access_token: "token.refrescado.nuevo",
        user: { id: "usr-transient-1", email: "transient@tecreview.com" },
      };

      mockObtenerMiPerfil.mockRejectedValueOnce(
        new ApiError("No fue posible conectarse con el servidor. Verifica que el backend esté activo.")
      );

      // Disparamos la actualización de token
      authListenerCallback?.("TOKEN_REFRESHED", refreshedSession);

      // Esperamos que aparezca la alerta con el botón de Reintentar
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Reintentar/i })).toBeDefined();
      });

      // El perfil validado previamente DEBE seguir presente (H-04)
      expect(screen.getByText("Usuario Resiliente")).toBeDefined();
      expect(screen.queryByRole("button", { name: /Iniciar sesión/i })).toBeNull();

      // Al pulsar "Reintentar", debe intentar sincronizar de nuevo
      mockObtenerMiPerfil.mockResolvedValueOnce({
        idUsuario: 88,
        nombre: "Usuario Resiliente",
        correo: "transient@tecreview.com",
        rol: "Usuario registrado",
        activo: true,
        fechaRegistro: "2026-10-14T20:00:00",
      });

      mockGetSession.mockResolvedValueOnce({
        data: { session: refreshedSession },
        error: null,
      });

      fireEvent.click(screen.getByRole("button", { name: /Reintentar/i }));

      await waitFor(() => {
        expect(screen.queryByRole("button", { name: /Reintentar/i })).toBeNull();
      });

      expect(screen.getByText("Usuario Resiliente")).toBeDefined();
    });

    it("el botón 'Cerrar sesión' revoca la sesión en Supabase y limpia el estado del usuario", async () => {
      mockObtenerProductos.mockResolvedValueOnce([]);

      mockGetSession.mockResolvedValueOnce({
        data: {
          session: {
            access_token: "token.para.cerrar",
            user: { id: "usr-logout-1", email: "logout@tecreview.com" },
          },
        },
        error: null,
      });

      mockObtenerMiPerfil.mockResolvedValueOnce({
        idUsuario: 99,
        nombre: "Usuario Cierre Sesion",
        correo: "logout@tecreview.com",
        rol: "Usuario registrado",
        activo: true,
        fechaRegistro: "2026-10-14T20:00:00",
      });

      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText("Usuario Cierre Sesion")).toBeDefined();
      });

      const btnCerrar = screen.getByRole("button", { name: /Cerrar sesión/i });
      fireEvent.click(btnCerrar);

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled();
        expect(screen.queryByText("Usuario Cierre Sesion")).toBeNull();
        expect(screen.getByRole("button", { name: /Iniciar sesión/i })).toBeDefined();
      });
    });
  });

  describe("9. Opiniones de la comunidad persistidas", () => {
    it("debe cargar y renderizar las reseñas devueltas por el backend al iniciar la página", async () => {
      mockObtenerProductos.mockResolvedValueOnce([]);
      mockObtenerResenas.mockResolvedValueOnce([
        {
          idResena: 101,
          idProducto: 1,
          nombreProducto: "Galaxy S25 Ultra",
          idUsuario: 5,
          nombreUsuario: "TechEnthusiast",
          comentario: "Excelente cámara y procesador para juegos.",
          fechaCreacion: "2026-10-16T14:30:00",
          estado: true,
        },
      ]);

      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText("Excelente cámara y procesador para juegos.")).toBeDefined();
        expect(screen.getByText("@TechEnthusiast")).toBeDefined();
        expect(screen.getByText("Galaxy S25 Ultra")).toBeDefined();
      });
    });

    it("un usuario anónimo que intenta enviar un comentario recibe el aviso y se abre el modal de login", async () => {
      mockObtenerProductos.mockResolvedValueOnce([]);
      mockObtenerResenas.mockResolvedValueOnce([]);

      render(<Home />);

      const inputComentario = screen.getByLabelText(/Escribe tu opinión/i);
      fireEvent.change(inputComentario, { target: { value: "Intento anónimo de opinar" } });

      const btnPublicar = screen.getByRole("button", { name: /Publicar opinión/i });
      fireEvent.click(btnPublicar);

      await waitFor(() => {
        expect(
          screen.getByText(/Debes iniciar sesión para publicar una opinión/i),
        ).toBeDefined();
      });

      // Debe abrirse el AuthModal
      expect(screen.getByRole("dialog")).toBeDefined();
      expect(screen.getByText(/ACCESO A/i)).toBeDefined();
      expect(mockCrearResena).not.toHaveBeenCalled();
    });

    it("un usuario autenticado publica la reseña y la lista se actualiza", async () => {
      mockObtenerProductos.mockResolvedValueOnce([
        {
          idProducto: 45,
          nombre: "Nothing Phone (2a)",
          descripcion: "Gama media transparente",
          precioReferencia: 350,
          idCategoria: 1,
          idMarca: 2,
          nombreCategoria: "Celulares",
          nombreMarca: "Nothing",
          imagen: null,
          estado: true,
        },
      ]);

      mockGetSession.mockResolvedValue({
        data: {
          session: {
            access_token: "token.valido.opiniones",
            user: { id: "user-op-1", email: "opina@tecreview.com" },
          },
        },
        error: null,
      });

      mockObtenerMiPerfil.mockResolvedValue({
        idUsuario: 77,
        nombre: "Reviewer Pro",
        correo: "opina@tecreview.com",
        rol: "Usuario registrado",
        activo: true,
        fechaRegistro: "2026-10-15T12:00:00",
      });

      mockObtenerResenas.mockResolvedValueOnce([]);

      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText("Reviewer Pro")).toBeDefined();
      });

      mockCrearResena.mockResolvedValueOnce({
        idResena: 202,
        idProducto: 45,
        nombreProducto: "Nothing Phone (2a)",
        idUsuario: 77,
        nombreUsuario: "Reviewer Pro",
        comentario: "Excelente diseño minimalista y batería.",
        fechaCreacion: "2026-10-17T15:00:00",
        estado: true,
      });

      mockObtenerResenas.mockResolvedValueOnce([
        {
          idResena: 202,
          idProducto: 45,
          nombreProducto: "Nothing Phone (2a)",
          idUsuario: 77,
          nombreUsuario: "Reviewer Pro",
          comentario: "Excelente diseño minimalista y batería.",
          fechaCreacion: "2026-10-17T15:00:00",
          estado: true,
        },
      ]);

      const inputComentario = screen.getByLabelText(/Escribe tu opinión/i);
      fireEvent.change(inputComentario, { target: { value: "Excelente diseño minimalista y batería." } });

      const btnPublicar = screen.getByRole("button", { name: /Publicar opinión/i });
      fireEvent.click(btnPublicar);

      await waitFor(() => {
        expect(mockCrearResena).toHaveBeenCalledWith({
          idProducto: 45,
          comentario: "Excelente diseño minimalista y batería.",
        });
      });

      await waitFor(() => {
        expect(screen.getByText("Excelente diseño minimalista y batería.")).toBeDefined();
      });
    });

    it("el filtro de opiniones permite buscar dinámicamente por palabra clave", async () => {
      mockObtenerProductos.mockResolvedValueOnce([]);
      mockObtenerResenas.mockResolvedValueOnce([
        {
          idResena: 1,
          idProducto: 1,
          nombreProducto: "Galaxy S25",
          idUsuario: 1,
          nombreUsuario: "Andres",
          comentario: "La pantalla AMOLED es brillante.",
          fechaCreacion: "2026-10-16T10:00:00",
          estado: true,
        },
        {
          idResena: 2,
          idProducto: 2,
          nombreProducto: "MacBook Air",
          idUsuario: 2,
          nombreUsuario: "Sofia",
          comentario: "Batería dura dos días enteros.",
          fechaCreacion: "2026-10-16T11:00:00",
          estado: true,
        },
      ]);

      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText("La pantalla AMOLED es brillante.")).toBeDefined();
        expect(screen.getByText("Batería dura dos días enteros.")).toBeDefined();
      });

      const inputFiltro = screen.getByLabelText(/Filtrar opiniones de la comunidad/i);
      fireEvent.change(inputFiltro, { target: { value: "MacBook" } });

      expect(screen.getByText("Batería dura dos días enteros.")).toBeDefined();
      expect(screen.queryByText("La pantalla AMOLED es brillante.")).toBeNull();
    });
  });
});

