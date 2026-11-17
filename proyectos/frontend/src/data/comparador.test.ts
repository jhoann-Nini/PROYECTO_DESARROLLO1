import { describe, expect, it, vi } from "vitest";

import { normalizarDatosFichaTecnica } from "@/data/fichaTecnica";
import type { ProductoViewModel } from "@/data/productoViewModel";
import type { Producto } from "@/types/producto";
import {
  MAX_COMPARADOR,
  agregarIdComparador,
  construirFilasComparacion,
  generarRecomendacion,
  guardarIdsComparador,
  leerIdsComparador,
  normalizarIdsComparador,
  quitarIdComparador,
  validarSeleccionComparador,
} from "./comparador";

const CATALOGO = [
  ...[1, 2, 3, 4, 5, 7].map((idProducto) => ({ idProducto, idCategoria: 10 })),
  { idProducto: 8, idCategoria: 20 },
  { idProducto: 9, idCategoria: 20 },
  { idProducto: 6, idCategoria: 0 },
];

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
    datosFichaTecnica:
      overrides.datosFichaTecnica ?? normalizarDatosFichaTecnica(null),
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

function productoApi(vista: ProductoViewModel, overrides: Partial<Producto> = {}): Producto {
  return {
    idProducto: vista.idProducto,
    nombre: vista.nombre,
    nombreCategoria: "Móviles",
    idCategoria: 10,
    idMarca: 1,
    descripcion: null,
    imagen: null,
    precioReferencia: vista.precioCOP,
    estado: vista.disponible,
    caracteristicas: { ...vista.especificaciones },
    ...overrides,
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
    expect(agregarIdComparador([], 7, CATALOGO)).toEqual({
      ids: [7],
      agregado: true,
      motivo: "agregado",
    });
  });

  it("no duplica un id existente", () => {
    expect(agregarIdComparador([7], 7, CATALOGO)).toEqual({
      ids: [7],
      agregado: false,
      motivo: "duplicado",
    });
  });

  it("rechaza un quinto producto", () => {
    const ids = Array.from({ length: MAX_COMPARADOR }, (_, i) => i + 1);
    expect(agregarIdComparador(ids, 5, CATALOGO)).toEqual({
      ids,
      agregado: false,
      motivo: "lleno",
    });
  });

  it("rechaza ids inválidos", () => {
    expect(agregarIdComparador([], 0, CATALOGO).motivo).toBe("invalido");
    expect(agregarIdComparador([], Number.NaN, CATALOGO).motivo).toBe("invalido");
    expect(agregarIdComparador([], 99, CATALOGO).motivo).toBe("invalido");
    expect(agregarIdComparador([], 6, CATALOGO).motivo).toBe("invalido");
  });

  it("rechaza otra categoría sin cambiar la selección", () => {
    expect(agregarIdComparador([7], 8, CATALOGO)).toEqual({
      ids: [7],
      agregado: false,
      motivo: "categoria-incompatible",
    });
  });

  it("permite fijar otra categoría cuando no quedan productos", () => {
    expect(agregarIdComparador(quitarIdComparador([7], 7), 8, CATALOGO).ids)
      .toEqual([8]);
  });

  it("quita un id sin alterar el orden de los demás", () => {
    expect(quitarIdComparador([3, 1, 2], 1)).toEqual([3, 2]);
  });
});

describe("validarSeleccionComparador", () => {
  it("conserva el primer producto válido y los compatibles en su orden", () => {
    expect(validarSeleccionComparador([99, 8, 1, 9], CATALOGO)).toEqual([8, 9]);
    expect(validarSeleccionComparador([1, 8, 2], CATALOGO)).toEqual([1, 2]);
  });

  it("no usa categorías inválidas ni inventa productos para un catálogo vacío", () => {
    expect(validarSeleccionComparador([6, 8, 9], CATALOGO)).toEqual([8, 9]);
    expect(validarSeleccionComparador([1, 2], [])).toEqual([]);
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
    const vistas = [
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
    ];
    const filas = construirFilasComparacion(vistas, vistas.map((vista) => productoApi(vista)));

    const porClave = new Map(filas.map((fila) => [fila.clave, fila]));

    expect(porClave.get("precio")?.difiere).toBe(true);
    expect(porClave.get("disponibilidad")?.difiere).toBe(true);
    expect(porClave.get("marca")?.difiere).toBe(false);
    expect(porClave.get("tecnica:pantalla")?.difiere).toBe(true);
    expect(porClave.get("tecnica:ram")?.difiere).toBe(false);
    expect(porClave.get("precio")?.valores).toEqual([
      "$ 1.000.000 COP",
      "$ 2.000.000 COP",
    ]);
  });

  it("usa null cuando falta un dato y lo considera distinto de un valor real", () => {
    const vistas = [
      crearVista(),
      crearVista({
        idProducto: 2,
        especificaciones: {
          ...crearVista().especificaciones,
          pantalla: null,
        },
      }),
    ];
    const filas = construirFilasComparacion(vistas, vistas.map((vista) => productoApi(vista)));

    const pantalla = filas.find((fila) => fila.clave === "tecnica:pantalla");
    expect(pantalla?.valores).toEqual(["6.1'' AMOLED", null]);
    expect(pantalla?.difiere).toBe(true);
  });

  it("alinea por ID los datos de audio y omite campos ajenos o vacíos para todos", () => {
    const vistas = [crearVista({ idProducto: 2 }), crearVista({ idProducto: 1 })];
    const filas = construirFilasComparacion(vistas, [
      productoApi(vistas[1], {
        nombreCategoria: "Auriculares",
        caracteristicas: { transductores: "40 mm", anc: false, pantalla: "OLED" },
      }),
      productoApi(vistas[0], {
        nombreCategoria: "Auriculares",
        caracteristicas: { drivers: "11 mm", microfonos: "3" },
      }),
    ]);
    expect(filas.map((fila) => fila.clave)).toEqual([
      "precio", "disponibilidad", "marca", "categoria",
      "tecnica:transductores", "tecnica:cancelacion_ruido", "tecnica:microfonos",
    ]);
    expect(filas.find((fila) => fila.clave === "tecnica:transductores")?.valores)
      .toEqual(["11 mm", "40 mm"]);
    expect(filas.find((fila) => fila.clave === "tecnica:cancelacion_ruido")?.valores)
      .toEqual([null, "No"]);
    expect(filas.find((fila) => fila.clave === "categoria")?.valores)
      .toEqual(["Auriculares", "Auriculares"]);
  });

  it("no inventa especificaciones del view model si no hay características reales", () => {
    const vista = crearVista();
    const filas = construirFilasComparacion([vista], [
      productoApi(vista, { caracteristicas: null, nombreCategoria: "Accesorios" }),
    ]);
    expect(filas.map((fila) => fila.clave)).toEqual([
      "precio", "disponibilidad", "marca", "categoria",
    ]);
    expect(filas.find((fila) => fila.clave === "categoria")?.valores).toEqual(["Accesorios"]);
    expect(construirFilasComparacion([], [])).toEqual([]);
  });
});

