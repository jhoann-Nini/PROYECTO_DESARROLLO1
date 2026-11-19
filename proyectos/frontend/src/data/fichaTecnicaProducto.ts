import type { Producto } from "@/types/producto";
import type { FichaTecnicaV2 } from "@/types/fichaTecnica";
import type { IdProductoGlobal } from "./identificadores";
import { normalizarDesdeProducto } from "./normalizadorFicha";
import type { CategoriaFichaTecnica } from "@/types/fichaTecnica";
import type { CategoriaDispositivo } from "@/types/producto";
import { obtenerSlugDeCategoria } from "@/lib/categorias";
import {
  despacharFichaTecnica,
  esDatosFichaTecnicaV3,
  tieneMarcadoresV3,
  type DatosFichaTecnicaV3,
} from "@/types/fichaTecnicaV3";

export type EstadoFichaTecnicaProducto =
  | { version: "v3"; estado: "valida"; original: Record<string, unknown>; ficha: DatosFichaTecnicaV3; advertenciaCategoria?: string }
  | { version: "v3"; estado: "invalida"; original: unknown; errores: string[] }
  | { version: "v1" | "v2" | "legacy"; estado: "valida"; original: unknown; fichaV2: FichaTecnicaV2 }
  | { version: "v1" | "v2" | "legacy"; estado: "invalida"; original: unknown; errores: string[] }
  | { version: "error"; estado: "invalida"; original: unknown; errores: string[] };

export interface ContextoFichaTecnicaProducto {
  categoriaPorDefecto?: CategoriaFichaTecnica;
  categoriaProducto?: CategoriaDispositivo | null;
  idGlobal?: IdProductoGlobal;
}

export function categoriaFichaV3DesdeCategoriaProducto(categoria: CategoriaDispositivo): DatosFichaTecnicaV3["categoria"] {
  switch (categoria) {
    case "moviles": return "celulares";
    case "laptops": return "portatiles";
    case "tablets": return "tablets";
    case "auriculares": return "auriculares";
  }
}

export function categoriaProductoDesdeNombre(nombre: string): CategoriaDispositivo | null {
  const slug = obtenerSlugDeCategoria(nombre);
  if (slug === "celulares") return "moviles";
  if (slug === "portatiles") return "laptops";
  if (slug === "tablets" || slug === "auriculares") return slug;
  return null;
}

function categoriaFichaV3DesdeNombre(nombre: string): DatosFichaTecnicaV3["categoria"] | null {
  const categoria = categoriaProductoDesdeNombre(nombre);
  return categoria ? categoriaFichaV3DesdeCategoriaProducto(categoria) : null;
}

/**
 * Despacha una ficha una sola vez por version_esquema y conserva el JSON recibido.
 * V3 siempre se valida de forma estricta y nunca pasa por los normalizadores V1/V2.
 */
export function clasificarFichaTecnicaProducto(
  producto: Producto,
  contexto: ContextoFichaTecnicaProducto = {},
): EstadoFichaTecnicaProducto {
  const original = producto.caracteristicas ?? null;
  const despacho = despacharFichaTecnica(original);

  if (despacho.ruta === "v3") {
    if (!esDatosFichaTecnicaV3(original)) {
      return {
        version: "v3",
        estado: "invalida",
        original,
        errores: ["La ficha declara V3 pero no supera la validación del contrato."],
      };
    }
    const categoriaEsperada = contexto.categoriaProducto !== undefined
      ? contexto.categoriaProducto === null ? null : categoriaFichaV3DesdeCategoriaProducto(contexto.categoriaProducto)
      : producto.nombreCategoria?.trim() ? categoriaFichaV3DesdeNombre(producto.nombreCategoria) : null;
    const advertenciaCategoria = categoriaEsperada === null
        ? "No se pudo identificar la categoría del catálogo para contrastarla con la ficha V3."
        : categoriaEsperada !== original.categoria
          ? `La categoría de la ficha (${original.categoria}) no coincide con la categoría del producto (${categoriaEsperada}). La ficha se conserva bajo su categoría declarada.`
          : undefined;
    return { version: "v3", estado: "valida", original, ficha: original, ...(advertenciaCategoria ? { advertenciaCategoria } : {}) };
  }

  if (despacho.ruta === "error") {
    const esV3 = (typeof original === "object" && original !== null && !Array.isArray(original)
      && (original as Record<string, unknown>).version_esquema === 3) || tieneMarcadoresV3(original);
    return {
      version: esV3 ? "v3" : "error",
      estado: "invalida",
      original,
      errores: despacho.errores,
    };
  }

  const version = despacho.ruta;
  try {
    const fichaV2 = normalizarDesdeProducto(producto, {
      categoriaPorDefecto: contexto.categoriaPorDefecto,
      idGlobal: contexto.idGlobal,
    });
    return {
      version: version === "v1" ? "v1" : version === "v2" ? "v2" : "legacy",
      estado: "valida",
      original,
      fichaV2,
    };
  } catch (error) {
    return {
      version: version === "v1" ? "v1" : version === "v2" ? "v2" : "legacy",
      estado: "invalida",
      original,
      errores: [error instanceof Error ? error.message : "No se pudo interpretar la ficha técnica."],
    };
  }
}

export function formatearValorFichaV3(valor: DatosFichaTecnicaV3["especificaciones"][number]["normalizacion"]["valor"]): string {
  if (valor === null) return "Sin valor normalizado";
  switch (valor.tipo) {
    case "texto": return valor.valor;
    case "numero": return String(valor.valor);
    case "booleano": return valor.valor ? "Sí" : "No";
    case "magnitud": return `${valor.valor} ${valor.unidad}`;
    case "lista": return valor.elementos.map((item) => {
      switch (item.tipo) {
        case "texto": return item.valor;
        case "numero": return String(item.valor);
        case "booleano": return item.valor ? "Sí" : "No";
        case "magnitud": return `${item.valor} ${item.unidad}`;
      }
    }).join(valor.semantica === "secuencia" ? " · " : ", ");
    case "dimensiones": return valor.ejes.map((eje) =>
      `${eje.eje === "otro" ? eje.nombre_eje : eje.eje}: ${eje.magnitud.valor} ${eje.magnitud.unidad}`,
    ).join(" · ");
    case "resolucion": return `${valor.ancho} × ${valor.alto} ${valor.unidad}`;
    case "rango": return `${valor.minimo.valor}–${valor.maximo.valor} ${valor.minimo.unidad}`;
    case "compuesto": return valor.componentes.map((componente) =>
      `${componente.nombre}: ${formatearValorFichaV3(componente.valor)}`,
    ).join(" · ");
  }
}
