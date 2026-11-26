// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type {
  CategoriaResponse,
  MarcaResponse,
  Producto,
  UsuarioSesion,
} from "@/types/producto";

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    obtenerProductoPorId: vi.fn(),
    obtenerProductos: vi.fn(),
    obtenerCategorias: vi.fn(),
    obtenerMarcas: vi.fn(),
    obtenerValoracionStats: vi.fn(),
    obtenerResenas: vi.fn(),
    obtenerTiendasProducto: vi.fn(),
    crearReporteOferta: vi.fn(),
    obtenerMiValoracion: vi.fn(),
    crearResena: vi.fn(),
    obtenerPublicacionesProducto: vi.fn(),
  };
});

const mockSesion: {
  usuario: UsuarioSesion | null;
  cargando: boolean;
  error: string | null;
  establecerUsuario: ReturnType<typeof vi.fn>;
  limpiarError: ReturnType<typeof vi.fn>;
  cerrarSesion: ReturnType<typeof vi.fn>;
  reintentar: ReturnType<typeof vi.fn>;
} = {
  usuario: null,
  cargando: false,
  error: null,
  establecerUsuario: vi.fn(),
  limpiarError: vi.fn(),
  cerrarSesion: vi.fn(),
  reintentar: vi.fn(),
};

vi.mock("@/hooks/useSesionTecReview", () => ({
  useSesionTecReview: () => mockSesion,
}));

import {
  ApiError,
  crearResena,
  obtenerCategorias,
  obtenerMarcas,
  obtenerMiValoracion,
  obtenerProductoPorId,
  obtenerProductos,
  obtenerResenas,
  obtenerValoracionStats,
  obtenerTiendasProducto,
  crearReporteOferta,
  obtenerPublicacionesProducto,
} from "@/services/api";
import { CLAVE_COMPARADOR } from "@/data/comparador";
import DetalleProductoCliente from "./DetalleProductoCliente";

const mockProducto = vi.mocked(obtenerProductoPorId);
const mockCategorias = vi.mocked(obtenerCategorias);
const mockMarcas = vi.mocked(obtenerMarcas);
const mockStats = vi.mocked(obtenerValoracionStats);
const mockResenas = vi.mocked(obtenerResenas);
const mockCrearResena = vi.mocked(crearResena);
const mockMiValoracion = vi.mocked(obtenerMiValoracion);
const mockTiendas = vi.mocked(obtenerTiendasProducto);
const mockReporteOferta = vi.mocked(crearReporteOferta);

const CATEGORIAS: CategoriaResponse[] = [
  { idCategoria: 1, nombre: "Móviles", descripcion: null, estado: true },
];

const MARCAS: MarcaResponse[] = [
  { idMarca: 1, nombre: "Samsung", descripcion: null, estado: true },
];

const PRODUCTO: Producto = {
  idProducto: 204,
  nombre: "Samsung Galaxy S25 Ultra",
  descripcion: "Smartphone insignia con cámara de alta resolución.",
  idCategoria: 1,
  idMarca: 1,
  imagen: null,
  precioReferencia: 5_499_000,
  estado: true,
  caracteristicas: {
    pantalla: "6.9'' AMOLED 120Hz",
    procesador: "Snapdragon 8 Elite",
    ram: "12 GB",
  },
};

const PRODUCTO_CON_TIENDAS = {
  ...PRODUCTO,
  caracteristicas: null,
  ranking: 3,
  marca: "Samsung",
  precio: 5_499_000,
  detalleSpecs: {
    tiendas: [
      {
        nombre: "Tienda Central",
        precio: 5_250_000,
        envioGratis: true,
        url: "https://tienda.example.com/s25-ultra",
      },
      {
        nombre: "Tienda Local",
        precio: 5_100_000,
        envioGratis: false,
      },
    ],
  },
} as unknown as Producto;

const RESENA = {
  idResena: 12,
  idProducto: 204,
  nombreProducto: "Samsung Galaxy S25 Ultra",
  idUsuario: 8,
  nombreUsuario: "laura",
  comentario: "La cámara nocturna es excelente y la batería dura todo el día.",
  fechaCreacion: "2026-10-20T10:00:00",
  estado: true,
};

