// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
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

import {
  ApiError,
  obtenerCategorias,
  obtenerMarcas,
  obtenerProductos,
} from "@/services/api";
import { CLAVE_COMPARADOR } from "@/data/comparador";
import { CLAVE_COMPARADOS_RECIENTES } from "@/data/comparadosRecientes";
import ComparadorCliente from "./ComparadorCliente";

const mockProductos = vi.mocked(obtenerProductos);
const mockCategorias = vi.mocked(obtenerCategorias);
const mockMarcas = vi.mocked(obtenerMarcas);

const CATEGORIAS: CategoriaResponse[] = [
  { idCategoria: 1, nombre: "Móviles", descripcion: null, estado: true },
];

const MARCAS: MarcaResponse[] = [
  { idMarca: 1, nombre: "Samsung", descripcion: null, estado: true },
];

function crearProducto(
  idProducto: number,
  overrides: Partial<Producto> = {},
): Producto {
  return {
    idProducto,
    nombre: `Producto ${idProducto}`,
    descripcion: `Descripción del producto ${idProducto}`,
    idCategoria: 1,
    idMarca: 1,
    imagen: null,
    precioReferencia: 1_000_000 + idProducto * 100_000,
    estado: true,
    caracteristicas: {
      pantalla: `Pantalla ${idProducto}`,
      procesador: "Snapdragon 8",
      ram: "12 GB",
    },
    ...overrides,
  };
}

function configurarExito(productos: Producto[]) {
  mockProductos.mockResolvedValue(productos);
  mockCategorias.mockResolvedValue(CATEGORIAS);
  mockMarcas.mockResolvedValue(MARCAS);
}

