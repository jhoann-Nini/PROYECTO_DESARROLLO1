import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { normalizarDatosFichaTecnica } from "@/data/fichaTecnica";
import type { ProductoViewModel } from "@/data/productoViewModel";
import type { Producto } from "@/types/producto";
import type { DatosFichaTecnicaV3, ValorFichaV3 } from "@/types/fichaTecnicaV3";
import {
  MAX_COMPARADOR,
  agregarIdComparador,
  construirFilasComparacion,
  generarInsignias,
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

describe("comparación V3", () => {
  const vector = (JSON.parse(readFileSync(resolve(process.cwd(), "../fixtures/ficha-tecnica-v3/conformance-cases.json"), "utf8")) as Array<{ id: string; input: Record<string, unknown> }>).find((item) => item.id === "v3_valid")!.input;
  const viewV3 = (id: number, valor: number): ProductoViewModel => {
    const ficha = structuredClone(vector) as unknown as DatosFichaTecnicaV3;
    const primera = ficha.especificaciones[0];
    if (!primera || primera.normalizacion.estado !== "normalizada" || primera.normalizacion.valor.tipo !== "magnitud") throw new Error("El fixture compartido no contiene una magnitud normalizada.");
    primera.normalizacion.valor.valor = valor;
    return crearVista({ idProducto: id, nombre: `Producto ${id}`, fichaTecnica: { version: "v3", estado: "valida", original: ficha as unknown as Record<string, unknown>, ficha } });
  };
  const viewV3Estructural = (id: number, valor: ValorFichaV3): ProductoViewModel => {
    const ficha = structuredClone(vector) as unknown as DatosFichaTecnicaV3;
    const primera = ficha.especificaciones[0];
    if (!primera) throw new Error("El fixture compartido no contiene una especificación.");
    primera.normalizacion = { estado: "normalizada", valor, regla_conversion_id: null, precision: null };
    primera.comparacion = { habilitada: true, id: "estructura", modo: "igualdad_estructural", unidad: null, direccion: "igualdad", objetivo: null, tolerancia: null };
    return crearVista({ idProducto: id, fichaTecnica: { version: "v3", estado: "valida", original: ficha as unknown as Record<string, unknown>, ficha } });
  };
  it("aplica la tolerancia explícita y no genera ganador global", () => {
    const productos = [viewV3(101, 5), viewV3(102, 5.05)];
    const filas = construirFilasComparacion(productos);
    const diagonal = filas.find((item) => item.clave === "tecnica:v3:display.diagonal");
    expect(diagonal?.difiere).toBe(false);
    expect(diagonal?.comparabilidad).toContain("tolerancia 0.1 in");
    const resultado = generarInsignias(productos, filas);
    // Dentro de la tolerancia empatan: no hay insignia exclusiva ni ganador global.
    expect(resultado.insignias.filter((i) => i.criterio.includes("Diagonal") || i.fuente.includes("V3"))).toEqual([]);
    expect(resultado).not.toHaveProperty("idProducto");
  });
  it("da una insignia V3 al producto que destaca fuera de la tolerancia, con dato y fuente", () => {
    const productos = [viewV3(131, 5), viewV3(132, 5.5)];
    const filas = construirFilasComparacion(productos);
    const diagonal = filas.find((item) => item.clave === "tecnica:v3:display.diagonal");
    expect(diagonal?.destacados).toEqual([1]);
    const insignia = generarInsignias(productos, filas).insignias.find((i) => i.fuente.includes("V3"));
    expect(insignia?.idsProductos).toEqual([132]);
    expect(insignia?.criterio).toContain(diagonal!.etiqueta);
    expect(insignia?.dato).toBe(diagonal!.valores[1]);
    expect(insignia?.fuente).toContain("mayor es mejor");
  });
  it("marca una diferencia fuera de la tolerancia y no mezcla fichas legacy", () => {
    const actual = viewV3(103, 5);
    const distinto = viewV3(104, 5.5);
    const legacy = crearVista({ idProducto: 105 });
    expect(construirFilasComparacion([actual, distinto]).find((item) => item.clave === "tecnica:v3:display.diagonal")?.difiere).toBe(true);
    expect(construirFilasComparacion([actual, legacy]).find((item) => item.clave === "tecnica:v3:display.diagonal")?.comparabilidad).toContain("No comparable");
  });

  it("mantiene claves distintas en selecciones mixtas aunque las claves de atributo coincidan", () => {
    const v3 = viewV3(111, 5);
    const spec = v3.fichaTecnica;
    if (spec?.version !== "v3" || spec.estado !== "valida") throw new Error("La ficha de prueba no es V3 válida.");
    spec.ficha.especificaciones[0].clave = "ram";
    spec.ficha.especificaciones[0].nombre = "RAM estructurada";
    const legacy = crearVista({ idProducto: 112, nombre: "Legacy" });
    const rows = construirFilasComparacion([v3, legacy], [
      productoApi(v3, { caracteristicas: spec.ficha as unknown as Record<string, unknown> }),
      productoApi(legacy, { caracteristicas: { ram: "8 GB" } }),
    ]);
    const ramRows = rows.filter((row) => row.clave.includes("ram"));
    expect(ramRows.map((row) => row.clave)).toEqual(["tecnica:ram", "tecnica:v3:ram"]);
    expect(new Set(ramRows.map((row) => row.clave)).size).toBe(2);
    spec.ficha.especificaciones[0].clave = "memoria_configurada";
    const differentKeys = construirFilasComparacion([v3, legacy], [
      productoApi(v3, { caracteristicas: spec.ficha as unknown as Record<string, unknown> }),
      productoApi(legacy, { caracteristicas: { ram: "8 GB" } }),
    ]);
    expect(differentKeys.map((row) => row.clave).filter((key) => key.includes("ram") || key.includes("memoria_configurada"))).toEqual([
      "tecnica:ram", "tecnica:v3:memoria_configurada",
    ]);
  });

  it.each([
    ["listas", { tipo: "lista", semantica: "secuencia", tipo_elemento: "texto", elementos: [{ tipo: "texto", valor: "A" }, { tipo: "texto", valor: "B" }] } as ValorFichaV3],
    ["conjuntos", { tipo: "lista", semantica: "conjunto", tipo_elemento: "numero", elementos: [{ tipo: "numero", valor: 1 }, { tipo: "numero", valor: 2 }] } as ValorFichaV3],
    ["compuestos", { tipo: "compuesto", componentes: [{ clave: "x", nombre: "X", valor: { tipo: "texto", valor: "1" } }, { clave: "y", nombre: "Y", valor: { tipo: "booleano", valor: true } }] } as ValorFichaV3],
    ["dimensiones", { tipo: "dimensiones", ejes: [{ eje: "alto", magnitud: { valor: 10, unidad: "mm" } }, { eje: "ancho", magnitud: { valor: 20, unidad: "mm" } }] } as ValorFichaV3],
    ["resoluciones", { tipo: "resolucion", ancho: 1920, alto: 1080, unidad: "px" } as ValorFichaV3],
  ])("compara igualdad estructural de %s sin convertirlas a números", (_tipo, valor) => {
    const a = viewV3Estructural(121, valor);
    const b = viewV3Estructural(122, structuredClone(valor));
    const row = construirFilasComparacion([a, b]).find((item) => item.clave === "tecnica:v3:display.diagonal");
    expect(row?.difiere).toBe(false);
    expect(row?.comparabilidad?.toLowerCase()).toContain("igualdad estructural");
  });

  it("ignora el orden de propiedades, pero conserva diferencias estructurales reales", () => {
    const compuestoA: ValorFichaV3 = { tipo: "compuesto", componentes: [{ clave: "x", nombre: "X", valor: { tipo: "texto", valor: "dato" } }] };
    const compuestoB = { tipo: "compuesto", componentes: [{ valor: { valor: "dato", tipo: "texto" }, nombre: "X", clave: "x" }] } as unknown as ValorFichaV3;
    const mismaEstructura = construirFilasComparacion([viewV3Estructural(123, compuestoA), viewV3Estructural(124, compuestoB)])
      .find((item) => item.clave === "tecnica:v3:display.diagonal");
    expect(mismaEstructura?.difiere).toBe(false);
    const listaA: ValorFichaV3 = { tipo: "lista", semantica: "secuencia", tipo_elemento: "numero", elementos: [{ tipo: "numero", valor: 1 }, { tipo: "numero", valor: 2 }] };
    const listaB: ValorFichaV3 = { tipo: "lista", semantica: "secuencia", tipo_elemento: "numero", elementos: [{ tipo: "numero", valor: 1 }, { tipo: "numero", valor: 2.001 }] };
    const diferente = construirFilasComparacion([viewV3Estructural(125, listaA), viewV3Estructural(126, listaB)])
      .find((item) => item.clave === "tecnica:v3:display.diagonal");
    expect(diferente?.difiere).toBe(true);
  });

  it("no compara conflictos pendientes ni tolerancias incompatibles", () => {
    const pending = viewV3(131, 5);
    const other = viewV3(132, 6);
    if (pending.fichaTecnica?.version !== "v3" || pending.fichaTecnica.estado !== "valida") throw new Error("Ficha de prueba inesperada.");
    pending.fichaTecnica.ficha.especificaciones[0].revision_conflicto = { estado: "conflicto_pendiente", resuelto_en: null, resuelto_por: null, resolucion: null };
    const pendingRow = construirFilasComparacion([pending, other]).find((item) => item.clave === "tecnica:v3:display.diagonal");
    expect(pendingRow?.difiere).toBe(false);
    expect(pendingRow?.comparabilidad).toContain("conflictos");
    pending.fichaTecnica.ficha.especificaciones[0].revision_conflicto = { estado: "sin_conflicto", resuelto_en: null, resuelto_por: null, resolucion: null };
    pending.fichaTecnica.ficha.especificaciones[0].comparacion = { habilitada: true, id: "rule-diagonal", modo: "orden_numerico", unidad: "in", direccion: "mayor_es_mejor", objetivo: null, tolerancia: { valor: 0.1, unidad: "mm" } };
    const toleranceRow = construirFilasComparacion([pending, other]).find((item) => item.clave === "tecnica:v3:display.diagonal");
    expect(toleranceRow?.difiere).toBe(false);
    expect(toleranceRow?.comparabilidad).toContain("tolerancia no es válida");
  });

  it("no usa evidencia de otra variante para habilitar la comparación", () => {
    const actual = viewV3(141, 5);
    const other = viewV3(142, 6);
    if (actual.fichaTecnica?.version !== "v3" || actual.fichaTecnica.estado !== "valida") throw new Error("Ficha de prueba inesperada.");
    actual.fichaTecnica.ficha.variantes.push({ id: "var-2", modelo: "Otra variante", sku: null, mercado: null, identificadores: {} });
    actual.fichaTecnica.ficha.evidencias[0].alcance = { tipo: "variante", variante_id: "var-2" };
    const row = construirFilasComparacion([actual, other], [], { 141: "var-1" }).find((item) => item.clave === "tecnica:v3:display.diagonal");
    expect(row?.difiere).toBe(false);
    expect(row?.comparabilidad).toContain("no cubre la variante");
  });

  it("compara solo la variante elegida y deja sus métricas fuera hasta seleccionarla", () => {
    const multi = viewV3(151, 5);
    const multiState = multi.fichaTecnica;
    if (multiState?.version !== "v3" || multiState.estado !== "valida") throw new Error("Ficha V3 de prueba inesperada.");
    multiState.ficha.variantes.push({ id: "var-2", modelo: "Otra variante", sku: null, mercado: null, identificadores: {} });
    const otraEspecificacion = structuredClone(multiState.ficha.especificaciones[0]);
    if (otraEspecificacion.normalizacion.estado !== "normalizada") throw new Error("La especificación de prueba no está normalizada.");
    otraEspecificacion.id = "display.diagonal.var-2";
    otraEspecificacion.variante_id = "var-2";
    otraEspecificacion.evidencia_ids = [];
    otraEspecificacion.normalizacion = { estado: "normalizada", valor: { tipo: "magnitud", valor: 9, unidad: "in" }, regla_conversion_id: null, precision: null };
    otraEspecificacion.verificacion = { estado: "pendiente", verificado_en: null, verificado_por: null, evento_auditoria_id: null, motivo_revision: null };
    multiState.ficha.especificaciones.push({
      ...otraEspecificacion,
    });
    const other = viewV3(152, 7);
    const unspecified = construirFilasComparacion([multi, other]).find((row) => row.clave === "tecnica:v3:display.diagonal");
    expect(unspecified?.valores[0]).toContain("sin variante seleccionada");
    const selected = construirFilasComparacion([multi, other], [], { 151: "var-2" }).find((row) => row.clave === "tecnica:v3:display.diagonal");
    expect(selected?.valores[0]).toBe("9 in");
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
        disponibilidadConsultada: true,
        numeroTiendas: 0,
        especificaciones: {
          ...crearVista().especificaciones,
          pantalla: "6.7'' AMOLED",
        },
      }),
    ];
    vistas[0] = { ...vistas[0], disponibilidadConsultada: true, numeroTiendas: 2 };
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
    // Fase 4 (H-04): la disponibilidad sale de las ofertas, no del estado del producto.
    expect(porClave.get("disponibilidad")?.valores).toEqual([
      "Disponible en 2 tiendas",
      "Sin tiendas registradas",
    ]);
  });

  it("muestra la disponibilidad sin confirmar si no se consultaron las ofertas", () => {
    const vistas = [crearVista(), crearVista({ idProducto: 2, disponible: false })];
    const filas = construirFilasComparacion(vistas, vistas.map((vista) => productoApi(vista)));
    const disponibilidad = filas.find((fila) => fila.clave === "disponibilidad");
    expect(disponibilidad?.valores).toEqual(["Disponibilidad sin confirmar", "Disponibilidad sin confirmar"]);
    expect(disponibilidad?.difiere).toBe(false);
  });

  it("agrega la fila de menor precio en tiendas solo si algún producto tiene ofertas", () => {
    const sinOfertas = [crearVista(), crearVista({ idProducto: 2 })];
    expect(construirFilasComparacion(sinOfertas, sinOfertas.map((v) => productoApi(v)))
      .some((fila) => fila.clave === "precio-tiendas")).toBe(false);

    const conOfertas = [
      crearVista({ disponibilidadConsultada: true, numeroTiendas: 2, precioDesdeCOP: 950_000 }),
      crearVista({ idProducto: 2, disponibilidadConsultada: true, numeroTiendas: 0, precioDesdeCOP: null }),
    ];
    const fila = construirFilasComparacion(conOfertas, conOfertas.map((v) => productoApi(v)))
      .find((item) => item.clave === "precio-tiendas");
    expect(fila?.etiqueta).toBe("Menor precio en tiendas");
    expect(fila?.valores[0]).toMatch(/950\.000/);
    expect(fila?.valores[1]).toBeNull();
  });

  it("compara los textos legacy sin distinguir mayúsculas ni espacios", () => {
    const vistas = [crearVista(), crearVista({ idProducto: 2 })];
    const filas = construirFilasComparacion(vistas, [
      productoApi(vistas[0], { caracteristicas: { ram: "8 GB" } }),
      productoApi(vistas[1], { caracteristicas: { ram: "8gb" } }),
    ]);
    const ram = filas.find((fila) => fila.clave === "tecnica:ram");
    expect(ram?.valores).toEqual(["8 GB", "8gb"]);
    expect(ram?.difiere).toBe(false);
  });

  it("usa null cuando falta un dato y marca la fila incompleta, no distinta", () => {
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
    expect(pantalla?.difiere).toBe(false);
    expect(pantalla?.incompleta).toBe(true);
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

describe("generarInsignias (Fase 4, H-10)", () => {
  it("pide al menos dos productos", () => {
    const resultado = generarInsignias([crearVista()], []);
    expect(resultado.insignias).toEqual([]);
    expect(resultado.mensaje).toMatch(/al menos dos/i);
  });

  it("requiere productos de la misma categoría", () => {
    const resultado = generarInsignias([
      crearVista(),
      crearVista({ idProducto: 2, categoria: "tablets" }),
    ], []);
    expect(resultado.insignias).toEqual([]);
    expect(resultado.mensaje).toMatch(/misma categoría/i);
  });

  it("nunca declara un ganador global", () => {
    const resultado = generarInsignias([
      crearVista({ idProducto: 1, precioCOP: 900_000, precioFormateado: "$ 900.000 COP" }),
      crearVista({ idProducto: 2 }),
    ], []);
    expect(resultado).not.toHaveProperty("idProducto");
    expect(resultado.mensaje).toMatch(/no hay un ganador global/i);
  });

  it("da la insignia de menor precio de referencia con su dato y su fuente", () => {
    const resultado = generarInsignias([
      crearVista({ idProducto: 1, nombre: "Económico", precioCOP: 900_000, precioFormateado: "$ 900.000 COP" }),
      crearVista({ idProducto: 2, nombre: "Costoso", precioCOP: 2_500_000, precioFormateado: "$ 2.500.000 COP" }),
    ], []);
    const insignia = resultado.insignias.find((i) => i.criterio === "Menor precio de referencia");
    expect(insignia?.idsProductos).toEqual([1]);
    expect(insignia?.nombres).toEqual(["Económico"]);
    expect(insignia?.dato).toBe("$ 900.000 COP");
    expect(insignia?.fuente).toMatch(/precio de referencia/i);
  });

  it("no compara precios si a un producto le falta el precio y lo explica", () => {
    const resultado = generarInsignias([
      crearVista({ idProducto: 1, nombre: "Sin precio", precioCOP: 0, precioFormateado: "Consultar disponibilidad" }),
      crearVista({ idProducto: 2, nombre: "Con precio", precioCOP: 3_000_000, precioFormateado: "$ 3.000.000 COP" }),
    ], []);
    expect(resultado.insignias.some((i) => i.criterio === "Menor precio de referencia")).toBe(false);
    expect(resultado.notas.join(" ")).toMatch(/Sin precio de referencia registrado: Sin precio/);
  });

  it("no da insignia de precio cuando hay empate", () => {
    const resultado = generarInsignias([crearVista({ idProducto: 1 }), crearVista({ idProducto: 2 })], []);
    expect(resultado.insignias).toEqual([]);
    expect(resultado.mensaje).toMatch(/ningún producto destaca/i);
  });

  it("da las insignias de tiendas solo con disponibilidad consultada", () => {
    const resultado = generarInsignias([
      crearVista({ idProducto: 1, nombre: "Uno", disponibilidadConsultada: true, numeroTiendas: 3, precioDesdeCOP: 980_000, fechaPrecioTiendas: "2026-11-18T10:00:00" }),
      crearVista({ idProducto: 2, nombre: "Dos", disponibilidadConsultada: true, numeroTiendas: 1, precioDesdeCOP: 940_000, fechaPrecioTiendas: "2026-11-19T10:00:00" }),
    ], []);
    const masTiendas = resultado.insignias.find((i) => i.criterio === "Disponible en más tiendas");
    expect(masTiendas?.idsProductos).toEqual([1]);
    expect(masTiendas?.dato).toBe("3 tiendas");
    const menorTiendas = resultado.insignias.find((i) => i.criterio === "Menor precio en tiendas");
    expect(menorTiendas?.idsProductos).toEqual([2]);
    expect(menorTiendas?.dato).toMatch(/940\.000/);
    expect(menorTiendas?.fuente).toMatch(/actualizado el 19/);

    const sinConsulta = generarInsignias([
      crearVista({ idProducto: 1, numeroTiendas: 3 }),
      crearVista({ idProducto: 2, numeroTiendas: 1 }),
    ], []);
    expect(sinConsulta.insignias.some((i) => i.criterio.includes("tiendas"))).toBe(false);
    expect(sinConsulta.notas.join(" ")).toMatch(/no se pudo confirmar/i);
  });

  it("no da insignias por filas técnicas legacy y presenta la cantidad de datos solo como nota", () => {
    const resultado = generarInsignias([
      crearVista({ idProducto: 1, nombre: "Sin audio registrado" }),
      crearVista({ idProducto: 2, nombre: "Con audio registrado" }),
    ], [{
      clave: "tecnica:transductores",
      etiqueta: "Transductores / drivers",
      valores: [null, "40 mm"],
      difiere: false,
      incompleta: true,
    }]);
    expect(resultado.insignias).toEqual([]);
    expect(resultado.notas.join(" ")).toMatch(/informativo/i);
    expect(resultado.notas.join(" ")).toContain("Con audio registrado 1");
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
    expect(generarInsignias(vistas, filas).insignias).toEqual([]);
  });
});
