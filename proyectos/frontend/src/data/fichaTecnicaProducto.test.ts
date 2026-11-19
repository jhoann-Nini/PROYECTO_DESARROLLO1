import { describe, expect, it } from "vitest";
import type { Producto } from "@/types/producto";
import { categoriaFichaV3DesdeCategoriaProducto, categoriaProductoDesdeNombre, clasificarFichaTecnicaProducto } from "./fichaTecnicaProducto";
import { crearProductoViewModel } from "./productoViewModel";

const producto = (caracteristicas: Record<string, unknown> | null): Producto => ({
  idProducto: 4, nombre: "Equipo", nombreCategoria: "Móviles", idCategoria: 1,
  idMarca: 1, descripcion: null, imagen: null, precioReferencia: null,
  estado: true, caracteristicas,
});
const v3 = { version_esquema: 3, categoria: "celulares", variantes: [], especificaciones: [], fuentes: [], evidencias: [], benchmarks: [] };

describe("clasificarFichaTecnicaProducto", () => {
  it("reconoce V3 válido y conserva el objeto recibido", () => {
    const raw = { ...v3 };
    const estado = clasificarFichaTecnicaProducto(producto(raw));
    expect(estado.version).toBe("v3");
    expect(estado.estado).toBe("valida");
    if (estado.version === "v3" && estado.estado === "valida") expect(estado.original).toBe(raw);
  });
  it("mantiene un V3 inválido en error sin degradarlo a legacy", () => {
    const estado = clasificarFichaTecnicaProducto(producto({ ...v3, categoria: "Smartwatch" }));
    expect(estado.version).toBe("v3");
    expect(estado.estado).toBe("invalida");
  });
  it("rechaza marcadores V3 incompletos como V3 inválido", () => {
    const estado = clasificarFichaTecnicaProducto(producto({ version_esquema: 3, especificaciones: [] }));
    expect(estado.version).toBe("v3");
    expect(estado.estado).toBe("invalida");
  });
  it("conserva compatibilidad con V2 y legacy", () => {
    expect(clasificarFichaTecnicaProducto(producto({ version_esquema: 2, categoria: "celulares", atributos: [] })).version).toBe("v2");
    expect(clasificarFichaTecnicaProducto(producto({ pantalla: "OLED" })).version).toBe("legacy");
    expect(clasificarFichaTecnicaProducto(producto(null)).version).toBe("legacy");
  });
  it("no expone V3 por los campos V1/V2 del view model", () => {
    const view = crearProductoViewModel(producto(v3));
    expect(view.fichaTecnica?.version).toBe("v3");
    expect(view.fichaTecnicaV2).toBeUndefined();
    expect(view.datosFichaTecnica.metricasComparables).toEqual([]);
  });
  it("mapea categorías conocidas sin ambigüedad y avisa ante discrepancia o categoría desconocida", () => {
    const coincidente = clasificarFichaTecnicaProducto(producto(v3));
    expect(coincidente.version === "v3" && coincidente.estado === "valida" ? coincidente.advertenciaCategoria : "unexpected").toBeUndefined();
    const distinta = clasificarFichaTecnicaProducto(producto(v3), { categoriaProducto: "tablets" });
    expect(distinta.version === "v3" && distinta.estado === "valida" ? distinta.advertenciaCategoria : "unexpected").toContain("no coincide");
    const sinCategoriaCatalogo = clasificarFichaTecnicaProducto(producto({ ...v3, categoria: "auriculares" }), { categoriaProducto: null });
    expect(sinCategoriaCatalogo.version === "v3" && sinCategoriaCatalogo.estado === "valida" ? sinCategoriaCatalogo.advertenciaCategoria : "unexpected").toContain("No se pudo identificar");
  });
  it.each([
    ["moviles", "celulares", "Teléfonos / Celulares"],
    ["tablets", "tablets", "Tablets"],
    ["laptops", "portatiles", "Portátiles"],
    ["auriculares", "auriculares", "Auriculares"],
  ] as const)("mapea categoría del catálogo %s ↔ V3 %s", (catalogo, v3Category, nombre) => {
    expect(categoriaFichaV3DesdeCategoriaProducto(catalogo)).toBe(v3Category);
    expect(categoriaProductoDesdeNombre(nombre)).toBe(catalogo);
  });
  it("no asigna categoría V3 a Smartwatch o Accesorios", () => {
    expect(categoriaProductoDesdeNombre("Smartwatch")).toBeNull();
    expect(categoriaProductoDesdeNombre("Accesorios")).toBeNull();
  });
  it("avisa si el producto no trae una categoría de catálogo para contrastar", () => {
    const sinNombreCategoria = { ...producto(v3), nombreCategoria: undefined };
    const estado = clasificarFichaTecnicaProducto(sinNombreCategoria);
    expect(estado.version === "v3" && estado.estado === "valida" ? estado.advertenciaCategoria : "unexpected").toContain("No se pudo identificar");
  });
});
