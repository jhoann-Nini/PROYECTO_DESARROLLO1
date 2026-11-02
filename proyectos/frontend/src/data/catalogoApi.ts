import type {
  CategoriaResponse,
  MarcaResponse,
  Producto,
} from "@/types/producto";
import { crearProductoViewModel, type ProductoViewModel } from "./productoViewModel";

export interface DatosCatalogo {
  productos: Producto[];
  categorias: CategoriaResponse[];
  marcas: MarcaResponse[];
}

/**
 * Enriquece los productos de la API con los nombres de marca y categoría que
 * viven en endpoints separados, y los transforma en view models del catálogo.
 */
export function construirCatalogo({
  productos,
  categorias,
  marcas,
}: DatosCatalogo): ProductoViewModel[] {
  const nombrePorMarca = new Map<number, string>(
    marcas.map((marca) => [marca.idMarca, marca.nombre])
  );
  const nombrePorCategoria = new Map<number, string>(
    categorias.map((categoria) => [categoria.idCategoria, categoria.nombre])
  );

  return productos.map((producto) => {
    const nombreCategoria = nombrePorCategoria.get(producto.idCategoria);

    return crearProductoViewModel(
      nombreCategoria ? { ...producto, nombreCategoria } : producto,
      { nombreMarca: nombrePorMarca.get(producto.idMarca) ?? null }
    );
  });
}
