import type { ProductoViewModel } from "@/data/productoViewModel";
import type { Producto } from "@/types/producto";
import { obtenerFilasTecnicasComparador } from "./especificacionesComparador";

export const CLAVE_COMPARADOR = "tecreview:comparador";
export const MAX_COMPARADOR = 4;

export interface ProductoComparable {
  idProducto: number;
  idCategoria: number;
}

export type ClaveFilaComparacion =
  | "precio"
  | "disponibilidad"
  | "marca"
  | "categoria"
  | `tecnica:${string}`;

export interface FilaComparacion {
  clave: ClaveFilaComparacion;
  etiqueta: string;
  valores: Array<string | null>;
  difiere: boolean;
}

export interface ResultadoRecomendacion {
  idProducto: number | null;
  nombre: string | null;
  motivos: string[];
  mensaje: string;
}

export interface ResultadoAgregarComparador {
  ids: number[];
  agregado: boolean;
  motivo:
    | "agregado"
    | "duplicado"
    | "lleno"
    | "invalido"
    | "categoria-incompatible"
    | "sin-validar";
}

/**
 * Normaliza una selección persistida: solo enteros positivos, sin duplicados
 * y con el máximo de productos permitido.
 */
export function normalizarIdsComparador(valor: unknown): number[] {
  if (!Array.isArray(valor)) return [];

  const vistos = new Set<number>();
  const ids: number[] = [];

  for (const item of valor) {
    const id =
      typeof item === "number"
        ? item
        : typeof item === "string" && item.trim().length > 0
          ? Number(item)
          : Number.NaN;

    if (!Number.isInteger(id) || id <= 0 || vistos.has(id)) continue;

    vistos.add(id);
    ids.push(id);

    if (ids.length === MAX_COMPARADOR) break;
  }

  return ids;
}

export function leerIdsComparador(
  storage: Pick<Storage, "getItem"> | null,
): number[] {
  if (!storage) return [];

  try {
    const crudo = storage.getItem(CLAVE_COMPARADOR);
    if (!crudo) return [];
    return normalizarIdsComparador(JSON.parse(crudo));
  } catch {
    return [];
  }
}

export function guardarIdsComparador(
  storage: Pick<Storage, "setItem"> | null,
  ids: number[],
): void {
  if (!storage) return;

  try {
    storage.setItem(
      CLAVE_COMPARADOR,
      JSON.stringify(normalizarIdsComparador(ids)),
    );
  } catch {
    // Si el almacenamiento no está disponible, la selección sigue en memoria.
  }
}

/**
 * Conserva la categoría real del primer producto válido, no la categoría
 * visual inferida de sus especificaciones. También depura selecciones antiguas.
 */
export function validarSeleccionComparador(
  ids: number[],
  catalogo: readonly ProductoComparable[],
): number[] {
  const porId = new Map(catalogo.map((producto) => [producto.idProducto, producto]));
  let idCategoria: number | null = null;

  return normalizarIdsComparador(ids).filter((id) => {
    const producto = porId.get(id);
    if (!producto || !Number.isInteger(producto.idCategoria) || producto.idCategoria <= 0) {
      return false;
    }
    idCategoria ??= producto.idCategoria;
    return producto.idCategoria === idCategoria;
  });
}

export function agregarIdComparador(
  ids: number[],
  id: number,
  catalogo: readonly ProductoComparable[],
): ResultadoAgregarComparador {
  const actuales = validarSeleccionComparador(ids, catalogo);

  if (validarSeleccionComparador([id], catalogo).length === 0) {
    return { ids: actuales, agregado: false, motivo: "invalido" };
  }

  if (actuales.includes(id)) {
    return { ids: actuales, agregado: false, motivo: "duplicado" };
  }

  const primero = catalogo.find((producto) => producto.idProducto === actuales[0]);
  const candidato = catalogo.find((producto) => producto.idProducto === id);
  if (primero && candidato?.idCategoria !== primero.idCategoria) {
    return { ids: actuales, agregado: false, motivo: "categoria-incompatible" };
  }

  if (actuales.length >= MAX_COMPARADOR) {
    return { ids: actuales, agregado: false, motivo: "lleno" };
  }

  return {
    ids: [...actuales, id],
    agregado: true,
    motivo: "agregado",
  };
}

export function quitarIdComparador(ids: number[], id: number): number[] {
  return normalizarIdsComparador(ids).filter((actual) => actual !== id);
}

function hayDiferencia(valores: Array<string | null>): boolean {
  return new Set(valores.map((valor) => valor ?? "\u0000")).size > 1;
}