const USUARIO: UsuarioSesion = {
  id: "supabase-8",
  idUsuario: 8,
  nombre: "Laura Gómez",
  usuario: "laura",
  email: "laura@example.com",
  rol: "Usuario registrado",
  activo: true,
  fechaRegistro: "2026-01-01T00:00:00",
};

beforeEach(() => {
  localStorage.clear();
  mockSesion.usuario = null;
  mockSesion.cargando = false;
  mockSesion.error = null;

  mockCategorias.mockResolvedValue(CATEGORIAS);
  mockMarcas.mockResolvedValue(MARCAS);
  mockProducto.mockResolvedValue(PRODUCTO);
  vi.mocked(obtenerProductos).mockResolvedValue([PRODUCTO]);
  mockStats.mockResolvedValue({
    idProducto: 204,
    promedioPuntuacion: 4.5,
    cantidadValoraciones: 12,
  });
  mockResenas.mockResolvedValue([RESENA]);
  mockMiValoracion.mockResolvedValue(null);
  mockTiendas.mockResolvedValue([]);
  vi.mocked(obtenerPublicacionesProducto).mockResolvedValue({ items: [], nextCursor: null, total: 3 });
  mockReporteOferta.mockResolvedValue({
    idReporte: 80, idProducto: 204, idEstablecimiento: 17,
    motivo: "precio_incorrecto", descripcion: null, estado: "PENDIENTE", fechaCreacion: "2026-11-20T10:00:00",
  });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
});

