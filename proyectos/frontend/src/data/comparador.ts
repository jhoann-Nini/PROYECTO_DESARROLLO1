import type { ProductoViewModel } from "@/data/productoViewModel";

export const CLAVE_COMPARADOR = "tecreview:comparador";
export const MAX_COMPARADOR = 4;

export type ClaveFilaComparacion =
  | "precio"
  | "disponibilidad"
  | "marca"
  | "categoria"
  | "pantalla"
  | "procesador"
  | "ram"
  | "almacenamiento"
  | "camaras"
  | "bateria";

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
  motivo: "agregado" | "duplicado" | "lleno" | "invalido";
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

export function agregarIdComparador(
  ids: number[],
  id: number,
): ResultadoAgregarComparador {
  const actuales = normalizarIdsComparador(ids);

  if (!Number.isInteger(id) || id <= 0) {
    return { ids: actuales, agregado: false, motivo: "invalido" };
  }

  if (actuales.includes(id)) {
    return { ids: actuales, agregado: false, motivo: "duplicado" };
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
): FilaComparacion[] {
  const especificaciones: Array<{
    clave: ClaveFilaComparacion;
    etiqueta: string;
    campo: keyof ProductoViewModel["especificaciones"];
  }> = [
    { clave: "pantalla", etiqueta: "Pantalla", campo: "pantalla" },
    { clave: "procesador", etiqueta: "Procesador", campo: "procesador" },
    { clave: "ram", etiqueta: "Memoria RAM", campo: "ram" },
    {
      clave: "almacenamiento",
      etiqueta: "Almacenamiento",
      campo: "almacenamiento",
    },
    { clave: "camaras", etiqueta: "Cámaras", campo: "camaras" },
    { clave: "bateria", etiqueta: "Batería", campo: "bateria" },
  ];

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
      productos.map((producto) => producto.categoriaEtiqueta || null),
    ),
    ...especificaciones.map(({ clave, etiqueta, campo }) =>
      fila(
        clave,
        etiqueta,
        productos.map(
          (producto) => producto.especificaciones[campo] ?? null,
        ),
      ),
    ),
  ];
}

function contarEspecificaciones(producto: ProductoViewModel): number {
  return Object.values(producto.especificaciones).filter(
    (valor): valor is string => Boolean(valor),
  ).length;
}

/**
 * Genera una sugerencia informativa usando solo datos reales:
 * disponibilidad, precio de referencia y cantidad de especificaciones.
 * Nunca declara un ganador absoluto ni inventa una calificación editorial.
 */
export function generarRecomendacion(
  productos: ProductoViewModel[],
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
    const mayorCantidad = Math.max(
      ...candidatos.map((producto) => contarEspecificaciones(producto)),
    );
    const masCompletos = candidatos.filter(
      (producto) => contarEspecificaciones(producto) === mayorCantidad,
    );

    if (masCompletos.length < candidatos.length) {
      candidatos = masCompletos;
      motivos.push(
        `Registra más especificaciones completas (${mayorCantidad} de 6).`,
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
