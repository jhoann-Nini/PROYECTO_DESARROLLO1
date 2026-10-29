import { describe, expect, it, vi } from "vitest";
import type { ProductoViewModel } from "@/data/productoViewModel";
import {
  MAX_COMPARADOR,
  agregarIdComparador,
  construirFilasComparacion,
  generarRecomendacion,
  guardarIdsComparador,
  leerIdsComparador,
  normalizarIdsComparador,
  quitarIdComparador,
} from "./comparador";

function crearVista(
  overrides: Partial<ProductoViewModel> = {},
): ProductoViewModel {
  return {
    idProducto: 1,
    nombre: "Producto Uno",
    marca: "Samsung",
    categoria: "moviles",
    categoriaEtiqueta: "Móviles",
    imagen: null,
    precioCOP: 1_000_000,
    precioFormateado: "$ 1.000.000 COP",
    disponible: true,
    rating: null,
    cantidadResenas: null,
    especificaciones: {
      pantalla: "6.1'' AMOLED",
      procesador: "Snapdragon 8",
      ram: "8 GB",
      almacenamiento: "128 GB",
      camaras: "50 MP",
      bateria: "5000 mAh",
    },
    caracteristicas: [],
    textoBusqueda: "producto uno samsung",
    ...overrides,
  };
}

function crearStorage(inicial: Record<string, string> = {}) {
  const datos = new Map(Object.entries(inicial));
  return {
    getItem: vi.fn((clave: string) => datos.get(clave) ?? null),
    setItem: vi.fn((clave: string, valor: string) => {
      datos.set(clave, valor);
    }),
  };
}

describe("normalizarIdsComparador", () => {
  it("acepta enteros positivos, elimina duplicados y respeta el máximo", () => {
    expect(
      normalizarIdsComparador([1, "2", 2, 0, -1, 3, 4, 5, 3.5]),
    ).toEqual([1, 2, 3, 4]);
  });

  it("devuelve una lista vacía para valores que no son arreglos", () => {
    expect(normalizarIdsComparador(null)).toEqual([]);
    expect(normalizarIdsComparador("1,2")).toEqual([]);
  });
});

describe("agregarIdComparador", () => {
  it("agrega un id nuevo", () => {
    expect(agregarIdComparador([], 7)).toEqual({
      ids: [7],
      agregado: true,
      motivo: "agregado",
    });
  });

  it("no duplica un id existente", () => {
    expect(agregarIdComparador([7], 7)).toEqual({
      ids: [7],
      agregado: false,
      motivo: "duplicado",
    });
  });

  it("rechaza un quinto producto", () => {
    const ids = Array.from({ length: MAX_COMPARADOR }, (_, i) => i + 1);
    expect(agregarIdComparador(ids, 5)).toEqual({
      ids,
      agregado: false,
      motivo: "lleno",
    });
  });

  it("rechaza ids inválidos", () => {
    expect(agregarIdComparador([], 0).motivo).toBe("invalido");
    expect(agregarIdComparador([], Number.NaN).motivo).toBe("invalido");
  });

  it("quita un id sin alterar el orden de los demás", () => {
    expect(quitarIdComparador([3, 1, 2], 1)).toEqual([3, 2]);
  });
});

describe("persistencia del comparador", () => {
  it("lee ids válidos y tolera JSON inválido", () => {
    const storage = crearStorage({
      "tecreview:comparador": JSON.stringify([3, 1, 3, 9]),
    });
    expect(leerIdsComparador(storage)).toEqual([3, 1, 9]);

    const invalido = crearStorage({ "tecreview:comparador": "{no-json" });
    expect(leerIdsComparador(invalido)).toEqual([]);
    expect(leerIdsComparador(null)).toEqual([]);
  });

  it("guarda la selección normalizada", () => {
    const storage = crearStorage();
    guardarIdsComparador(storage, [2, 2, 1, 5, 6, 7]);

    expect(storage.setItem).toHaveBeenCalledWith(
      "tecreview:comparador",
      JSON.stringify([2, 1, 5, 6]),
    );
  });
});

