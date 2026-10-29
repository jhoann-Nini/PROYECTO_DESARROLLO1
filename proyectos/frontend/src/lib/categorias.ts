import type { CategoriaResponse } from "@/types/producto";

/**
 * Definición de las categorías navegables del catálogo.
 *
 * `palabrasClave` se compara contra el nombre real que devuelve
 * `GET /api/categorias`, nunca contra IDs fijos: los identificadores de la
 * base de datos pueden cambiar entre entornos.
 */
export interface CategoriaNavegableDefinicion {
  slug: string;
  etiqueta: string;
  icono: string;
  descripcion: string;
  palabrasClave: readonly string[];
}

export const CATEGORIAS_NAVEGABLES = [
  {
    slug: "celulares",
    etiqueta: "Teléfonos / Celulares",
    icono: "📱",
    descripcion:
      "Smartphones y teléfonos móviles disponibles en el catálogo, con sus precios de referencia y ficha técnica.",
    palabrasClave: ["celular", "movil", "telefono", "smartphone", "phone"],
  },
  {
    slug: "tablets",
    etiqueta: "Tablets",
    icono: "📲",
    descripcion:
      "Tabletas y dispositivos táctiles registrados por las marcas del catálogo.",
    palabrasClave: ["tablet", "tabla"],
  },
  {
    slug: "portatiles",
    etiqueta: "Portátiles / PC",
    icono: "💻",
    descripcion:
      "Computadores portátiles, equipos de escritorio y notebooks del catálogo.",
    palabrasClave: [
      "laptop",
      "portatil",
      "computador",
      "computadora",
      "notebook",
      "pc",
    ],
  },
  {
    slug: "auriculares",
    etiqueta: "Auriculares",
    icono: "🎧",
    descripcion:
      "Auriculares, audífonos y equipos de audio registrados en el catálogo.",
    palabrasClave: ["auricular", "audifono", "audio", "headphone", "earbud"],
  },
] as const satisfies readonly CategoriaNavegableDefinicion[];

export type CategoriaSlug = (typeof CATEGORIAS_NAVEGABLES)[number]["slug"];

export interface ResolucionCategoria {
  definicion: (typeof CATEGORIAS_NAVEGABLES)[number];
  categorias: CategoriaResponse[];
}

/**
 * Normaliza un texto para compararlo sin depender de tildes, mayúsculas
 * ni espacios extra.
 */
export function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function esSlugCategoria(slug: string): slug is CategoriaSlug {
  return CATEGORIAS_NAVEGABLES.some((definicion) => definicion.slug === slug);
}

export function obtenerRutaCategoria(slug: string): string {
  return `/categorias/${slug}`;
}

function coincidePalabraClave(
  nombreCategoria: string,
  palabrasClave: readonly string[],
): boolean {
  const palabras = normalizarTexto(nombreCategoria)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

  return palabras.some((palabra) =>
    palabrasClave.some(
      (clave) => palabra === clave || palabra.startsWith(clave),
    ),
  );
}

/**
 * Determina a qué slug pertenece una categoría real. El orden de
 * `CATEGORIAS_NAVEGABLES` resuelve posibles ambigüedades y garantiza que
 * una misma categoría no aparezca en dos páginas distintas.
 */
export function obtenerSlugDeCategoria(
  nombreCategoria: string,
): CategoriaSlug | null {
  for (const definicion of CATEGORIAS_NAVEGABLES) {
    if (coincidePalabraClave(nombreCategoria, definicion.palabrasClave)) {
      return definicion.slug;
    }
  }

  return null;
}

/**
 * Resuelve el slug de la URL contra las categorías activas que devuelve la
 * API. Devuelve `null` si el slug no es navegable o si ninguna categoría
 * real coincide, para que la página muestre un estado de "no encontrada"
 * en lugar de inventar datos.
 */
export function resolverCategoriasPorSlug(
  categorias: readonly CategoriaResponse[],
  slug: string,
): ResolucionCategoria | null {
  if (!esSlugCategoria(slug)) {
    return null;
  }

  const definicion = CATEGORIAS_NAVEGABLES.find(
    (categoria) => categoria.slug === slug,
  );

  if (!definicion) {
    return null;
  }

  const coincidentes = categorias.filter(
    (categoria) =>
      categoria.estado !== false &&
      obtenerSlugDeCategoria(categoria.nombre) === slug,
  );

  if (coincidentes.length === 0) {
    return null;
  }

  return { definicion, categorias: coincidentes };
}
