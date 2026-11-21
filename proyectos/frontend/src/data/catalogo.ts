import type { CategoriaDispositivo } from "@/types/producto";
import { formatearCOP } from "./specsHelper";
import {
  ETIQUETAS_CATEGORIA,
  normalizarTexto,
  type CaracteristicaClave,
  type ProductoViewModel,
} from "./productoViewModel";

export interface FiltrosCatalogo {
  busqueda: string;
  categorias: CategoriaDispositivo[];
  marcas: string[];
  precioMin: number;
  precioMax: number;
  caracteristicas: CaracteristicaClave[];
  excluirMarcas?: boolean;
}

export interface RangoPrecio {
  min: number;
  max: number;
}

export interface OpcionConteo<T extends string> {
  valor: T;
  etiqueta: string;
  cantidad: number;
}

export interface CatalogoPreparado {
  productos: ProductoViewModel[];
  categorias: OpcionConteo<CategoriaDispositivo>[];
  marcas: { nombre: string; cantidad: number }[];
  caracteristicas: OpcionConteo<CaracteristicaClave>[];
  rangoPrecio: RangoPrecio;
}

export interface ChipFiltro {
  tipo: "busqueda" | "categoria" | "marca" | "precio" | "caracteristica";
  valor: string;
  etiqueta: string;
}

export interface Pagina<T> {
  items: T[];
  pagina: number;
  totalPaginas: number;
  total: number;
}

export type OrdenCatalogo =
  | "relevancia"
  | "menor-precio"
  | "mayor-precio"
  | "mejor-valorados";

export const ORDENES_CATALOGO: {
  valor: OrdenCatalogo;
  etiqueta: string;
}[] = [
  { valor: "relevancia", etiqueta: "Relevancia" },
  { valor: "menor-precio", etiqueta: "Menor precio" },
  { valor: "mayor-precio", etiqueta: "Mayor precio" },
  { valor: "mejor-valorados", etiqueta: "Mejor valorados" },
];

export const ETIQUETAS_CARACTERISTICA: Record<CaracteristicaClave, string> = {
  "5g": "5G",
  "buena-camara": "Buena cámara",
  "alto-rendimiento": "Alto rendimiento",
  "gran-bateria": "Gran batería",
};

const ORDEN_CATEGORIAS: CategoriaDispositivo[] = [
  "moviles",
  "laptops",
  "tablets",
  "auriculares",
];

const ORDEN_CARACTERISTICAS: CaracteristicaClave[] = [
  "5g",
  "buena-camara",
  "alto-rendimiento",
  "gran-bateria",
];

export function prepararCatalogo(
  productos: ProductoViewModel[]
): CatalogoPreparado {
  const categorias = ORDEN_CATEGORIAS.map((categoria) => ({
    valor: categoria,
    etiqueta: ETIQUETAS_CATEGORIA[categoria],
    cantidad: productos.filter(
      (producto) => producto.categoria === categoria
    ).length,
  }));

  const conteoMarcas = new Map<string, number>();
  for (const producto of productos) {
    conteoMarcas.set(
      producto.marca,
      (conteoMarcas.get(producto.marca) ?? 0) + 1
    );
  }

  const marcas = [...conteoMarcas.entries()]
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort(
      (a, b) =>
        b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre, "es")
    );

  const caracteristicas = ORDEN_CARACTERISTICAS.map((caracteristica) => ({
    valor: caracteristica,
    etiqueta: ETIQUETAS_CARACTERISTICA[caracteristica],
    cantidad: productos.filter((producto) =>
      producto.caracteristicas.includes(caracteristica)
    ).length,
  }));

  const precios = productos
    .map((producto) => producto.precioCOP)
    .filter((precio) => precio > 0);

  const rangoPrecio =
    precios.length > 0
      ? { min: Math.min(...precios), max: Math.max(...precios) }
      : { min: 0, max: 0 };

  return {
    productos,
    categorias,
    marcas,
    caracteristicas,
    rangoPrecio,
  };
}

/**
 * El «+» forma parte del modelo («Galaxy Tab S10+» no es «Galaxy Tab S10
 * Ultra»): se convierte en «plus» pegado a la palabra anterior para no perderlo.
 */
function conservarPlus(texto: string): string {
  return texto.replace(/\s*\+/g, "plus");
}