describe("generarRecomendacion", () => {
  it("pide al menos dos productos", () => {
    const resultado = generarRecomendacion([crearVista()], []);
    expect(resultado.idProducto).toBeNull();
    expect(resultado.mensaje).toMatch(/al menos dos/i);
  });

  it("prefiere un producto disponible frente a uno no disponible", () => {
    const resultado = generarRecomendacion([
      crearVista({ idProducto: 1, nombre: "No disponible", disponible: false }),
      crearVista({ idProducto: 2, nombre: "Disponible", disponible: true }),
    ], []);

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
    ], []);

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
    ], [{
      clave: "tecnica:ram",
      etiqueta: "Memoria RAM",
      valores: [null, "8 GB"],
      difiere: true,
    }]);

    expect(resultado.idProducto).toBe(2);
    expect(resultado.motivos.join(" ")).toMatch(/especificaciones/i);
  });

  it("no inventa un ganador cuando hay empate técnico", () => {
    const resultado = generarRecomendacion([
      crearVista({ idProducto: 1, nombre: "Uno" }),
      crearVista({ idProducto: 2, nombre: "Dos" }),
    ], []);

    expect(resultado.idProducto).toBeNull();
    expect(resultado.mensaje).toMatch(/empate/i);
  });

  it("no recomienda si ninguno tiene disponibilidad confirmada", () => {
    const resultado = generarRecomendacion([
      crearVista({ idProducto: 1, disponible: false }),
      crearVista({ idProducto: 2, disponible: false }),
    ], []);

    expect(resultado.idProducto).toBeNull();
    expect(resultado.mensaje).toMatch(/disponibilidad/i);
  });

  it("cuenta solo las filas técnicas vigentes, no las seis especificaciones del view model", () => {
    const resultado = generarRecomendacion([
      crearVista({ idProducto: 1, nombre: "Sin audio registrado" }),
      crearVista({ idProducto: 2, nombre: "Con audio registrado" }),
    ], [{
      clave: "tecnica:transductores",
      etiqueta: "Transductores / drivers",
      valores: [null, "40 mm"],
      difiere: true,
    }]);
    expect(resultado.idProducto).toBe(2);
    expect(resultado.motivos.join(" ")).toContain("1");
    expect(resultado.motivos.join(" ")).not.toContain("de 6");
  });

  it("cuenta puertos de audio pero no residuos de memoria o chipset al sugerir un producto", () => {
    const vistas = [crearVista({ idProducto: 1 }), crearVista({ idProducto: 2 })];
    const filas = construirFilasComparacion(vistas, [
      productoApi(vistas[0], {
        nombreCategoria: "Auriculares",
        caracteristicas: {
          drivers: "40 mm",
          memoria: "8 GB",
          secciones: [{ titulo: "CHIPSET & ARQUITECTURA", descripcion: "Snapdragon" }],
        },
      }),
      productoApi(vistas[1], {
        nombreCategoria: "Auriculares",
        caracteristicas: { drivers: "40 mm", puertos: "Jack 3.5 mm, USB-C" },
      }),
    ]);
    expect(filas.map((fila) => fila.clave)).toEqual([
      "precio", "disponibilidad", "marca", "categoria",
      "tecnica:transductores", "tecnica:puertos",
    ]);
    expect(generarRecomendacion(vistas, filas).idProducto).toBe(2);
  });
});
