// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import Home from "./page";
import { ApiError } from "@/services/api";
import type {
  Producto,
  ProductoMejorValorado,
  ProductoMasComentado,
  ProductoOferta,
} from "@/types/producto";

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
const mockObtenerCategorias = vi.fn().mockResolvedValue([]);
const mockObtenerMarcas = vi.fn().mockResolvedValue([]);
const mockObtenerMejorValorados = vi.fn().mockResolvedValue([]);
const mockObtenerMasDeseados = vi.fn().mockResolvedValue([]);
const mockObtenerOfertas = vi.fn().mockResolvedValue([]);
const mockObtenerMasComentados = vi.fn().mockResolvedValue([]);

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    obtenerProductos: (...args: unknown[]) => mockObtenerProductos(...args),
    obtenerMiPerfil: (...args: unknown[]) => mockObtenerMiPerfil(...args),
    obtenerResenas: (...args: unknown[]) => mockObtenerResenas(...args),
    crearResena: (...args: unknown[]) => mockCrearResena(...args),
    obtenerCategorias: (...args: unknown[]) => mockObtenerCategorias(...args),
    obtenerMarcas: (...args: unknown[]) => mockObtenerMarcas(...args),
    obtenerMejorValorados: (...args: unknown[]) => mockObtenerMejorValorados(...args),
    obtenerMasDeseados: (...args: unknown[]) => mockObtenerMasDeseados(...args),
    obtenerOfertas: (...args: unknown[]) => mockObtenerOfertas(...args),
    obtenerMasComentados: (...args: unknown[]) => mockObtenerMasComentados(...args),
  };
});