describe("construirFilasComparacion", () => {
  it("construye filas reales y marca solo las diferencias", () => {
    const filas = construirFilasComparacion([
      crearVista(),
      crearVista({
        idProducto: 2,
        nombre: "Producto Dos",
        precioCOP: 2_000_000,
        precioFormateado: "$ 2.000.000 COP",
        disponible: false,
        especificaciones: {
          ...crearVista().especificaciones,
          pantalla: "6.7'' AMOLED",
        },
      }),
    ]);

    const porClave = new Map(filas.map((fila) => [fila.clave, fila]));

    expect(porClave.get("precio")?.difiere).toBe(true);
    expect(porClave.get("disponibilidad")?.difiere).toBe(true);
    expect(porClave.get("marca")?.difiere).toBe(false);
    expect(porClave.get("pantalla")?.difiere).toBe(true);
    expect(porClave.get("ram")?.difiere).toBe(false);
    expect(porClave.get("precio")?.valores).toEqual([
      "$ 1.000.000 COP",
      "$ 2.000.000 COP",
    ]);
  });

  it("usa null cuando falta un dato y lo considera distinto de un valor real", () => {
    const filas = construirFilasComparacion([
      crearVista(),
      crearVista({
        idProducto: 2,
        especificaciones: {
          ...crearVista().especificaciones,
          pantalla: null,
        },
      }),
    ]);

    const pantalla = filas.find((fila) => fila.clave === "pantalla");
    expect(pantalla?.valores).toEqual(["6.1'' AMOLED", null]);
    expect(pantalla?.difiere).toBe(true);
  });
});

describe("generarRecomendacion", () => {
  it("pide al menos dos productos", () => {
    const resultado = generarRecomendacion([crearVista()]);
    expect(resultado.idProducto).toBeNull();
    expect(resultado.mensaje).toMatch(/al menos dos/i);
  });

  it("prefiere un producto disponible frente a uno no disponible", () => {
    const resultado = generarRecomendacion([
      crearVista({ idProducto: 1, nombre: "No disponible", disponible: false }),
      crearVista({ idProducto: 2, nombre: "Disponible", disponible: true }),
    ]);

    expect(resultado.idProducto).toBe(2);
    expect(resultado.nombre).toBe("Disponible");
    expect(resultado.motivos.join(" ")).toMatch(/disponibilidad/i);
  });

  it("prefiere el menor precio cuando ambos están disponibles", () => {
    const resultado = generarRecomendacion([
      crearVista({
        idProducto: 1,
        nombre: "Económico",
        precioCOP: 900_000,
        precioFormateado: "$ 900.000 COP",
      }),
      crearVista({
        idProducto: 2,
        nombre: "Costoso",
        precioCOP: 2_500_000,
        precioFormateado: "$ 2.500.000 COP",
      }),
    ]);

    expect(resultado.idProducto).toBe(1);
    expect(resultado.motivos.join(" ")).toMatch(/precio/i);
  });

  it("no usa el precio si algún candidato no lo tiene registrado", () => {
    const resultado = generarRecomendacion([
      crearVista({
        idProducto: 1,
        nombre: "Sin precio",
        precioCOP: 0,
        precioFormateado: "Consultar disponibilidad",
        especificaciones: {
          pantalla: null,
          procesador: null,
          ram: null,
          almacenamiento: null,
          camaras: null,
          bateria: null,
        },
      }),
      crearVista({ idProducto: 2, nombre: "Con precio" }),
    ]);

    expect(resultado.idProducto).toBe(2);
    expect(resultado.motivos.join(" ")).toMatch(/especificaciones/i);
  });

  it("no inventa un ganador cuando hay empate técnico", () => {
    const resultado = generarRecomendacion([
      crearVista({ idProducto: 1, nombre: "Uno" }),
      crearVista({ idProducto: 2, nombre: "Dos" }),
    ]);

    expect(resultado.idProducto).toBeNull();
    expect(resultado.mensaje).toMatch(/empate/i);
  });

  it("no recomienda si ninguno tiene disponibilidad confirmada", () => {
    const resultado = generarRecomendacion([
      crearVista({ idProducto: 1, disponible: false }),
      crearVista({ idProducto: 2, disponible: false }),
    ]);

    expect(resultado.idProducto).toBeNull();
    expect(resultado.mensaje).toMatch(/disponibilidad/i);
  });
});
