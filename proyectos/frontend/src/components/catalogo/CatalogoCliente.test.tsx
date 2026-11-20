// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type {
  CategoriaResponse,
  MarcaResponse,
  Producto,
} from "@/types/producto";

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    obtenerProductos: vi.fn(),
    obtenerCategorias: vi.fn(),
    obtenerMarcas: vi.fn(),
  };
});

const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
}));

import {
  ApiError,
  obtenerCategorias,
  obtenerMarcas,
  obtenerProductos,
} from "@/services/api";
import CatalogoCliente from "./CatalogoCliente";

const mockProductos = vi.mocked(obtenerProductos);
const mockCategorias = vi.mocked(obtenerCategorias);
const mockMarcas = vi.mocked(obtenerMarcas);

const categorias: CategoriaResponse[] = [
  { idCategoria: 1, nombre: "Móviles", descripcion: null, estado: true },
  { idCategoria: 2, nombre: "Laptops / PCs", descripcion: null, estado: true },
];

const marcas: MarcaResponse[] = [
  { idMarca: 1, nombre: "Samsung", descripcion: null, estado: true },
  { idMarca: 2, nombre: "Dell", descripcion: null, estado: true },
];

function crearProducto(
  idProducto: number,
  overrides: Partial<Producto> = {}
): Producto {
  return {
    idProducto,
    nombre: `Producto ${idProducto}`,
    descripcion: "Descripción de prueba",
    idCategoria: 1,
    idMarca: 1,
    imagen: null,
    precioReferencia: 1_000_000 + idProducto * 100_000,
    estado: true,
    ...overrides,
  };
}

function configurarExito(productos: Producto[]) {
  mockProductos.mockResolvedValue(productos);
  mockCategorias.mockResolvedValue(categorias);
  mockMarcas.mockResolvedValue(marcas);
}

const productosFiltros: Producto[] = [
  crearProducto(1, {
    nombre: "Samsung Galaxy A55",
    precioReferencia: 1_500_000,
    caracteristicas: {
      pantalla: "6.6'' AMOLED",
      procesador: "Exynos 1480",
      ram: "8 GB",
      almacenamiento: "128 GB",
      camaras: "50 MP",
      bateria: "5000 mAh",
      conectividad: "5G",
    },
  }),
  crearProducto(2, {
    nombre: "Samsung Galaxy S25",
    precioReferencia: 3_500_000,
    caracteristicas: {
      pantalla: "6.2'' AMOLED",
      procesador: "Snapdragon 8 Gen 3",
      ram: "12 GB",
      almacenamiento: "256 GB",
      camaras: "50 MP",
      bateria: "4000 mAh",
      conectividad: "5G",
    },
  }),
  crearProducto(3, {
    nombre: "Dell XPS 13",
    idCategoria: 2,
    idMarca: 2,
    precioReferencia: 4_500_000,
    caracteristicas: {
      pantalla: "13.4''",
      procesador: "Intel Core Ultra 7",
      ram: "16 GB",
      almacenamiento: "512 GB",
      bateria: "55 Wh",
    },
  }),
  crearProducto(4, {
    nombre: "Dell Inspiron 14",
    idCategoria: 2,
    idMarca: 2,
    precioReferencia: 2_500_000,
    caracteristicas: {
      pantalla: "14''",
      procesador: "Intel Core i5",
      ram: "8 GB",
      almacenamiento: "512 GB",
      bateria: "54 Wh",
    },
  }),
];

