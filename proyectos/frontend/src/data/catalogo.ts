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

export function filtrarProductos(
  productos: ProductoViewModel[],
  filtros: FiltrosCatalogo
): ProductoViewModel[] {
  const busqueda = normalizarTexto(filtros.busqueda);
  const filtroPrecioActivo =
    filtros.precioMin > 0 || filtros.precioMax < Number.MAX_SAFE_INTEGER;

  return productos.filter((producto) => {
    if (busqueda && !producto.textoBusqueda.includes(busqueda)) {
      return false;
    }

    if (
      filtros.categorias.length > 0 &&
      !filtros.categorias.includes(producto.categoria)
    ) {
      return false;
    }

    if (
      filtros.marcas.length > 0 &&
      !filtros.marcas.includes(producto.marca)
    ) {
      return false;
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
    chips.push({ tipo: "marca", valor: marca, etiqueta: marca });
  }

  if (
    filtros.precioMin > 0 ||
    filtros.precioMax < Number.MAX_SAFE_INTEGER
  ) {
    chips.push({
      tipo: "precio",
      valor: `${filtros.precioMin}-${filtros.precioMax}`,
      etiqueta: `${formatearCOP(filtros.precioMin)} - ${formatearCOP(
        filtros.precioMax
      )}`,
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
    filtros.precioMax < rango.max
  );
}