function seleccionarEnStorage(ids: number[]) {
  localStorage.setItem(CLAVE_COMPARADOR, JSON.stringify(ids));
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("ComparadorCliente", () => {
  it("compara audio registrado sin filas de pantalla, RAM o cámaras", async () => {
    configurarExito([
      crearProducto(1, {
        idCategoria: 82,
        caracteristicas: {
          transductores: "40 mm",
          cancelacion_ruido: false,
          codecs: ["AAC", "SBC"],
          pantalla: "Dato ajeno",
          ram: "8 GB",
          camaras: "50 MP",
        },
      }),
      crearProducto(2, {
        idCategoria: 82,
        caracteristicas: {
          secciones: [{ titulo: "TRANSDUCTORES / DRIVERS", descripcion: "11 mm" }],
          metricasComparables: [
            { clave: "autonomia", nombre: "Autonomía", grupo: "audio", valor: 30, unidad: "h", comparable: true },
          ],
        },
      }),
    ]);
    mockCategorias.mockResolvedValue([
      { idCategoria: 82, nombre: "Auriculares", descripcion: null, estado: true },
    ]);
    seleccionarEnStorage([1, 2]);
    render(<ComparadorCliente />);

    const tabla = await screen.findByRole("table", { name: "Comparación de productos" });
    expect(within(tabla).queryByRole("rowheader", { name: /Pantalla|RAM|Cámaras/ })).toBeNull();
    const transductores = within(tabla)
      .getByRole("rowheader", { name: /Transductores/ }).closest("tr")!;
    expect(within(transductores).getAllByRole("cell").map((celda) => celda.textContent))
      .toEqual(["40 mm", "11 mm"]);
    const anc = within(tabla)
      .getByRole("rowheader", { name: /Cancelación de ruido/ }).closest("tr")!;
    expect(within(anc).getAllByRole("cell").map((celda) => celda.textContent))
      .toEqual(["No", "Sin dato"]);
    expect(within(tabla).getByText("AAC, SBC")).toBeDefined();
    expect(within(tabla).getByText("30 h")).toBeDefined();
    expect(within(tabla).queryByRole("rowheader", { name: /Micrófonos/ })).toBeNull();
  });

  it("aplica Solo diferencias a las filas técnicas de audio", async () => {
    configurarExito([1, 2].map((id) => crearProducto(id, {
      idCategoria: 82,
      caracteristicas: {
        drivers: id === 1 ? "40 mm" : "11 mm",
        anc: false,
      },
    })));
    mockCategorias.mockResolvedValue([
      { idCategoria: 82, nombre: "Auriculares", descripcion: null, estado: true },
    ]);
    seleccionarEnStorage([1, 2]);
    render(<ComparadorCliente />);
    await screen.findByRole("rowheader", { name: /Cancelación de ruido/ });
    fireEvent.click(screen.getByRole("checkbox", { name: "Solo diferencias" }));
    expect(screen.queryByRole("rowheader", { name: /Cancelación de ruido/ })).toBeNull();
    expect(screen.getByRole("rowheader", { name: /Transductores/ })).toBeDefined();
    fireEvent.click(screen.getByRole("checkbox", { name: "Solo diferencias" }));
    expect(screen.getByRole("rowheader", { name: /Cancelación de ruido/ })).toBeDefined();
  });

  it("muestra solo datos generales cuando faltan características, sin una plantilla ficticia", async () => {
    configurarExito([crearProducto(1, { caracteristicas: null })]);
    seleccionarEnStorage([1]);
    render(<ComparadorCliente />);
    const tabla = await screen.findByRole("table", { name: "Comparación de productos" });
    expect(within(tabla).getAllByRole("rowheader").map((fila) => fila.textContent))
      .toEqual(["Precio de referencia", "Disponibilidad", "Marca", "Categoría"]);
    expect(screen.getByText("No hay características técnicas registradas para esta selección.")).toBeDefined();
  });

  it("cambia las filas al empezar una comparación de portátiles después de audio", async () => {
    configurarExito([
      crearProducto(1, { idCategoria: 82, caracteristicas: { drivers: "40 mm" } }),
      crearProducto(2, {
        idCategoria: 200,
        caracteristicas: { pantalla: "IPS", grafica: "GPU registrada", puertos: "HDMI" },
      }),
    ]);
    mockCategorias.mockResolvedValue([
      { idCategoria: 82, nombre: "Auriculares", descripcion: null, estado: true },
      { idCategoria: 200, nombre: "Portátiles", descripcion: null, estado: true },
    ]);
    seleccionarEnStorage([1]);
    render(<ComparadorCliente />);
    await screen.findByRole("rowheader", { name: /Transductores/ });
    fireEvent.click(screen.getByRole("button", { name: "Vaciar comparador" }));
    fireEvent.click(screen.getByRole("button", { name: "Agregar Producto 2 al comparador" }));
    expect(screen.queryByRole("rowheader", { name: /Transductores/ })).toBeNull();
    expect(screen.getByRole("rowheader", { name: /Tarjeta gráfica/ })).toBeDefined();
    expect(screen.getByRole("rowheader", { name: "Puertos" })).toBeDefined();
    expect(screen.getByRole("rowheader", { name: "Pantalla" })).toBeDefined();
    expect(JSON.parse(localStorage.getItem(CLAVE_COMPARADOR) ?? "[]")).toEqual([2]);
  });

  it("cuenta solo características pertinentes en la sugerencia, independientemente de Solo diferencias", async () => {
    configurarExito([
      crearProducto(1, {
        idCategoria: 82,
        precioReferencia: 500000,
        caracteristicas: {
          transductores: "40 mm", ram: "8 GB", pantalla: "OLED", camaras: "50 MP",
          memoria: "8 GB",
          secciones: [{ titulo: "CHIPSET & ARQUITECTURA", descripcion: "Snapdragon" }],
        },
      }),
      crearProducto(2, {
        idCategoria: 82,
        precioReferencia: 500000,
        caracteristicas: { transductores: "40 mm", cancelacion_ruido: false, puertos: "Jack 3.5 mm" },
      }),
    ]);
    mockCategorias.mockResolvedValue([
      { idCategoria: 82, nombre: "Auriculares", descripcion: null, estado: true },
    ]);
    seleccionarEnStorage([1, 2]);
    render(<ComparadorCliente />);
    const sugerencia = await screen.findByRole("region", { name: "Sugerencia del comparador" });
    expect(within(sugerencia).getByText("Producto 2")).toBeDefined();
    expect(within(sugerencia).getByText(/Registra más especificaciones.*\(3\)/)).toBeDefined();
    expect(sugerencia.textContent).not.toContain("de 6");
    fireEvent.click(screen.getByRole("checkbox", { name: "Solo diferencias" }));
    expect(within(sugerencia).getByText(/Registra más especificaciones.*\(3\)/)).toBeDefined();
  });

  it("identifica la categoría activa por su nombre registrado, no por el tipo visual", async () => {
    configurarExito([crearProducto(1, { idCategoria: 80, caracteristicas: null })]);
    mockCategorias.mockResolvedValue([
      { idCategoria: 80, nombre: "Accesorios", descripcion: null, estado: true },
    ]);
    seleccionarEnStorage([1]);
    render(<ComparadorCliente />);
    expect(await screen.findByText(/Categoría de la comparación: Accesorios/)).toBeDefined();
  });

  it("identifica por ID una categoría cuyo nombre no está registrado en la respuesta", async () => {
    configurarExito([crearProducto(1, { idCategoria: 80, caracteristicas: null })]);
    seleccionarEnStorage([1]);
    render(<ComparadorCliente />);
    expect(await screen.findByText(/Categoría de la comparación: Categoría #80/)).toBeDefined();
  });

  it("filtra por el id de categoría real y vuelve a permitir otra al vaciar", async () => {
    configurarExito([
      crearProducto(1),
      crearProducto(2),
      // Misma etiqueta visual, distinta categoría real: no deben mezclarse.
      crearProducto(3, { idCategoria: 50, nombreCategoria: "Móviles" }),
    ]);
    render(<ComparadorCliente />);
    fireEvent.click(await screen.findByRole("button", { name: "Agregar Producto 1 al comparador" }));
    expect(screen.queryByRole("button", { name: "Agregar Producto 3 al comparador" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Agregar Producto 2 al comparador" }));
    expect(JSON.parse(localStorage.getItem(CLAVE_COMPARADOR) ?? "[]")).toEqual([1, 2]);
    fireEvent.change(screen.getByLabelText("Buscar productos para comparar"), { target: { value: "Producto 3" } });
    expect(screen.queryByRole("button", { name: "Agregar Producto 3 al comparador" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Vaciar comparador" }));
    fireEvent.click(screen.getByRole("button", { name: "Agregar Producto 3 al comparador" }));
    expect(JSON.parse(localStorage.getItem(CLAVE_COMPARADOR) ?? "[]")).toEqual([3]);
  });

  it("no muestra columnas de otra categoría al recuperar una selección mixta", async () => {
    configurarExito([
      crearProducto(1),
      crearProducto(2, { idCategoria: 50 }),
      crearProducto(3, { idCategoria: 50 }),
    ]);
    seleccionarEnStorage([99, 2, 1, 3]);
    render(<ComparadorCliente />);
    const tabla = await screen.findByRole("table", { name: "Comparación de productos" });
    expect(within(tabla).queryByRole("link", { name: "Producto 1" })).toBeNull();
    expect(within(tabla).getByRole("link", { name: "Producto 2" })).toBeDefined();
    expect(within(tabla).getByRole("link", { name: "Producto 3" })).toBeDefined();
    await waitFor(() => expect(JSON.parse(localStorage.getItem(CLAVE_COMPARADOR) ?? "[]")).toEqual([2, 3]));
    expect(screen.getByText(/Se depuró la selección guardada/)).toBeDefined();
  });

  it("muestra el estado de carga", () => {
    mockProductos.mockImplementation(() => new Promise(() => {}));
    mockCategorias.mockImplementation(() => new Promise(() => {}));
    mockMarcas.mockImplementation(() => new Promise(() => {}));

    render(<ComparadorCliente />);

    expect(
      screen.getByText("Cargando catálogo para el comparador…"),
    ).toBeDefined();
  });

  it("muestra el estado vacío y el selector cuando no hay productos elegidos", async () => {
    configurarExito([crearProducto(1)]);

    render(<ComparadorCliente />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          level: 1,
          name: "Comparador de productos",
        }),
      ).toBeDefined();
    });

    expect(
      screen.getByText("Aún no has agregado productos al comparador."),
    ).toBeDefined();
    expect(
      screen
        .getByText("Aún no has agregado productos al comparador.")
        .closest('[data-estado="vacio"]'),
    ).not.toBeNull();
    expect(
      screen.getByLabelText("Buscar productos para comparar"),
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Agregar Producto 1 al comparador" }),
    ).toBeDefined();
  });

  it("agrega un producto desde el selector y lo muestra en la tabla", async () => {
    configurarExito([crearProducto(1), crearProducto(2)]);

    render(<ComparadorCliente />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: "Agregar Producto 1 al comparador",
        }),
      ).toBeDefined();
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Agregar Producto 1 al comparador",
      }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("table", { name: "Comparación de productos" }),
      ).toBeDefined();
    });

    const tabla = screen.getByRole("table", {
      name: "Comparación de productos",
    });
    expect(within(tabla).getByRole("link", { name: "Producto 1" })).toBeDefined();
    expect(JSON.parse(localStorage.getItem(CLAVE_COMPARADOR) ?? "[]")).toEqual([
      1,
    ]);
  });

  it("impide superar 4 productos y avisa del límite", async () => {
    configurarExito([
      crearProducto(1),
      crearProducto(2),
      crearProducto(3),
      crearProducto(4),
      crearProducto(5),
    ]);
    seleccionarEnStorage([1, 2, 3, 4]);

    render(<ComparadorCliente />);

    await waitFor(() => {
      expect(
        screen.getByText(
          "El comparador admite hasta 4 productos. Quita uno para agregar otro.",
        ),
      ).toBeDefined();
    });

    const boton = screen.getByRole("button", {
      name: "Agregar Producto 5 al comparador",
    }) as HTMLButtonElement;
    expect(boton.disabled).toBe(true);
    expect(JSON.parse(localStorage.getItem(CLAVE_COMPARADOR) ?? "[]")).toEqual([
      1, 2, 3, 4,
    ]);
  });

  it("descarta ids persistidos que ya no están en el catálogo y permite seguir comparando", async () => {
    configurarExito([crearProducto(5), crearProducto(6)]);
    seleccionarEnStorage([1, 2, 3, 4]);

    render(<ComparadorCliente />);

    await waitFor(() => {
      expect(
        JSON.parse(localStorage.getItem(CLAVE_COMPARADOR) ?? "[]"),
      ).toEqual([]);
    });

    const boton = screen.getByRole("button", {
      name: "Agregar Producto 5 al comparador",
    }) as HTMLButtonElement;
    expect(boton.disabled).toBe(false);

    fireEvent.click(boton);

    await waitFor(() => {
      const tabla = screen.getByRole("table", {
        name: "Comparación de productos",
      });
      expect(
        within(tabla).getByRole("link", { name: "Producto 5" }),
      ).toBeDefined();
    });
    expect(
      JSON.parse(localStorage.getItem(CLAVE_COMPARADOR) ?? "[]"),
    ).toEqual([5]);
  });

  it("descarta la selección persistida si el catálogo carga vacío", async () => {
    configurarExito([]);
    seleccionarEnStorage([1, 2]);

    render(<ComparadorCliente />);

    await waitFor(() => {
      expect(
        JSON.parse(localStorage.getItem(CLAVE_COMPARADOR) ?? "[]"),
      ).toEqual([]);
    });

    expect(
      screen.getByText("No hay productos registrados en el catálogo."),
    ).toBeDefined();
    expect(
      screen.getByText("Aún no has agregado productos al comparador."),
    ).toBeDefined();
  });

  it("vacía la selección desde la tabla y persiste el comparador vacío", async () => {
    configurarExito([crearProducto(1), crearProducto(2)]);
    seleccionarEnStorage([1, 2]);

    render(<ComparadorCliente />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Vaciar comparador" }),
      ).toBeDefined();
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Vaciar comparador" }),
    );

    await waitFor(() => {
      expect(
        screen.getByText("Aún no has agregado productos al comparador."),
      ).toBeDefined();
    });
    expect(
      JSON.parse(localStorage.getItem(CLAVE_COMPARADOR) ?? "[]"),
    ).toEqual([]);
  });

  it("quita un producto de la tabla", async () => {
    configurarExito([crearProducto(1), crearProducto(2)]);
    seleccionarEnStorage([1, 2]);

    render(<ComparadorCliente />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: "Quitar Producto 1 del comparador",
        }),
      ).toBeDefined();
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Quitar Producto 1 del comparador",
      }),
    );

    await waitFor(() => {
      const tabla = screen.getByRole("table", {
        name: "Comparación de productos",
      });
      expect(
        within(tabla).queryByRole("link", { name: "Producto 1" }),
      ).toBeNull();
      expect(
        within(tabla).getByRole("link", { name: "Producto 2" }),
      ).toBeDefined();
    });

    expect(JSON.parse(localStorage.getItem(CLAVE_COMPARADOR) ?? "[]")).toEqual([
      2,
    ]);
  });

  it("marca las diferencias y permite ocultar las filas iguales", async () => {
    configurarExito([crearProducto(1), crearProducto(2)]);
    seleccionarEnStorage([1, 2]);

    render(<ComparadorCliente />);

    await waitFor(() => {
      expect(screen.getAllByText("Distinto").length).toBeGreaterThan(0);
    });

    expect(
      screen.getByRole("rowheader", { name: /Marca/ }),
    ).toBeDefined();
    expect(
      screen.getByRole("rowheader", { name: /Precio de referencia/ }),
    ).toBeDefined();

    fireEvent.click(
      screen.getByRole("checkbox", { name: "Solo diferencias" }),
    );

    expect(screen.queryByRole("rowheader", { name: /Marca/ })).toBeNull();
    expect(screen.queryByRole("rowheader", { name: /Categoría/ })).toBeNull();
    expect(
      screen.getByRole("rowheader", { name: /Precio de referencia/ }),
    ).toBeDefined();
    expect(screen.getByRole("rowheader", { name: /Pantalla/ })).toBeDefined();
  });

  it("muestra la recomendación derivada y su carácter informativo", async () => {
    configurarExito([crearProducto(1), crearProducto(2)]);
    seleccionarEnStorage([1, 2]);

    render(<ComparadorCliente />);

    await waitFor(() => {
      expect(
        screen.getByRole("region", { name: "Sugerencia del comparador" }),
      ).toBeDefined();
    });

    const recomendacion = screen.getByRole("region", {
      name: "Sugerencia del comparador",
    });
    expect(within(recomendacion).getByText("Producto 1")).toBeDefined();
    expect(
      within(recomendacion).getByText(/Su precio de referencia es el más bajo/i),
    ).toBeDefined();
    expect(
      within(recomendacion).getByText(/No es una calificación editorial/i),
    ).toBeDefined();
  });

  it("muestra un estado de error si el catálogo no carga y permite reintentar", async () => {
    mockProductos.mockRejectedValue(
      new ApiError("Servicio de catálogo no disponible", 500),
    );
    mockCategorias.mockResolvedValue(CATEGORIAS);
    mockMarcas.mockResolvedValue(MARCAS);

    render(<ComparadorCliente />);

    const alerta = await screen.findByRole("alert");
    expect(alerta.getAttribute("data-estado")).toBe("error");
    expect(alerta.textContent).toContain("No pudimos cargar el catálogo");
    expect(screen.getByText("Servicio de catálogo no disponible")).toBeDefined();

    mockProductos.mockResolvedValue([crearProducto(1)]);
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: "Agregar Producto 1 al comparador",
        }),
      ).toBeDefined();
    });
  });

  it("muestra los comparados recientemente con acceso directo a cada producto", async () => {
    configurarExito([crearProducto(1), crearProducto(2)]);
    localStorage.setItem(CLAVE_COMPARADOS_RECIENTES, JSON.stringify([2, 1]));

    render(<ComparadorCliente />);

    const region = await screen.findByRole("region", {
      name: "Comparados recientemente",
    });
    const enlaces = within(region).getAllByRole("link");

    expect(enlaces).toHaveLength(2);
    expect(enlaces[0].getAttribute("href")).toBe("/productos/2");
    expect(enlaces[0].textContent).toContain("Producto 2");
    expect(enlaces[1].getAttribute("href")).toBe("/productos/1");
  });

  it("no muestra la sección de recientes si no hay historial", async () => {
    configurarExito([crearProducto(1)]);

    render(<ComparadorCliente />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Comparador de productos" }),
      ).toBeDefined();
    });

    expect(
      screen.queryByRole("region", { name: "Comparados recientemente" }),
    ).toBeNull();
  });
});
