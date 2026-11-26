import type { ProductoMejorValorado } from "@/types/producto";
import type { ProductoViewModel } from "@/data/productoViewModel";

/** Cantidad máxima de productos que se muestran en la sección Destacados. */
export const MAX_DESTACADOS = 6;

/**
 * Selecciona los productos destacados de la home.
 *
 * Prioriza el ranking real de mejor valorados (respetando `posicionRanking`),
 * completa con el catálogo y favorece distintas marcas y categorías. Solo
 * relaja ese criterio cuando faltan alternativas para ocupar los seis cupos.
 */
export function seleccionarDestacados(
  productos: readonly ProductoViewModel[],
  valorados: readonly ProductoMejorValorado[],
): ProductoViewModel[] {
  const productosPorId = new Map(
    productos.map((producto) => [producto.idProducto, producto]),
  );

  const idsCandidatos = new Set<number>();
  const candidatos: ProductoViewModel[] = [];

  const rankingOrdenado = [...valorados].sort(
    (a, b) => a.posicionRanking - b.posicionRanking,
  );

  for (const item of rankingOrdenado) {
    if (idsCandidatos.has(item.idProducto)) continue;

    const producto = productosPorId.get(item.idProducto);
    if (!producto) continue;

    idsCandidatos.add(item.idProducto);
    candidatos.push({ ...producto, posicionRanking: item.posicionRanking });
  }

  for (const producto of productos) {
    if (idsCandidatos.has(producto.idProducto)) continue;
    idsCandidatos.add(producto.idProducto);
    candidatos.push(producto);
  }

  const destacados: ProductoViewModel[] = [];
  const idsSeleccionados = new Set<number>();
  const porMarca = new Map<string, number>();
  const porCategoria = new Map<string, number>();

  function agregar(producto: ProductoViewModel) {
    destacados.push(producto);
    idsSeleccionados.add(producto.idProducto);
    const marca = producto.marca.trim().toLowerCase();
    porMarca.set(marca, (porMarca.get(marca) ?? 0) + 1);
    porCategoria.set(
      producto.categoria,
      (porCategoria.get(producto.categoria) ?? 0) + 1,
    );
  }

  for (const producto of candidatos) {
    if (destacados.length >= MAX_DESTACADOS) break;
    const marca = producto.marca.trim().toLowerCase();
    if ((porMarca.get(marca) ?? 0) >= 2) continue;
    if ((porCategoria.get(producto.categoria) ?? 0) >= 2) continue;
    agregar(producto);
  }

  for (const producto of candidatos) {
    if (destacados.length >= MAX_DESTACADOS) break;
    if (!idsSeleccionados.has(producto.idProducto)) agregar(producto);
  }

  return destacados;
}
