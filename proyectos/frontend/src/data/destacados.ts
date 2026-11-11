import type { ProductoMejorValorado } from "@/types/producto";
import type { ProductoViewModel } from "@/data/productoViewModel";

/** Cantidad máxima de productos que se muestran en la sección Destacados. */
export const MAX_DESTACADOS = 6;

/**
 * Selecciona los productos destacados de la home.
 *
 * Usa el ranking real de mejor valorados (respetando `posicionRanking`),
 * descarta duplicados y productos que no estén en el catálogo recibido.
 * Si no hay ninguna valoración coincidente, cae a los primeros productos
 * del catálogo para no dejar la sección vacía.
 */
export function seleccionarDestacados(
  productos: readonly ProductoViewModel[],
  valorados: readonly ProductoMejorValorado[],
): ProductoViewModel[] {
  const productosPorId = new Map(
    productos.map((producto) => [producto.idProducto, producto]),
  );

  const idsAgregados = new Set<number>();
  const destacados: ProductoViewModel[] = [];

  const rankingOrdenado = [...valorados].sort(
    (a, b) => a.posicionRanking - b.posicionRanking,
  );

  for (const item of rankingOrdenado) {
    if (destacados.length >= MAX_DESTACADOS) break;
    if (idsAgregados.has(item.idProducto)) continue;

    const producto = productosPorId.get(item.idProducto);
    if (!producto) continue;

    idsAgregados.add(item.idProducto);
    destacados.push({ ...producto, posicionRanking: item.posicionRanking });
  }

  if (destacados.length > 0) {
    return destacados;
  }

  return productos.slice(0, MAX_DESTACADOS);
}