/** Quita todo lo que no sea letra o dígito: «iPhone 16» → «iphone16». */
function compactar(texto: string): string {
  return conservarPlus(texto).replace(/[^a-z0-9]+/g, "");
}

/**
 * Palabras genéricas de tipo de dispositivo (ya normalizadas). Solas no
 * identifican un dispositivo; junto a otras palabras limitan la categoría.
 */
const PALABRAS_GENERICAS: Record<string, CategoriaDispositivo | null> = {
  telefono: "moviles", telefonos: "moviles", celular: "moviles", celulares: "moviles",
  movil: "moviles", moviles: "moviles", smartphone: "moviles", smartphones: "moviles",
  audifono: "auriculares", audifonos: "auriculares", auricular: "auriculares",
  auriculares: "auriculares", cascos: "auriculares", diadema: "auriculares",
  portatil: "laptops", portatiles: "laptops", laptop: "laptops", laptops: "laptops",
  computador: "laptops", computadores: "laptops", computadora: "laptops", computadoras: "laptops",
  pc: "laptops", pcs: "laptops",
  tablet: "tablets", tablets: "tablets", tableta: "tablets", tabletas: "tablets",
  dispositivo: null, dispositivos: null, equipo: null, equipos: null, producto: null, productos: null,
};

/** Palabras sin significado para identificar un dispositivo. */
const PALABRAS_VACIAS = new Set(["un", "una", "unos", "unas", "el", "la", "los", "las", "de", "del", "para", "con", "y", "o"]);

/*
 * Textos de los buscadores, definidos una sola vez para que la portada, la
 * barra superior y el catálogo digan lo mismo. Criterio: tuteo, imperativo,
 * comillas «», sin doble negación.
 */

/** Búsqueda solo con palabras genéricas («teléfono», «audífonos»). */
export const MENSAJE_BUSQUEDA_GENERICA = "Escribe la marca o el modelo del dispositivo.";

export function ayudaBusquedaGenerica(termino: string): string {
  return `«${termino.trim()}» es muy general. Prueba con «Samsung Galaxy S24» o «iPhone 16».`;
}

/** Búsqueda sin resultados: el producto no está en el catálogo. */
export function mensajeNoEnCatalogo(termino: string): string {
  return `«${termino.trim()}» no está en nuestro catálogo.`;
}

export const AYUDA_NO_EN_CATALOGO = "Puede existir en el mercado, pero aún no lo tenemos.";

export const TITULO_ALTERNATIVAS = "Productos parecidos en nuestro catálogo";

export function textoProductosEncontrados(total: number): string {
  return total === 1 ? "Encontramos 1 producto." : `Encontramos ${total} productos.`;
}

export interface AnalisisBusqueda {
  /** Palabras que deben coincidir con el nombre, la marca o la categoría. */
  palabras: string[];
  /** Categoría indicada por una palabra genérica («celular» → móviles). */
  categoria: CategoriaDispositivo | null;
  /** La búsqueda solo tiene palabras genéricas: hay que pedir marca o nombre. */
  generica: boolean;
  vacia: boolean;
}

/** Separa las palabras específicas de las genéricas de una búsqueda. */
export function analizarBusqueda(busqueda: string): AnalisisBusqueda {
  const todas = normalizarTexto(busqueda).split(/\s+/).filter(Boolean);
  if (todas.length === 0) return { palabras: [], categoria: null, generica: false, vacia: true };
  let categoria: CategoriaDispositivo | null = null;
  const palabras: string[] = [];
  let hayGenerica = false;
  for (const palabra of todas) {
    if (palabra in PALABRAS_GENERICAS) {
      hayGenerica = true;
      categoria = categoria ?? PALABRAS_GENERICAS[palabra];
    } else if (!PALABRAS_VACIAS.has(palabra)) {
      palabras.push(palabra);
    }
  }
  return { palabras, categoria, generica: palabras.length === 0 && hayGenerica, vacia: false };
}

/** Nombre, marca y categoría del producto: lo único que identifica al dispositivo. */
export function textoIdentidad(producto: Pick<ProductoViewModel, "nombre" | "marca" | "categoriaEtiqueta">): string {
  return normalizarTexto(`${producto.nombre} ${producto.marca} ${producto.categoriaEtiqueta}`);
}