describe("DetalleProductoCliente", () => {
  it("enlaza la comunidad del producto con su número de publicaciones", async () => {
    render(<DetalleProductoCliente idProducto={204} />);

    const enlace = await screen.findByRole("link", { name: "Comunidad (3)" });
    expect(enlace.getAttribute("href")).toBe("/productos/204/comunidad");
    expect(vi.mocked(obtenerPublicacionesProducto)).toHaveBeenCalledWith(204, { limite: 1 });
  });

  it("si el conteo de la comunidad falla, el enlace sigue disponible sin número", async () => {
    vi.mocked(obtenerPublicacionesProducto).mockRejectedValue(new ApiError("Sin conexión", 500));
    render(<DetalleProductoCliente idProducto={204} />);

    const enlace = await screen.findByRole("link", { name: "Comunidad" });
    expect(enlace.getAttribute("href")).toBe("/productos/204/comunidad");
  });

  it("muestra un botón por oferta real, sin asignar IDs a las tiendas de datos heredados", async () => {
    mockProducto.mockResolvedValue(PRODUCTO_CON_TIENDAS);
    mockTiendas.mockResolvedValue([
      { idEstablecimiento: 17, nombre: "Tienda Norte", precio: 5_200_000, disponibilidad: true, direccion: null, telefono: null, correo: null, latitud: null, longitud: null },
      { idEstablecimiento: 32, nombre: "Tienda Sur", precio: 5_100_000, disponibilidad: true, direccion: null, telefono: null, correo: null, latitud: null, longitud: null },
    ]);
    mockSesion.usuario = USUARIO;
    render(<DetalleProductoCliente idProducto={204} />);

    const botones = await screen.findAllByRole("button", { name: /Reportar precio o enlace/ });
    expect(botones).toHaveLength(2);
    botones[1].focus();
    fireEvent.click(botones[1]);
    expect(screen.getByRole("dialog", { name: "Reportar precio o enlace" }).textContent).toMatch(/Samsung Galaxy S25 Ultra en Tienda Sur/);
    fireEvent.change(screen.getByRole("combobox", { name: "Motivo" }), { target: { value: "precio_incorrecto" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar reporte" }));
    await waitFor(() => expect(mockReporteOferta).toHaveBeenCalledWith({
      idProducto: 204, idEstablecimiento: 32, motivo: "precio_incorrecto",
    }));
    expect(await screen.findByText("Gracias. Recibimos tu reporte y lo revisaremos.")).toBeDefined();
    expect(screen.queryByRole("dialog", { name: "Reportar precio o enlace" })).toBeNull();
    expect(document.activeElement).toBe(botones[1]);
  });

  it("no inventa IDs para tiendas heredadas ni las muestra como ofertas reales si falla la consulta", async () => {
    mockProducto.mockResolvedValue(PRODUCTO_CON_TIENDAS);
    mockTiendas.mockRejectedValueOnce(new ApiError("No pudimos consultar las tiendas.", 500));
    render(<DetalleProductoCliente idProducto={204} />);
    expect(await screen.findByText("No pudimos consultar las tiendas.")).toBeDefined();
    expect(screen.queryByRole("button", { name: /Reportar precio o enlace/ })).toBeNull();
  });

  it("ofrece el AuthModal si no hay sesión al enviar el reporte", async () => {
    mockTiendas.mockResolvedValue([
      { idEstablecimiento: 17, nombre: "Tienda Norte", precio: 5_200_000, disponibilidad: true, direccion: null, telefono: null, correo: null, latitud: null, longitud: null },
    ]);
    mockReporteOferta.mockRejectedValueOnce(new ApiError("Sin sesión", 401));
    render(<DetalleProductoCliente idProducto={204} />);
    fireEvent.click(await screen.findByRole("button", { name: /Reportar precio o enlace/ }));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "enlace_incorrecto" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar reporte" }));
    fireEvent.click(await screen.findByRole("button", { name: "Iniciar sesión" }));
    expect(screen.getByRole("dialog", { name: /Acceso a TecReview/i })).toBeDefined();
  });
  it("muestra el estado de carga", () => {
    mockProducto.mockReturnValue(new Promise<Producto>(() => {}));

    render(<DetalleProductoCliente idProducto={204} />);

    expect(screen.getByText("Cargando detalle del producto…")).toBeDefined();
  });

  it("muestra un 404 accesible si el producto no existe", async () => {
    mockProducto.mockRejectedValue(
      new ApiError("Producto no encontrado", 404),
    );

    render(<DetalleProductoCliente idProducto={999} />);

    await waitFor(() => {
      expect(screen.getByText("Producto no encontrado")).toBeDefined();
    });

    const volver = screen.getByRole("link", { name: "Volver al catálogo" });
    expect(volver.getAttribute("href")).toBe("/productos");
  });

  it("muestra un error con reintento si la API falla", async () => {
    mockProducto
      .mockRejectedValueOnce(new Error("Fallo de red al consultar el producto"))
      .mockResolvedValueOnce(PRODUCTO);

    render(<DetalleProductoCliente idProducto={204} />);

    await waitFor(() => {
      expect(screen.getByText("No pudimos cargar el producto")).toBeDefined();
    });
    expect(screen.getByText("Fallo de red al consultar el producto")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Samsung Galaxy S25 Ultra" }),
      ).toBeDefined();
    });
    expect(mockProducto).toHaveBeenCalledTimes(2);
  });

  it("renderiza nombre, marca, categoría, precio de referencia y disponibilidad según las ofertas", async () => {
    render(<DetalleProductoCliente idProducto={204} />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Samsung Galaxy S25 Ultra" }),
      ).toBeDefined();
    });

    // Fase 3 (H-04): un producto activo sin ofertas no se presenta como «Disponible».
    expect(await screen.findByText("Sin tiendas con disponibilidad registrada")).toBeDefined();
    expect(screen.queryByText("Disponible")).toBeNull();
    expect(screen.getByText("Precio de referencia")).toBeDefined();
    expect(screen.getByText(/5\.499\.000/)).toBeDefined();
    expect(screen.getByText("Smartphone insignia con cámara de alta resolución.")).toBeDefined();

    const migas = screen.getByRole("navigation", { name: "Migas de pan" });
    expect(migas.textContent).toContain("Samsung Galaxy S25 Ultra");
    expect(migas.textContent).toContain("Productos");
  });

  it("muestra la fotografía del producto con texto alternativo informativo", async () => {
    mockProducto.mockResolvedValue({
      ...PRODUCTO,
      imagen: "https://cdn.example.com/s25-ultra.jpg",
    });

    render(<DetalleProductoCliente idProducto={204} />);

    const imagen = await screen.findByRole("img", {
      name: "Fotografía de Samsung Galaxy S25 Ultra",
    });

    expect(imagen.getAttribute("src")).toBe(
      "https://cdn.example.com/s25-ultra.jpg",
    );
  });

  it("sustituye la imagen rota por el marcador accesible", async () => {
    mockProducto.mockResolvedValue({
      ...PRODUCTO,
      imagen: "https://cdn.example.com/rota.jpg",
    });

    render(<DetalleProductoCliente idProducto={204} />);

    const imagen = await screen.findByRole("img", {
      name: "Fotografía de Samsung Galaxy S25 Ultra",
    });
    fireEvent.error(imagen);

    expect(
      await screen.findByRole("img", {
        name: "Imagen pendiente de Samsung (Móviles & Smartphones)",
      }),
    ).toBeDefined();
    expect(
      screen.queryByRole("img", {
        name: "Fotografía de Samsung Galaxy S25 Ultra",
      }),
    ).toBeNull();
  });

  it("muestra las especificaciones normalizadas", async () => {
    render(<DetalleProductoCliente idProducto={204} />);

    await waitFor(() => {
      expect(screen.getByText("6.9'' AMOLED 120Hz")).toBeDefined();
    });

    expect(screen.getByText("Snapdragon 8 Elite")).toBeDefined();
    expect(screen.getByText("12 GB")).toBeDefined();
    expect(
      screen.getByRole("heading", { name: "Especificaciones" }),
    ).toBeDefined();
  });

  it("calcula la disponibilidad con las ofertas del backend", async () => {
    mockTiendas.mockResolvedValue([
      { idEstablecimiento: 17, nombre: "Tienda Norte", precio: 5_200_000, disponibilidad: true, direccion: null, telefono: null, correo: null, latitud: null, longitud: null },
      { idEstablecimiento: 32, nombre: "Tienda Sur", precio: 5_100_000, disponibilidad: true, direccion: null, telefono: null, correo: null, latitud: null, longitud: null },
    ]);
    render(<DetalleProductoCliente idProducto={204} />);

    expect(await screen.findByText("Disponible en 2 tiendas")).toBeDefined();
  });

  it("no usa las tiendas del JSON heredado de la ficha como ofertas", async () => {
    mockProducto.mockResolvedValue(PRODUCTO_CON_TIENDAS);
    render(<DetalleProductoCliente idProducto={204} />);

    expect(await screen.findByText("Aún no hay tiendas con precios publicados para este producto.")).toBeDefined();
    expect(screen.queryByText("Tienda Central")).toBeNull();
  });

  it("presenta los enlaces a tiendas con contexto accesible y apertura externa", async () => {
    mockTiendas.mockResolvedValue([
      {
        idEstablecimiento: 17, nombre: "Tienda Central", precio: 5_250_000, disponibilidad: true,
        direccion: null, telefono: null, correo: null, latitud: null, longitud: null,
        verificado: true, urlOferta: "https://tienda.example.com/s25-ultra",
        fechaActualizacionPrecio: "2026-11-18T09:30:00",
      },
      {
        idEstablecimiento: 32, nombre: "Tienda Local", precio: 5_100_000, disponibilidad: true,
        direccion: null, telefono: null, correo: null, latitud: null, longitud: null,
        verificado: false, urlOferta: null, fechaActualizacionPrecio: null,
      },
    ]);

    render(<DetalleProductoCliente idProducto={204} />);

    const enlace = await screen.findByRole("link", {
      name: "Ver tienda: Tienda Central (abre en una pestaña nueva)",
    });

    expect(enlace.getAttribute("href")).toBe(
      "https://tienda.example.com/s25-ultra",
    );
    expect(enlace.getAttribute("target")).toBe("_blank");
    expect(enlace.getAttribute("rel")).toBe("noopener noreferrer");
    expect(
      screen.getByText("Los enlaces abren la tienda en una pestaña nueva."),
    ).toBeDefined();
    expect(screen.getByText("Precio en Tienda Central:")).toBeDefined();
    expect(screen.queryByRole("link", { name: /Tienda Local/ })).toBeNull();
    // Fase 3 (H-03): el sello solo aparece si establecimiento.verificado es true.
    expect(screen.getByLabelText("Tienda Central verificada por TecReview")).toBeDefined();
    expect(screen.queryByLabelText("Tienda Local verificada por TecReview")).toBeNull();
    expect(screen.getByText(/Precio actualizado el 18\b.*2026/)).toBeDefined();
  });

  it("muestra un vacío limpio cuando no hay especificaciones registradas", async () => {
    mockProducto.mockResolvedValue({
      ...PRODUCTO,
      caracteristicas: null,
    });

    render(<DetalleProductoCliente idProducto={204} />);

    await waitFor(() => {
      expect(
        screen.getByText(
          "Aún no hay especificaciones registradas para este producto.",
        ),
      ).toBeDefined();
    });

    expect(screen.queryByText("6.9'' AMOLED 120Hz")).toBeNull();
  });

  it("muestra el promedio real de valoraciones y las reseñas del producto", async () => {
    render(<DetalleProductoCliente idProducto={204} />);

    await waitFor(() => {
      expect(screen.getByText(RESENA.comentario)).toBeDefined();
    });

    expect(screen.getAllByText(/12 opiniones/).length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("img", { name: /Valoración 4,5 de 5/i }).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("@laura")).toBeDefined();
    expect(
      screen.getByRole("tab", { name: "Opiniones (1)" }),
    ).toBeDefined();
  });

  it("abre AuthModal al intentar opinar sin sesión", async () => {
    render(<DetalleProductoCliente idProducto={204} />);

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Opiniones (1)" })).toBeDefined();
    });

    fireEvent.click(screen.getByRole("tab", { name: "Opiniones (1)" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Publicar opinión" }),
    );

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeDefined();
    });
    expect(
      screen.getByText(
        "Debes iniciar sesión para publicar una opinión.",
      ),
    ).toBeDefined();
  });

  it("publica una opinión autenticada con puntuación y actualiza la lista", async () => {
    mockSesion.usuario = USUARIO;
    mockCrearResena.mockResolvedValue({
      ...RESENA,
      idResena: 13,
      nombreUsuario: "laura",
      comentario: "El mejor equipo que he probado este año.",
      puntuacion: 5,
    });

    render(<DetalleProductoCliente idProducto={204} />);

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Opiniones (1)" })).toBeDefined();
    });

    fireEvent.click(screen.getByRole("tab", { name: "Opiniones (1)" }));
    fireEvent.change(screen.getByLabelText(/Escribe tu opinión sobre/i), {
      target: { value: "El mejor equipo que he probado este año." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Calificar con 5 estrellas" }));
    fireEvent.click(screen.getByRole("button", { name: "Publicar opinión" }));

    await waitFor(() => {
      expect(
        screen.getByText("El mejor equipo que he probado este año."),
      ).toBeDefined();
    });
    expect(mockCrearResena).toHaveBeenCalledWith({
      idProducto: 204,
      comentario: "El mejor equipo que he probado este año.",
      puntuacion: 5,
    });
    expect(
      screen.getByRole("tab", { name: "Opiniones (2)" }),
    ).toBeDefined();
  });

  it("muestra estadísticas públicas de valoración comunitaria sin formulario independiente", async () => {
    render(<DetalleProductoCliente idProducto={204} />);

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Opiniones (1)" })).toBeDefined();
    });

    fireEvent.click(screen.getByRole("tab", { name: "Opiniones (1)" }));

    await waitFor(() => {
      expect(screen.getByText("Valoración de la comunidad")).toBeDefined();
      expect(screen.getAllByText("4,5").length).toBeGreaterThan(0);
      expect(screen.getAllByText(/12 opiniones/).length).toBeGreaterThan(0);
    });

    expect(screen.queryByRole("button", { name: "Guardar valoración" })).toBeNull();
  });

  it("muestra el botón para compartir el producto", async () => {
    render(<DetalleProductoCliente idProducto={204} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Compartir producto" }),
      ).toBeDefined();
    });
  });

  it("agrega el producto al comparador y permite quitarlo", async () => {
    render(<DetalleProductoCliente idProducto={204} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Agregar al comparador" }),
      ).toBeDefined();
    });

    const agregar = screen.getByRole("button", {
      name: "Agregar al comparador",
    });
    await waitFor(() => {
      expect((agregar as HTMLButtonElement).disabled).toBe(false);
    });

    fireEvent.click(agregar);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Quitar del comparador" }),
      ).toBeDefined();
    });
    expect(JSON.parse(localStorage.getItem(CLAVE_COMPARADOR) ?? "[]")).toEqual([
      204,
    ]);

    fireEvent.click(
      screen.getByRole("button", { name: "Quitar del comparador" }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Agregar al comparador" }),
      ).toBeDefined();
    });
    expect(JSON.parse(localStorage.getItem(CLAVE_COMPARADOR) ?? "[]")).toEqual(
      [],
    );
  });
});
