import type { CategoriaDispositivo } from "@/types/producto";
import {
  ordenarProductos,
  prepararCatalogo,
  type OpcionConteo,
  type OrdenCatalogo,
} from "./catalogo";
import type { ProductoViewModel } from "./productoViewModel";

export type FiltroCategoriaFavoritos = CategoriaDispositivo | "todas";

/**
 * Reutiliza las opciones y el orden del catálogo para que favoritos no
 * mantenga su propia copia de categorías ni de comparadores.
 */
export function opcionesCategoriaFavoritos(
  productos: ProductoViewModel[],
): OpcionConteo<CategoriaDispositivo>[] {
  return prepararCatalogo(productos).categorias;
}

export function filtrarFavoritos(
  productos: ProductoViewModel[],
  categoria: FiltroCategoriaFavoritos,
): ProductoViewModel[] {
  if (categoria === "todas") return productos;
  return productos.filter((producto) => producto.categoria === categoria);
}

export function ordenarFavoritos(
  productos: ProductoViewModel[],
  orden: OrdenCatalogo,
): ProductoViewModel[] {
  return ordenarProductos(productos, orden);
}