/**
 * Coincide si cada palabra específica de la búsqueda es el inicio de una
 * palabra del texto («16» coincide con «16», no «18» con «16»), en cualquier
 * orden, o si la búsqueda sin espacios aparece en el texto compactado
 * («iphone16» → «iPhone 16»). Las palabras genéricas no cuentan; una búsqueda
 * solo genérica no coincide con nada. Pasa el texto de identidad del producto,
 * no sus especificaciones: los números de una ficha dan falsos positivos.
 */
export function coincideConBusqueda(texto: string, busqueda: string): boolean {
  const analisis = analizarBusqueda(busqueda);
  if (analisis.vacia) return true;
  if (analisis.palabras.length === 0) return false;
  const normalizado = conservarPlus(normalizarTexto(texto));
  const palabrasTexto = normalizado.split(/[^a-z0-9]+/).filter(Boolean);
  if (analisis.palabras.every((palabra) => {
    const limpia = compactar(palabra);
    return limpia.length > 0 && palabrasTexto.some((actual) => actual.startsWith(limpia));
  })) return true;
  const terminoCompacto = compactar(analisis.palabras.join(""));
  return terminoCompacto.length >= 3 && compactar(normalizado).includes(terminoCompacto);
}

/** Búsqueda de productos del catálogo por identidad y categoría genérica. */
export function coincideProductoConBusqueda(
  producto: Pick<ProductoViewModel, "nombre" | "marca" | "categoriaEtiqueta" | "categoria">,
  busqueda: string,
): boolean {
  const analisis = analizarBusqueda(busqueda);
  if (analisis.vacia) return true;
  if (analisis.categoria && producto.categoria !== analisis.categoria) return false;
  return coincideConBusqueda(textoIdentidad(producto), busqueda);
}

/**
 * Fase 4 (H-12): alternativas para una búsqueda sin resultados, solo entre
 * productos registrados. Coinciden por marca o por una palabra del nombre de
 * al menos 3 letras que no sea solo un número. Conserva el orden del catálogo.
 */
export function buscarAlternativas(
  productos: ProductoViewModel[],
  busqueda: string,
  maximo = 4,
): ProductoViewModel[] {
  const palabras = normalizarTexto(busqueda)
    .split(/\s+/)
    .filter((palabra) => palabra.length >= 3 && !/^\d+$/.test(palabra));
  if (palabras.length === 0) return [];
  return productos
    .filter((producto) => {
      const marca = normalizarTexto(producto.marca);
      const nombre = normalizarTexto(producto.nombre).split(/[^a-z0-9]+/);
      return palabras.some((palabra) => palabra === marca || nombre.includes(palabra));
    })
    .slice(0, maximo);
}

export function filtrarProductos(
  productos: ProductoViewModel[],
  filtros: FiltrosCatalogo
): ProductoViewModel[] {
  const busqueda = normalizarTexto(filtros.busqueda);
  const filtroPrecioActivo =
    filtros.precioMin > 0 || filtros.precioMax < Number.MAX_SAFE_INTEGER;

  return productos.filter((producto) => {
    if (busqueda && !coincideProductoConBusqueda(producto, busqueda)) {
      return false;
    }

    if (
      filtros.categorias.length > 0 &&
      !filtros.categorias.includes(producto.categoria)
    ) {
      return false;
    }

    if (filtros.marcas.length > 0) {
      const marcaSeleccionada = filtros.marcas.includes(producto.marca);
      if (filtros.excluirMarcas ? marcaSeleccionada : !marcaSeleccionada) {
        return false;
      }
    }

    if (filtroPrecioActivo) {
      if (producto.precioCOP <= 0) return false;
      if (
        producto.precioCOP < filtros.precioMin ||
        producto.precioCOP > filtros.precioMax
      ) {
        return false;
      }
    }

    if (
      filtros.caracteristicas.length > 0 &&
      !filtros.caracteristicas.every((caracteristica) =>
        producto.caracteristicas.includes(caracteristica)
      )
    ) {
      return false;
    }

    return true;
  });
}