function fila(
  clave: ClaveFilaComparacion,
  etiqueta: string,
  valores: Array<string | null>,
): FilaComparacion {
  return { clave, etiqueta, valores, difiere: hayDiferencia(valores) };
}

export function construirFilasComparacion(
  productos: ProductoViewModel[],
  catalogo: readonly Producto[],
): FilaComparacion[] {
  if (productos.length === 0) return [];
  const porId = new Map(catalogo.map((producto) => [producto.idProducto, producto]));
  const seleccion = productos.map((producto) => porId.get(producto.idProducto));
  const especificaciones = obtenerFilasTecnicasComparador(seleccion);

  return [
    fila(
      "precio",
      "Precio de referencia",
      productos.map((producto) =>
        producto.precioCOP > 0 ? producto.precioFormateado : null,
      ),
    ),
    fila(
      "disponibilidad",
      "Disponibilidad",
      productos.map((producto) =>
        producto.disponible ? "Disponible" : "No disponible",
      ),
    ),
    fila(
      "marca",
      "Marca",
      productos.map((producto) => producto.marca || null),
    ),
    fila(
      "categoria",
      "Categoría",
      seleccion.map((producto) => producto
        ? producto.nombreCategoria?.trim() || `Categoría #${producto.idCategoria}`
        : null),
    ),
    ...especificaciones.map(({ clave, etiqueta, valores }) =>
      fila(`tecnica:${clave}`, etiqueta, valores),
    ),
  ];
}

function contarEspecificaciones(filas: FilaComparacion[], indice: number): number {
  return filas.filter(
    (fila) => fila.clave.startsWith("tecnica:") && fila.valores[indice] != null,
  ).length;
}

/**
 * Genera una sugerencia informativa usando solo datos reales:
 * disponibilidad, precio de referencia y cantidad de especificaciones.
 * Nunca declara un ganador absoluto ni inventa una calificación editorial.
 */
export function generarRecomendacion(
  productos: ProductoViewModel[],
  filas: FilaComparacion[],
): ResultadoRecomendacion {
  if (productos.length < 2) {
    return {
      idProducto: null,
      nombre: null,
      motivos: [],
      mensaje: "Agrega al menos dos productos para generar una recomendación.",
    };
  }

  const disponibles = productos.filter((producto) => producto.disponible);

  if (disponibles.length === 0) {
    return {
      idProducto: null,
      nombre: null,
      motivos: [],
      mensaje:
        "Ninguno de los productos seleccionados tiene disponibilidad confirmada; no es posible recomendar uno.",
    };
  }

  let candidatos = disponibles;
  const motivos: string[] = [];

  motivos.push(
    disponibles.length < productos.length
      ? "Tiene disponibilidad confirmada y se descartaron los productos no disponibles."
      : "Tiene disponibilidad confirmada.",
  );

  if (
    candidatos.length > 1 &&
    candidatos.every((producto) => producto.precioCOP > 0)
  ) {
    const menorPrecio = Math.min(
      ...candidatos.map((producto) => producto.precioCOP),
    );
    const masBaratos = candidatos.filter(
      (producto) => producto.precioCOP === menorPrecio,
    );

    if (masBaratos.length < candidatos.length) {
      candidatos = masBaratos;
      motivos.push(
        `Su precio de referencia es el más bajo entre los candidatos (${candidatos[0].precioFormateado}).`,
      );
    }
  }

  if (candidatos.length > 1) {
    const cantidades = new Map(productos.map((producto, indice) => [
      producto.idProducto,
      contarEspecificaciones(filas, indice),
    ]));
    const mayorCantidad = Math.max(
      ...candidatos.map((producto) => cantidades.get(producto.idProducto) ?? 0),
    );
    const masCompletos = candidatos.filter(
      (producto) => cantidades.get(producto.idProducto) === mayorCantidad,
    );

    if (masCompletos.length < candidatos.length) {
      candidatos = masCompletos;
      motivos.push(
        `Registra más especificaciones de la comparación (${mayorCantidad}).`,
      );
    }
  }

  if (candidatos.length !== 1) {
    return {
      idProducto: null,
      nombre: null,
      motivos,
      mensaje:
        "Hay un empate técnico con los datos disponibles; revisa la tabla antes de decidir.",
    };
  }

  return {
    idProducto: candidatos[0].idProducto,
    nombre: candidatos[0].nombre,
    motivos,
    mensaje: "Sugerencia basada en los datos disponibles.",
  };
}