describe("CatalogoCliente", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  afterEach(() => {
    cleanup();
  });

  it("muestra el estado de carga", () => {
    mockProductos.mockImplementation(() => new Promise(() => {}));
    mockCategorias.mockImplementation(() => new Promise(() => {}));
    mockMarcas.mockImplementation(() => new Promise(() => {}));

    render(<CatalogoCliente />);

    expect(screen.getByText(/Cargando catálogo/i)).toBeDefined();
  });

  it("aplica el presupuesto de URL a todas las categorías, inclusive el límite exacto", async () => {
    configurarExito([
      crearProducto(1, { nombre: "Celular económico", precioReferencia: 600000 }),
      crearProducto(2, { nombre: "Tablet al límite", nombreCategoria: "Tablets", precioReferencia: 1000000 }),
      crearProducto(3, { nombre: "Auriculares", nombreCategoria: "Auriculares", precioReferencia: 400000 }),
      crearProducto(4, { nombre: "Portátil", idCategoria: 2, precioReferencia: 900000 }),
      crearProducto(5, { nombre: "Producto caro", precioReferencia: 1000001 }),
      crearProducto(6, { nombre: "Precio desconocido", precioReferencia: null }),
      crearProducto(7, { nombre: "Precio cero", precioReferencia: 0 }),
      crearProducto(8, { nombre: "Precio inválido", precioReferencia: -1 }),
    ]);
    mockSearchParams = new URLSearchParams("precioMax=1000000");
    render(<CatalogoCliente />);

    const resultados = await screen.findByRole("region", { name: "Resultados del catálogo" });
    expect(within(resultados).getAllByRole("heading", { level: 3 }).map((titulo) => titulo.textContent))
      .toEqual(["Celular económico", "Tablet al límite", "Auriculares", "Portátil"]);
    expect(screen.getByRole("button", { name: /Quitar filtro Hasta.*1\.000\.000.*COP/ })).toBeDefined();
    expect((screen.getByRole("checkbox", { name: /Móviles/ }) as HTMLInputElement).checked).toBe(false);
    expect((screen.getByRole("checkbox", { name: /Laptops \/ PCs/ }) as HTMLInputElement).checked).toBe(false);
  });

  it("permite quitar el presupuesto inicial y recuperar también productos sin precio", async () => {
    configurarExito([
      crearProducto(1, { precioReferencia: 400000 }),
      crearProducto(2, { precioReferencia: 1500000 }),
      crearProducto(3, { precioReferencia: null }),
    ]);
    mockSearchParams = new URLSearchParams("precioMax=500000");
    render(<CatalogoCliente />);
    fireEvent.click(await screen.findByRole("button", { name: /Quitar filtro Hasta/ }));
    expect(screen.getByText("Producto 2")).toBeDefined();
    expect(screen.getByText("Producto 3")).toBeDefined();
    expect(screen.queryByRole("button", { name: /Quitar filtro Hasta/ })).toBeNull();
  });

  it("no aumenta un presupuesto menor que el producto más barato", async () => {
    configurarExito([crearProducto(1, { precioReferencia: 500000 })]);
    mockSearchParams = new URLSearchParams("precioMax=100000");
    render(<CatalogoCliente />);
    expect(await screen.findByText("No encontramos productos con esos filtros")).toBeDefined();
    expect(screen.queryByText("Producto 1")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Borrar filtros" }));
    expect(screen.getByText("Producto 1")).toBeDefined();
  });

  it.each([200000, 1000000, 4000000])(
    "conserva un presupuesto de %s COP al enfocar y abandonar el máximo sin editar",
    async (presupuesto) => {
      configurarExito([
        crearProducto(1, { precioReferencia: 500000 }),
        crearProducto(2, { precioReferencia: 1000000 }),
        crearProducto(3, { precioReferencia: null }),
      ]);
      mockSearchParams = new URLSearchParams(`precioMax=${presupuesto}`);
      render(<CatalogoCliente />);
      const resultados = await screen.findByRole("region", { name: "Resultados del catálogo" });
      const maximo = screen.getByLabelText("Precio máximo en pesos") as HTMLInputElement;
      fireEvent.focus(maximo);
      fireEvent.blur(maximo);
      expect(within(resultados).queryAllByRole("heading", { level: 3 }).map((titulo) => titulo.textContent))
        .toEqual(presupuesto < 500000 ? [] : ["Producto 1", "Producto 2"]);
      expect(maximo.value).toBe(String(presupuesto));
      expect(screen.getByRole("button", { name: /Quitar filtro Hasta/ })).toBeDefined();
    },
  );

  it("habilita la limpieza lateral aunque el presupuesto supere los precios conocidos", async () => {
    configurarExito([
      crearProducto(1, { precioReferencia: 500000 }),
      crearProducto(2, { precioReferencia: null }),
    ]);
    mockSearchParams = new URLSearchParams("precioMax=4000000");
    render(<CatalogoCliente />);
    await screen.findByText("Producto 1");
    const limpiar = screen.getByRole("button", { name: "Limpiar filtros" }) as HTMLButtonElement;
    expect(limpiar.disabled).toBe(false);
    fireEvent.click(limpiar);
    expect(screen.getByText("Producto 2")).toBeDefined();
    expect(screen.queryByRole("button", { name: /Quitar filtro Hasta/ })).toBeNull();
  });

  it.each([
    "precioMax=inválido", "precioMax=-1", "precioMax=0",
    "precioMax=1000000&precioMax=2000000",
  ])("no aplica un presupuesto ambiguo o inválido: %s", async (parametro) => {
    configurarExito([crearProducto(1), crearProducto(2, { precioReferencia: null })]);
    mockSearchParams = new URLSearchParams(parametro);
    render(<CatalogoCliente />);
    expect(await screen.findByText("Producto 1")).toBeDefined();
    expect(screen.getByText("Producto 2")).toBeDefined();
    expect(screen.queryByRole("button", { name: /Quitar filtro Hasta/ })).toBeNull();
  });

  it("aplica un nuevo presupuesto de URL sin conservar búsqueda o categoría anteriores", async () => {
    configurarExito([
      crearProducto(1, { precioReferencia: 400000 }),
      crearProducto(2, { precioReferencia: 1500000, idCategoria: 2 }),
    ]);
    mockSearchParams = new URLSearchParams("precioMax=500000");
    const { rerender } = render(<CatalogoCliente />);
    await screen.findByText("Producto 1");
    fireEvent.click(screen.getByRole("checkbox", { name: /Móviles/ }));
    fireEvent.change(screen.getByRole("searchbox", { name: /Buscar dispositivos tecnológicos/ }), {
      target: { value: "inexistente" },
    });
    mockSearchParams = new URLSearchParams("precioMax=2000000");
    rerender(<CatalogoCliente />);
    expect(await screen.findByText("Producto 2")).toBeDefined();
    expect(screen.getByText("Producto 1")).toBeDefined();
    expect((screen.getByRole("checkbox", { name: /Móviles/ }) as HTMLInputElement).checked).toBe(false);
  });

  it("muestra los productos sin esperar a que terminen de cargar categorías y marcas", async () => {
    mockProductos.mockResolvedValue([crearProducto(1)]);
    let resolverCategorias!: (datos: CategoriaResponse[]) => void;
    let resolverMarcas!: (datos: MarcaResponse[]) => void;
    mockCategorias.mockReturnValue(
      new Promise((resolve) => {
        resolverCategorias = resolve;
      })
    );
    mockMarcas.mockReturnValue(
      new Promise((resolve) => {
        resolverMarcas = resolve;
      })
    );

    render(<CatalogoCliente />);

    expect(await screen.findByText("Producto 1")).toBeDefined();
    expect(screen.queryByText(/Cargando catálogo/i)).toBeNull();

    resolverCategorias(categorias);
    resolverMarcas(marcas);

    await waitFor(() => {
      expect(screen.getAllByText("Samsung").length).toBeGreaterThan(0);
    });
  });

  it("muestra un error accesible si la API falla", async () => {
    mockProductos.mockRejectedValue(
      new ApiError("No fue posible conectarse con el servidor.", 0)
    );
    mockCategorias.mockResolvedValue(categorias);
    mockMarcas.mockResolvedValue(marcas);

    render(<CatalogoCliente />);

    const alerta = await screen.findByRole("alert");
    expect(alerta.getAttribute("data-estado")).toBe("error");
    expect(alerta.textContent).toContain(
      "No fue posible conectarse con el servidor."
    );
    expect(
      screen.getByRole("button", { name: "Reintentar" })
    ).toBeDefined();
  });

  it("permite reintentar la carga del catálogo tras un error de red", async () => {
    mockProductos.mockRejectedValueOnce(
      new ApiError("No fue posible conectarse con el servidor.", 0)
    );
    mockCategorias.mockResolvedValue(categorias);
    mockMarcas.mockResolvedValue(marcas);

    render(<CatalogoCliente />);

    await screen.findByRole("alert");
    mockProductos.mockResolvedValue([crearProducto(1)]);
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    await waitFor(() => {
      expect(screen.getByText("Producto 1")).toBeDefined();
    });
  });

  it("muestra el total y las tarjetas con datos enriquecidos", async () => {
    configurarExito([crearProducto(1), crearProducto(2)]);

    render(<CatalogoCliente />);

    await waitFor(() => {
      expect(screen.getByText(/2 productos/)).toBeDefined();
    });

    expect(screen.getByText("Producto 1")).toBeDefined();
    expect(screen.getAllByText("Samsung").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Móviles/).length).toBeGreaterThan(0);
  });

  it("incluye productos sin precio y no muestra chip de precio al cargar", async () => {
    configurarExito([
      crearProducto(1),
      crearProducto(2, {
        nombre: "Producto sin precio",
        precioReferencia: null,
      }),
    ]);

    render(<CatalogoCliente />);

    await waitFor(() => {
      expect(screen.getByText(/2 productos/)).toBeDefined();
    });

    expect(screen.getByText("Producto sin precio")).toBeDefined();
    expect(screen.getByText("Consultar disponibilidad")).toBeDefined();
    expect(
      screen.queryAllByRole("button", { name: /^Quitar filtro \$/ })
    ).toHaveLength(0);
  });

  it("filtra por categoría y vuelve a la página 1", async () => {
    const productos = Array.from({ length: 13 }, (_, indice) =>
      crearProducto(indice + 1)
    );
    productos.push(
      crearProducto(99, {
        nombre: "Dell XPS 13",
        idCategoria: 2,
        idMarca: 2,
      })
    );
    configurarExito(productos);

    render(<CatalogoCliente />);

    await waitFor(() => {
      expect(screen.getByText(/14 productos/)).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByText(/Página 2 de 2/)).toBeDefined();

    fireEvent.click(screen.getByRole("checkbox", { name: /Laptops \/ PCs/i }));

    expect(screen.getByText(/Página 1 de 1/)).toBeDefined();
    expect(screen.getByText("Dell XPS 13")).toBeDefined();
  });

  it("limpia todos los filtros", async () => {
    configurarExito([crearProducto(1)]);

    render(<CatalogoCliente />);

    await waitFor(() => {
      expect(screen.getByText(/1 producto/)).toBeDefined();
    });

    fireEvent.change(
      screen.getByRole("searchbox", {
        name: /Buscar dispositivos tecnológicos/i,
      }),
      { target: { value: "inexistente" } }
    );

    expect(
      await screen.findByText(/No encontramos productos con esos filtros/i)
    ).toBeDefined();

    fireEvent.click(
      screen.getAllByRole("button", { name: /Limpiar filtros/i })[0]
    );

    expect(screen.getByText("Producto 1")).toBeDefined();
  });

  it("muestra el estado vacío cuando no hay coincidencias", async () => {
    configurarExito([crearProducto(1)]);

    render(<CatalogoCliente />);

    await waitFor(() => {
      expect(screen.getByText("Producto 1")).toBeDefined();
    });

    fireEvent.change(
      screen.getByRole("searchbox", {
        name: /Buscar dispositivos tecnológicos/i,
      }),
      { target: { value: "zzzz" } }
    );

    const vacio = await screen.findByRole("status");
    expect(vacio.getAttribute("data-estado")).toBe("vacio");
    expect(vacio.textContent).toContain(
      "No encontramos productos con esos filtros"
    );
  });

  it("distingue un catálogo vacío de una búsqueda sin resultados", async () => {
    configurarExito([]);

    render(<CatalogoCliente />);

    const vacio = await screen.findByRole("status");
    expect(vacio.getAttribute("data-estado")).toBe("vacio");
    expect(vacio.textContent).toContain("El catálogo está vacío");
    expect(vacio.textContent).toContain(
      "Aún no hay productos registrados en la plataforma."
    );
    expect(
      within(vacio).queryByRole("button", { name: /Limpiar filtros/i })
    ).toBeNull();
  });

  it("pagina los resultados de 12 en 12", async () => {
    configurarExito(
      Array.from({ length: 13 }, (_, indice) => crearProducto(indice + 1))
    );

    render(<CatalogoCliente />);

    await waitFor(() => {
      expect(screen.getByText(/13 productos/)).toBeDefined();
    });

    expect(screen.getByText("Producto 1")).toBeDefined();
    expect(screen.queryByText("Producto 13")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(screen.getByText("Producto 13")).toBeDefined();
    expect(screen.queryByText("Producto 1")).toBeNull();
  });

  it("ordena por menor precio desde la barra de herramientas", async () => {
    configurarExito([
      crearProducto(1, { nombre: "Caro", precioReferencia: 3_000_000 }),
      crearProducto(2, { nombre: "Barato", precioReferencia: 1_000_000 }),
      crearProducto(3, { nombre: "Medio", precioReferencia: 2_000_000 }),
    ]);

    render(<CatalogoCliente />);

    await waitFor(() => {
      expect(screen.getByText(/3 productos/)).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText("Ordenar por"), {
      target: { value: "menor-precio" },
    });

    expect(
      screen
        .getAllByRole("heading", { level: 3 })
        .map((titulo) => titulo.textContent)
    ).toEqual(["Barato", "Medio", "Caro"]);
  });

  it("vuelve a la página 1 al cambiar el orden", async () => {
    configurarExito(
      Array.from({ length: 13 }, (_, indice) => crearProducto(indice + 1))
    );

    render(<CatalogoCliente />);

    await waitFor(() => {
      expect(screen.getByText(/13 productos/)).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByText(/Página 2 de 2/)).toBeDefined();

    fireEvent.change(screen.getByLabelText("Ordenar por"), {
      target: { value: "mayor-precio" },
    });

    expect(screen.getByText(/Página 1 de 2/)).toBeDefined();
    expect(screen.getByText("Producto 13")).toBeDefined();
    expect(screen.queryByText("Producto 1")).toBeNull();
  });

  it("mantiene el orden original en Mejor valorados sin calificaciones agregadas", async () => {
    configurarExito([crearProducto(1), crearProducto(2)]);

    render(<CatalogoCliente />);

    await waitFor(() => {
      expect(screen.getByText(/2 productos/)).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText("Ordenar por"), {
      target: { value: "mejor-valorados" },
    });

    expect(
      screen
        .getAllByRole("heading", { level: 3 })
        .map((titulo) => titulo.textContent)
    ).toEqual(["Producto 1", "Producto 2"]);
  });

  it("abre el cajón de filtros y lo cierra con 'Ver resultados'", async () => {
    configurarExito([crearProducto(1)]);

    render(<CatalogoCliente />);

    await waitFor(() => {
      expect(screen.getByText("Producto 1")).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "Filtros" }));

    const dialogo = screen.getByRole("dialog", {
      name: "Filtros del catálogo",
    });
    expect(dialogo).toBeDefined();

    fireEvent.click(
      within(dialogo).getByRole("button", { name: "Ver resultados" })
    );

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("devuelve el foco al botón Filtros al cerrar el cajón", async () => {
    configurarExito([crearProducto(1)]);

    render(<CatalogoCliente />);

    await waitFor(() => {
      expect(screen.getByText("Producto 1")).toBeDefined();
    });

    const botonFiltros = screen.getByRole("button", { name: "Filtros" });
    fireEvent.click(botonFiltros);
    expect(screen.getByRole("dialog")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Cerrar filtros" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(botonFiltros);
  });

  it("cierra el cajón con Escape y devuelve el foco", async () => {
    configurarExito([crearProducto(1)]);

    render(<CatalogoCliente />);

    await waitFor(() => {
      expect(screen.getByText("Producto 1")).toBeDefined();
    });

    const botonFiltros = screen.getByRole("button", { name: "Filtros" });
    fireEvent.click(botonFiltros);
    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(botonFiltros);
  });

  it("aplica el precio mínimo escrito a mano", async () => {
    configurarExito([
      crearProducto(1, { nombre: "Económico", precioReferencia: 1_000_000 }),
      crearProducto(2, { nombre: "Medio", precioReferencia: 2_000_000 }),
      crearProducto(3, { nombre: "Premium", precioReferencia: 3_000_000 }),
    ]);

    render(<CatalogoCliente />);

    await waitFor(() => {
      expect(screen.getByText(/3 productos/)).toBeDefined();
    });

    const minimo = screen.getByLabelText("Precio mínimo en pesos");
    fireEvent.change(minimo, { target: { value: "2000000" } });
    fireEvent.blur(minimo);

    expect(screen.getByText(/2 productos/)).toBeDefined();
    expect(screen.queryByText("Económico")).toBeNull();
    expect(screen.getByText("Medio")).toBeDefined();
    expect(screen.getByText("Premium")).toBeDefined();
  });

  it("filtra las marcas con el buscador del panel", async () => {
    configurarExito([
      crearProducto(1),
      crearProducto(2, {
        nombre: "Dell XPS 13",
        idCategoria: 2,
        idMarca: 2,
      }),
    ]);

    render(<CatalogoCliente />);

    await waitFor(() => {
      expect(screen.getByText("Dell XPS 13")).toBeDefined();
    });

    fireEvent.change(
      screen.getByRole("searchbox", { name: "Buscar marcas" }),
      { target: { value: "dell" } }
    );

    expect(screen.getByRole("checkbox", { name: /Dell/i })).toBeDefined();
    expect(screen.queryByRole("checkbox", { name: /Samsung/i })).toBeNull();
  });

  it("combina búsqueda, categoría y marca y actualiza el contador de filtros", async () => {
    configurarExito(productosFiltros);

    render(<CatalogoCliente />);

    await waitFor(() => {
      expect(screen.getByText(/4 productos/)).toBeDefined();
    });

    fireEvent.change(
      screen.getByRole("searchbox", {
        name: /Buscar dispositivos tecnológicos/i,
      }),
      { target: { value: "galaxy" } }
    );
    fireEvent.click(screen.getByRole("checkbox", { name: /Móviles/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Samsung/i }));

    expect(screen.getByText("Filtros activos (3)")).toBeDefined();
    expect(screen.getByText(/2 productos/)).toBeDefined();
    expect(screen.getByText("Samsung Galaxy A55")).toBeDefined();
    expect(screen.getByText("Samsung Galaxy S25")).toBeDefined();
    expect(screen.queryByText("Dell XPS 13")).toBeNull();
  });

  it("quita un filtro individual desde su chip y conserva los demás", async () => {
    configurarExito(productosFiltros);

    render(<CatalogoCliente />);

    await waitFor(() => {
      expect(screen.getByText(/4 productos/)).toBeDefined();
    });

    fireEvent.change(
      screen.getByRole("searchbox", {
        name: /Buscar dispositivos tecnológicos/i,
      }),
      { target: { value: "Dell" } }
    );
    fireEvent.click(screen.getByRole("checkbox", { name: /Samsung/i }));

    expect(screen.getByText("Filtros activos (2)")).toBeDefined();
    expect(
      screen.getByRole("status").textContent
    ).toContain("No encontramos productos con esos filtros");

    fireEvent.click(
      screen.getByRole("button", { name: "Quitar filtro Samsung" })
    );

    expect(screen.getByText("Filtros activos (1)")).toBeDefined();
    expect(screen.getByText(/2 productos/)).toBeDefined();
    expect(screen.getByText("Dell XPS 13")).toBeDefined();
    expect(screen.getByText("Dell Inspiron 14")).toBeDefined();
    expect(screen.queryByText("Samsung Galaxy A55")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Quitar filtro Búsqueda: Dell" })
    ).toBeDefined();
  });

  it("borra todos los filtros desde los chips", async () => {
    configurarExito(productosFiltros);

    render(<CatalogoCliente />);

    await waitFor(() => {
      expect(screen.getByText(/4 productos/)).toBeDefined();
    });

    fireEvent.click(screen.getByRole("checkbox", { name: /Samsung/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Móviles/i }));

    expect(screen.getByText("Filtros activos (2)")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Borrar filtros" }));

    expect(screen.getByText(/4 productos/)).toBeDefined();
    expect(screen.queryByText(/Filtros activos/)).toBeNull();
    expect(screen.getByText("Samsung Galaxy A55")).toBeDefined();
    expect(screen.getByText("Dell XPS 13")).toBeDefined();
    expect(
      (
        screen.getByRole("checkbox", {
          name: /Samsung/i,
        }) as HTMLInputElement
      ).checked
    ).toBe(false);
  });

  it("muestra el estado vacío con filtros combinados sin coincidencias", async () => {
    configurarExito(productosFiltros);

    render(<CatalogoCliente />);

    await waitFor(() => {
      expect(screen.getByText(/4 productos/)).toBeDefined();
    });

    fireEvent.click(screen.getByRole("checkbox", { name: /Samsung/i }));
    fireEvent.click(
      screen.getByRole("checkbox", { name: /Laptops \/ PCs/i })
    );

    expect(screen.getByText("Filtros activos (2)")).toBeDefined();

    const vacio = screen.getByRole("status");
    expect(vacio.getAttribute("data-estado")).toBe("vacio");
    expect(vacio.textContent).toContain(
      "No encontramos productos con esos filtros"
    );

    fireEvent.click(
      within(vacio).getByRole("button", { name: "Limpiar filtros" })
    );

    expect(screen.getByText(/4 productos/)).toBeDefined();
    expect(screen.queryByText(/Filtros activos/)).toBeNull();
  });

  it("restablece 'Excluir marcas' al quitar la última marca y permite volver a incluirla", async () => {
    configurarExito(productosFiltros);

    render(<CatalogoCliente />);

    await waitFor(() => {
      expect(screen.getByText(/4 productos/)).toBeDefined();
    });

    fireEvent.click(screen.getByRole("checkbox", { name: /Samsung/i }));

    expect(screen.getByText(/2 productos/)).toBeDefined();
    expect(screen.getByText("Samsung Galaxy A55")).toBeDefined();
    expect(screen.queryByText("Dell XPS 13")).toBeNull();

    fireEvent.click(
      screen.getByRole("checkbox", { name: /Excluir marcas/i })
    );

    expect(
      screen.getByRole("button", { name: "Quitar filtro Excluir: Samsung" })
    ).toBeDefined();
    expect(screen.getByText("Dell XPS 13")).toBeDefined();
    expect(screen.getByText("Dell Inspiron 14")).toBeDefined();
    expect(screen.queryByText("Samsung Galaxy A55")).toBeNull();

    fireEvent.click(screen.getByRole("checkbox", { name: /Samsung/i }));

    expect(screen.getByText(/4 productos/)).toBeDefined();
    expect(screen.queryByRole("button", { name: /Borrar filtros/i })).toBeNull();

    const excluirTrasQuitar = screen.getByRole("checkbox", {
      name: /Excluir marcas/i,
    }) as HTMLInputElement;
    expect(excluirTrasQuitar.checked).toBe(false);
    expect(excluirTrasQuitar.disabled).toBe(true);

    fireEvent.click(screen.getByRole("checkbox", { name: /Samsung/i }));

    expect(screen.getByText("Samsung Galaxy A55")).toBeDefined();
    expect(screen.getByText("Samsung Galaxy S25")).toBeDefined();
    expect(screen.queryByText("Dell XPS 13")).toBeNull();
    expect(
      (
        screen.getByRole("checkbox", {
          name: /Excluir marcas/i,
        }) as HTMLInputElement
      ).checked
    ).toBe(false);
  });

  it("navega al detalle real al pulsar Ver detalle", async () => {
    configurarExito([crearProducto(7)]);

    render(<CatalogoCliente />);

    await waitFor(() => {
      expect(screen.getByText("Producto 7")).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "Ver detalle" }));

    expect(mockPush).toHaveBeenCalledWith("/productos/7");
  });

  it("no navega a rutas de detalle cuando el producto tiene un ID negativo o mock", async () => {
    mockPush.mockClear();
    configurarExito([crearProducto(-15)]);

    render(<CatalogoCliente />);

    await waitFor(() => {
      expect(screen.getByText("Producto -15")).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "Ver detalle" }));

    expect(mockPush).not.toHaveBeenCalled();
  });
});