function compararPrecio(
  a: ProductoViewModel,
  b: ProductoViewModel,
  descendente: boolean
): number {
  const precioA = a.precioCOP > 0 ? a.precioCOP : null;
  const precioB = b.precioCOP > 0 ? b.precioCOP : null;

  if (precioA === null && precioB === null) return 0;
  if (precioA === null) return 1;
  if (precioB === null) return -1;

  return descendente ? precioB - precioA : precioA - precioB;
}

function compararValoracion(
  a: ProductoViewModel,
  b: ProductoViewModel
): number {
  if (a.rating === null && b.rating === null) return 0;
  if (a.rating === null) return 1;
  if (b.rating === null) return -1;

  const diferenciaRating = b.rating - a.rating;
  if (diferenciaRating !== 0) return diferenciaRating;

  return (b.cantidadResenas ?? 0) - (a.cantidadResenas ?? 0);
}

export function ordenarProductos(
  productos: ProductoViewModel[],
  orden: OrdenCatalogo
): ProductoViewModel[] {
  const copia = [...productos];

  switch (orden) {
    case "menor-precio":
      return copia.sort((a, b) => compararPrecio(a, b, false));
    case "mayor-precio":
      return copia.sort((a, b) => compararPrecio(a, b, true));
    case "mejor-valorados":
      return copia.sort(compararValoracion);
    case "relevancia":
    default:
      return copia;
  }
}

export function paginar<T>(
  items: T[],
  pagina: number,
  porPagina: number
): Pagina<T> {
  const tamano = Number.isFinite(porPagina)
    ? Math.max(1, Math.floor(porPagina))
    : 1;
  const total = items.length;
  const totalPaginas = Math.max(1, Math.ceil(total / tamano));
  const paginaSolicitada = Number.isFinite(pagina) ? Math.floor(pagina) : 1;
  const paginaSegura = Math.min(
    totalPaginas,
    Math.max(1, paginaSolicitada)
  );
  const inicio = (paginaSegura - 1) * tamano;

  return {
    items: items.slice(inicio, inicio + tamano),
    pagina: paginaSegura,
    totalPaginas,
    total,
  };
}

export function construirChips(filtros: FiltrosCatalogo): ChipFiltro[] {
  const chips: ChipFiltro[] = [];
  const busqueda = filtros.busqueda.trim();

  if (busqueda) {
    chips.push({
      tipo: "busqueda",
      valor: busqueda,
      etiqueta: `Búsqueda: ${busqueda}`,
    });
  }

  for (const categoria of filtros.categorias) {
    chips.push({
      tipo: "categoria",
      valor: categoria,
      etiqueta: ETIQUETAS_CATEGORIA[categoria],
    });
  }

  for (const marca of filtros.marcas) {
    chips.push({
      tipo: "marca",
      valor: marca,
      etiqueta: filtros.excluirMarcas ? `Excluir: ${marca}` : marca,
    });
  }

  if (
    filtros.precioMin > 0 ||
    filtros.precioMax < Number.MAX_SAFE_INTEGER
  ) {
    const tieneMinimo = filtros.precioMin > 0;
    const tieneMaximo = filtros.precioMax < Number.MAX_SAFE_INTEGER;
    const etiqueta =
      tieneMinimo && tieneMaximo
        ? `${formatearCOP(filtros.precioMin)} - ${formatearCOP(
            filtros.precioMax
          )}`
        : tieneMinimo
          ? `Desde ${formatearCOP(filtros.precioMin)}`
          : `Hasta ${formatearCOP(filtros.precioMax)}`;

    chips.push({
      tipo: "precio",
      valor: `${filtros.precioMin}-${filtros.precioMax}`,
      etiqueta,
    });
  }

  for (const caracteristica of filtros.caracteristicas) {
    chips.push({
      tipo: "caracteristica",
      valor: caracteristica,
      etiqueta: ETIQUETAS_CARACTERISTICA[caracteristica],
    });
  }

  return chips;
}

export function hayFiltrosActivos(
  filtros: FiltrosCatalogo,
  rango: RangoPrecio
): boolean {
  return (
    filtros.busqueda.trim().length > 0 ||
    filtros.categorias.length > 0 ||
    filtros.marcas.length > 0 ||
    filtros.caracteristicas.length > 0 ||
    filtros.precioMin > rango.min ||
    filtros.precioMax < Number.MAX_SAFE_INTEGER
  );
}