describe("Página principal / (Home)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockObtenerResenas.mockResolvedValue([]);
    mockObtenerCategorias.mockResolvedValue([]);
    mockObtenerMarcas.mockResolvedValue([]);
    mockObtenerMejorValorados.mockResolvedValue([]);
    mockObtenerMasDeseados.mockResolvedValue([]);
    mockObtenerOfertas.mockResolvedValue([]);
    mockObtenerMasComentados.mockResolvedValue([]);
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
          nombre: "Laptop Profesional 4K HDR",
          descripcion: "Portátil IPS de precisión para creadores",
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

      expect(screen.getByText("Laptop Profesional 4K HDR")).toBeDefined();
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

  describe("9. Control de acceso y navegación por roles (Hallazgo 2 - Fase 2)", () => {
    it("Visitante: consulta catálogo pero NO visualiza enlace de administración ni opciones de sesión", async () => {
      mockObtenerProductos.mockResolvedValueOnce([]);
      mockGetSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      render(<Home />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Iniciar sesión/i })).toBeDefined();
      });

      // El visitante no debe ver enlace de administración ni botón de cerrar sesión
      expect(screen.queryByRole("link", { name: /Administración/i })).toBeNull();
      expect(screen.queryByText(/Administración/i)).toBeNull();
      expect(screen.queryByRole("button", { name: /Cerrar sesión/i })).toBeNull();
    });

    it("Usuario registrado: ve su perfil y reseñas pero NO tiene acceso a opciones administrativas", async () => {
      mockObtenerProductos.mockResolvedValueOnce([]);
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            access_token: "token.registrado.jwt",
            user: { id: "usr-reg-1", email: "registrado@tecreview.com" },
          },
        },
        error: null,
      });

      mockObtenerMiPerfil.mockResolvedValue({
        idUsuario: 10,
        nombre: "Carlos Usuario",
        correo: "registrado@tecreview.com",
        rol: "Usuario registrado",
        activo: true,
        fechaRegistro: "2026-10-15T10:00:00",
      });

      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText("Carlos Usuario")).toBeDefined();
        expect(screen.getByText(/• Usuario registrado/i)).toBeDefined();
      });

      // Debe ver cerrar sesión pero NO el enlace de administración
      expect(screen.getByRole("button", { name: /Cerrar sesión/i })).toBeDefined();
      expect(screen.queryByRole("link", { name: /Administración/i })).toBeNull();
      expect(screen.queryByText(/Administración/i)).toBeNull();
    });

    it("Administrador: muestra enlace de administración confirmado por el backend e interactúa con el modal preparatorio", async () => {
      mockObtenerProductos.mockResolvedValueOnce([]);
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            access_token: "token.admin.jwt",
            user: { id: "usr-admin-1", email: "admin@tecreview.com" },
          },
        },
        error: null,
      });

      mockObtenerMiPerfil.mockResolvedValue({
        idUsuario: 99,
        nombre: "Super Admin",
        correo: "admin@tecreview.com",
        rol: "Administrador",
        activo: true,
        fechaRegistro: "2026-10-10T10:00:00",
      });

      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText("Super Admin")).toBeDefined();
        expect(screen.getByText(/• Administrador/i)).toBeDefined();
      });

      // El administrador SÍ debe ver el enlace de administración
      const enlaceAdmin = screen.getByRole("link", { name: /Administración/i });
      expect(enlaceAdmin).toBeDefined();

      // Al hacer clic, se abre el modal preparatorio para Fase 3
      fireEvent.click(enlaceAdmin);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeDefined();
        expect(screen.getByText(/Panel de Administración/i)).toBeDefined();
        expect(screen.getByText(/Gestión de Catálogo de Productos/i)).toBeDefined();
      });

      // Cerrar el modal
      const btnCerrar = screen.getByRole("button", { name: /Cerrar panel de administración/i });
      fireEvent.click(btnCerrar);

      await waitFor(() => {
        expect(screen.queryByText(/Panel de Administración/i)).toBeNull();
      });
    });

    it("Representante de establecimiento: visualiza su distintivo de rol pero NO ve opciones administrativas", async () => {
      mockObtenerProductos.mockResolvedValueOnce([]);
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            access_token: "token.repre.jwt",
            user: { id: "usr-repre-1", email: "tienda@tecreview.com" },
          },
        },
        error: null,
      });

      mockObtenerMiPerfil.mockResolvedValue({
        idUsuario: 33,
        nombre: "Tienda Oficial",
        correo: "tienda@tecreview.com",
        rol: "Representante de establecimiento",
        activo: true,
        fechaRegistro: "2026-10-16T12:00:00",
      });

      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText("Tienda Oficial")).toBeDefined();
        expect(screen.getByText(/• Representante de establecimiento/i)).toBeDefined();
      });

      // El representante NO debe tener acceso ni ver la opción de administración
      expect(screen.queryByRole("link", { name: /Administración/i })).toBeNull();
      expect(screen.queryByText(/Administración/i)).toBeNull();
      expect(screen.getByRole("button", { name: /Cerrar sesión/i })).toBeDefined();
    });

    it("Estado de carga: muestra 'Verificando...' sin conceder opciones de privilegios mientras se consulta el perfil", () => {
      mockObtenerProductos.mockImplementation(() => new Promise(() => {}));
      mockGetSession.mockImplementation(() => new Promise(() => {}));

      render(<Home />);

      expect(screen.getByText("Verificando...")).toBeDefined();
      expect(screen.queryByRole("link", { name: /Administración/i })).toBeNull();
      expect(screen.queryByText(/Administración/i)).toBeNull();
    });
  });

  describe("10. Rankings reales en la página principal (Fase 4.5)", () => {
    it("solicita los 4 rankings al backend al iniciar la página principal con el parámetro limit=10", async () => {
      render(<Home />);

      await waitFor(() => {
        expect(mockObtenerMejorValorados).toHaveBeenCalledWith(10);
        expect(mockObtenerMasDeseados).toHaveBeenCalledWith(10);
        expect(mockObtenerOfertas).toHaveBeenCalledWith(10);
        expect(mockObtenerMasComentados).toHaveBeenCalledWith(10);
      });
    });

    it("representa los productos devueltos por el backend en 'Mejor valorados' con puntuaciones reales", async () => {
      const mejorValorados: ProductoMejorValorado[] = [
        {
          idProducto: 201,
          nombre: "Samsung Galaxy S24 Ultra",
          descripcion: "Smartphone de gama alta con IA integrada",
          precioReferencia: 3500000,
          idCategoria: 1,
          idMarca: 2,
          imagen: null,
          promedioPuntuacion: 4.8,
          cantidadValoraciones: 35,
          posicionRanking: 1,
          caracteristicas: { ram: "12 GB", almacenamiento: "512 GB" },
        },
      ];

      mockObtenerMejorValorados.mockResolvedValueOnce(mejorValorados);

      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText("Samsung Galaxy S24 Ultra")).toBeDefined();
      });

      expect(screen.getByText(/Mejor valorados/i)).toBeDefined();
      expect(screen.getByText(/35 valoraciones/i)).toBeDefined();
      expect(screen.getByText("4.8")).toBeDefined();
      expect(screen.queryByText("Los más vendidos")).toBeNull();
    });

    it("representa los productos devueltos por el backend en 'Más comentados' con el conteo real de reseñas", async () => {
      const masComentados: ProductoMasComentado[] = [
        {
          idProducto: 202,
          nombre: "Sony WH-1000XM5",
          descripcion: "Auriculares inalámbricos con cancelación activa de ruido",
          precioReferencia: 1500000,
          idCategoria: 4,
          idMarca: 4,
          imagen: null,
          cantidadResenas: 42,
          posicionRanking: 1,
          caracteristicas: { tipo: "Over-ear", conectividad: "Bluetooth 5.2" },
        },
      ];

      mockObtenerMasComentados.mockResolvedValueOnce(masComentados);

      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText("Sony WH-1000XM5")).toBeDefined();
      });

      expect(screen.getByText(/Más comentados/i)).toBeDefined();
      expect(screen.getByText(/42 reseñas/i)).toBeDefined();
    });

    it("representa 'Ofertas destacadas' con precio actual, precio de referencia y descuento real", async () => {
      const ofertas: ProductoOferta[] = [
        {
          idProducto: 203,
          nombre: "MacBook Air M3",
          descripcion: "Portátil ultraligero con chip Apple M3",
          precioReferencia: 3800000,
          idCategoria: 2,
          idMarca: 1,
          imagen: null,
          idEstablecimiento: 3,
          nombreEstablecimiento: "iShop Colombia",
          precioActual: 3230000,
          ahorroMonetario: 570000,
          porcentajeDescuento: 15.0,
          posicionRanking: 1,
          caracteristicas: { ram: "16 GB" },
        },
      ];

      mockObtenerOfertas.mockResolvedValueOnce(ofertas);

      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText("MacBook Air M3")).toBeDefined();
      });

      expect(screen.getByText(/iShop Colombia/i)).toBeDefined();
      expect(screen.getByText("-15%")).toBeDefined();
    });

    it("cuando 'Más deseados' devuelve lista vacía, muestra estado vacío informativo y NO genera productos ficticios", async () => {
      mockObtenerMasDeseados.mockResolvedValueOnce([]);

      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText("Sin listas de deseos registradas")).toBeDefined();
      });

      expect(
        screen.getByText(/La funcionalidad de listas de deseos y favoritos estará disponible/i)
      ).toBeDefined();

      // Verificar que NO se inventaron productos ficticios
      expect(screen.queryByText("iPhone 15 Pro Max")).toBeNull();
    });

    it("un error en 'Mejor valorados' muestra el estado de error y no activa rankings ficticios", async () => {
      mockObtenerMejorValorados.mockRejectedValueOnce(
        new ApiError("Error de conexión al servidor de rankings", 500)
      );

      render(<Home />);

      await waitFor(() => {
        expect(
          screen.getByText(/Error de conexión al servidor de rankings/i)
        ).toBeDefined();
      });

      const retryBtn = screen.getByRole("button", { name: "Reintentar valoraciones" });
      expect(retryBtn).toBeDefined();

      // No se muestran productos ficticios
      expect(screen.queryByText("Sony WH-1000XM4")).toBeNull();
    });

    it("un error en 'Ofertas destacadas' muestra el estado de error y permite reintentar sin recurrir a mocks", async () => {
      mockObtenerOfertas.mockRejectedValueOnce(
        new ApiError("Fallo de red en el servicio de ofertas", 500)
      );

      render(<Home />);

      await waitFor(() => {
        expect(
          screen.getByText(/Fallo de red en el servicio de ofertas/i)
        ).toBeDefined();
      });

      const retryBtn = screen.getByRole("button", { name: "Reintentar ofertas" });
      expect(retryBtn).toBeDefined();

      // Reintentar exitosamente con lista vacía
      mockObtenerOfertas.mockResolvedValueOnce([]);
      fireEvent.click(retryBtn);

      await waitFor(() => {
        expect(
          screen.queryByText(/Fallo de red en el servicio de ofertas/i)
        ).toBeNull();
      });
    });

    it("permite abrir el modal de ficha técnica desde un elemento de ranking", async () => {
      const mejorValorados: ProductoMejorValorado[] = [
        {
          idProducto: 204,
          nombre: "Laptop Gamer Asus ROG",
          descripcion: "Portátil para eSports 240Hz",
          precioReferencia: 2100000,
          idCategoria: 3,
          idMarca: 6,
          imagen: null,
          promedioPuntuacion: 4.9,
          cantidadValoraciones: 18,
          posicionRanking: 1,
          caracteristicas: { tasaRefresco: "240 Hz", resolucion: "2560x1440" },
        },
      ];

      mockObtenerMejorValorados.mockResolvedValueOnce(mejorValorados);

      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText("Laptop Gamer Asus ROG")).toBeDefined();
      });

      const btnFicha = screen.getByRole("button", {
        name: "Ver ficha de Laptop Gamer Asus ROG",
      });
      fireEvent.click(btnFicha);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeDefined();
        expect(screen.getByText("FICHA TÉCNICA")).toBeDefined();
        expect(
          screen.getByRole("heading", { level: 2, name: "Laptop Gamer Asus ROG" })
        ).toBeDefined();
      });
    });
  });

  describe("35. Navegación por categorías a páginas dedicadas", () => {
    it("los accesos de categoría deben enlazar a sus páginas propias sin perder el botón 'Todos'", async () => {
      mockObtenerProductos.mockResolvedValueOnce([]);

      render(<Home />);

      const enlacesEsperados: Array<[RegExp, string]> = [
        [/Teléfonos/i, "/categorias/celulares"],
        [/Tablets/i, "/categorias/tablets"],
        [/Portátiles \/ PC/i, "/categorias/portatiles"],
        [/Auriculares/i, "/categorias/auriculares"],
      ];

      for (const [nombre, href] of enlacesEsperados) {
        const enlace = screen.getByRole("link", { name: nombre });
        expect(enlace.getAttribute("href")).toBe(href);
      }

      expect(screen.queryByRole("link", { name: /Monitores/i })).toBeNull();
      expect(screen.getByRole("button", { name: /Todos/i })).toBeDefined();
    });
  });

  describe("34. Comportamiento del Catálogo General, Búsqueda y Presupuesto", () => {
    const catalogoProductosPrueba: Producto[] = [
      {
        idProducto: 23,
        nombre: "Samsung Galaxy Tab S10 Ultra",
        descripcion: "Tablet insignia con pantalla AMOLED de 14.6 pulgadas",
        precioReferencia: 5209900,
        idCategoria: 2,
        idMarca: 1,
        nombreCategoria: "Tablets",
        nombreMarca: "Samsung",
        imagen: "https://example.com/tab-s10-ultra.jpg",
        estado: true,
      },
      {
        idProducto: 24,
        nombre: "Samsung Galaxy Buds FE",
        descripcion: "Earbuds con cancelación activa de ruido",
        precioReferencia: 289900,
        idCategoria: 4,
        idMarca: 1,
        nombreCategoria: "Auriculares",
        nombreMarca: "Samsung",
        imagen: "https://example.com/buds-fe.jpg",
        estado: true,
      },
      {
        idProducto: 25,
        nombre: "Samsung Galaxy Tab S10+",
        descripcion: "Tablet premium de alto rendimiento con S-Pen",
        precioReferencia: 4999990,
        idCategoria: 2,
        idMarca: 1,
        nombreCategoria: "Tablets",
        nombreMarca: "Samsung",
        imagen: "https://example.com/tab-s10-plus.jpg",
        estado: true,
      },
    ];

    it("1. El catálogo general muestra todos los productos disponibles sin un presupuesto restrictivo", async () => {
      mockObtenerProductos.mockResolvedValueOnce(catalogoProductosPrueba);

      render(<Home />);

      fireEvent.click(screen.getByRole("button", { name: /Catálogo general/i }));

      await waitFor(() => {
        expect(screen.getByText("Samsung Galaxy Tab S10 Ultra")).toBeDefined();
        expect(screen.getByText("Samsung Galaxy Buds FE")).toBeDefined();
        expect(screen.getByText("Samsung Galaxy Tab S10+")).toBeDefined();
      });
    });

    it("2. Con un presupuesto de $4.000.000 COP, los productos más caros siguen siendo localizables en el catálogo general", async () => {
      mockObtenerProductos.mockResolvedValueOnce(catalogoProductosPrueba);

      render(<Home />);

      // Cambiar al catálogo general
      fireEvent.click(screen.getByRole("button", { name: /Catálogo general/i }));

      await waitFor(() => {
        expect(screen.getByText("Samsung Galaxy Tab S10 Ultra")).toBeDefined();
      });

      // El presupuesto por defecto es 1000 ($4.000.000 COP).
      // El producto más caro ($5.209.900) sigue visible y muestra su badge 'Supera presupuesto'
      expect(screen.getByText("Samsung Galaxy Tab S10 Ultra")).toBeDefined();
      expect(screen.getAllByText("Supera presupuesto").length).toBeGreaterThanOrEqual(1);

      // Y el producto económico ($289.900) muestra su badge '✓ En presupuesto'
      expect(screen.getByText("Samsung Galaxy Buds FE")).toBeDefined();
      expect(screen.getAllByText("✓ En presupuesto").length).toBeGreaterThanOrEqual(1);
    });

    it("3. La búsqueda de 'Samsung Galaxy Tab S10 Ultra' permite localizar ese producto aunque su precio supere el presupuesto", async () => {
      mockObtenerProductos.mockResolvedValueOnce(catalogoProductosPrueba);

      render(<Home />);

      fireEvent.click(screen.getByRole("button", { name: /Catálogo general/i }));

      await waitFor(() => {
        expect(screen.getByText("Samsung Galaxy Tab S10 Ultra")).toBeDefined();
      });

      // Escribir en el buscador
      const inputBusqueda = screen.getByRole("searchbox", {
        name: /Buscar dispositivos por marca/i,
      });
      fireEvent.change(inputBusqueda, {
        target: { value: "Samsung Galaxy Tab S10 Ultra" },
      });

      // Debe encontrarse y mostrarse
      expect(screen.getByText("Samsung Galaxy Tab S10 Ultra")).toBeDefined();
      expect(screen.queryByText("Samsung Galaxy Buds FE")).toBeNull();
    });

    it("4. La búsqueda de 'Samsung Galaxy Tab S10+' muestra una coincidencia si existe, o mensaje de búsqueda sin resultados si no existe", async () => {
      mockObtenerProductos.mockResolvedValueOnce(catalogoProductosPrueba);

      render(<Home />);

      fireEvent.click(screen.getByRole("button", { name: /Catálogo general/i }));

      await waitFor(() => {
        expect(screen.getByText("Samsung Galaxy Tab S10+")).toBeDefined();
      });

      const inputBusqueda = screen.getByRole("searchbox", {
        name: /Buscar dispositivos por marca/i,
      });

      // 4a. Coincidencia existente
      fireEvent.change(inputBusqueda, {
        target: { value: "Samsung Galaxy Tab S10+" },
      });
      expect(screen.getByText("Samsung Galaxy Tab S10+")).toBeDefined();

      // 4b. Modelo inexistente
      fireEvent.change(inputBusqueda, {
        target: { value: "Modelo Inexistente XYZ 999" },
      });
      expect(
        screen.getByText(/No se encontraron productos para “Modelo Inexistente XYZ 999”/i)
      ).toBeDefined();
      expect(screen.getByRole("button", { name: /Limpiar búsqueda/i })).toBeDefined();
    });

    it("5. El contador de productos totales y el contador de resultados filtrados no se confunden", async () => {
      mockObtenerProductos.mockResolvedValueOnce(catalogoProductosPrueba);

      render(<Home />);

      fireEvent.click(screen.getByRole("button", { name: /Catálogo general/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/3 productos verificados en la plataforma • 3 mostrados/i)
        ).toBeDefined();
      });

      // Filtrar por texto
      const inputBusqueda = screen.getByRole("searchbox", {
        name: /Buscar dispositivos por marca/i,
      });
      fireEvent.change(inputBusqueda, {
        target: { value: "Buds" },
      });

      // El total de productos verificados en la plataforma sigue siendo 3, pero mostrados es 1
      expect(
        screen.getByText(/3 productos verificados en la plataforma • 1 mostrado/i)
      ).toBeDefined();
    });

    it("6. Los filtros de búsqueda y presupuesto funcionan sin alterar los datos originales", async () => {
      mockObtenerProductos.mockResolvedValueOnce(catalogoProductosPrueba);

      render(<Home />);

      fireEvent.click(screen.getByRole("button", { name: /Catálogo general/i }));

      await waitFor(() => {
        expect(screen.getByText("Samsung Galaxy Tab S10 Ultra")).toBeDefined();
      });

      const inputBusqueda = screen.getByRole("searchbox", {
        name: /Buscar dispositivos por marca/i,
      });

      // Aplicar filtro de búsqueda
      fireEvent.change(inputBusqueda, { target: { value: "Ultra" } });
      expect(screen.getByText("Samsung Galaxy Tab S10 Ultra")).toBeDefined();
      expect(screen.queryByText("Samsung Galaxy Buds FE")).toBeNull();

      // Limpiar filtro de búsqueda
      fireEvent.change(inputBusqueda, { target: { value: "" } });

      // Todos los productos originales vuelven a estar visibles sin alteraciones
      expect(screen.getByText("Samsung Galaxy Tab S10 Ultra")).toBeDefined();
      expect(screen.getByText("Samsung Galaxy Buds FE")).toBeDefined();
      expect(screen.getByText("Samsung Galaxy Tab S10+")).toBeDefined();
    });
  });
});

