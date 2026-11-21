import type {
  CategoriaResponse,
  MarcaResponse,
  Producto,
  ResumenOfertasProducto,
} from "@/types/producto";
import { crearProductoViewModel, type ProductoViewModel } from "./productoViewModel";

export interface DatosCatalogo {
  productos: Producto[];
  categorias: CategoriaResponse[];
  marcas: MarcaResponse[];
  /**
   * Fase 4 (H-04): resumen de ofertas del backend. Si falta o es null (por
   * ejemplo, porque la consulta falló), la disponibilidad queda sin confirmar.
   */
  resumenOfertas?: ResumenOfertasProducto[] | null;
}

/**
 * Enriquece los productos de la API con los nombres de marca y categoría que
 * viven en endpoints separados, y los transforma en view models del catálogo.
 */
export function construirCatalogo({
  productos,
  categorias,
  marcas,
  resumenOfertas,
}: DatosCatalogo): ProductoViewModel[] {
  const nombrePorMarca = new Map<number, string>(
    marcas.map((marca) => [marca.idMarca, marca.nombre])
  );
  const nombrePorCategoria = new Map<number, string>(
    categorias.map((categoria) => [categoria.idCategoria, categoria.nombre])
  );

  const resumenPorProducto = resumenOfertas
    ? new Map(resumenOfertas.map((resumen) => [resumen.idProducto, resumen]))
    : null;

  return productos.map((producto) => {
    const nombreCategoria = nombrePorCategoria.get(producto.idCategoria);

    const vista = crearProductoViewModel(
      nombreCategoria ? { ...producto, nombreCategoria } : producto,
      { nombreMarca: nombrePorMarca.get(producto.idMarca) ?? null }
    );
    return aplicarResumenOfertas(vista, resumenPorProducto);
  });
}

/**
 * Aplica el resumen de ofertas a view models ya construidos (por ejemplo, los
 * que una vista guarda en su estado). Solo afecta a productos de la API.
 */
export function aplicarResumenOfertasAVistas(
  vistas: ProductoViewModel[],
  resumenOfertas: ResumenOfertasProducto[] | null,
): ProductoViewModel[] {
  const resumenPorProducto = resumenOfertas
    ? new Map(resumenOfertas.map((resumen) => [resumen.idProducto, resumen]))
    : null;
  return vistas.map((vista) =>
    (vista.origen ?? "api") === "api" ? aplicarResumenOfertas(vista, resumenPorProducto) : vista,
  );
}

/**
 * Fase 4 (H-04): las ofertas del backend son la única fuente de tiendas y
 * precios por tienda de los productos reales; el JSON heredado no se usa.
 */
function aplicarResumenOfertas(
  vista: ProductoViewModel,
  resumenPorProducto: Map<number, ResumenOfertasProducto> | null,
): ProductoViewModel {
  if (!resumenPorProducto) {
    return { ...vista, numeroTiendas: 0, precioDesdeCOP: null, fechaPrecioTiendas: null, disponibilidadConsultada: false };
  }
  const resumen = resumenPorProducto.get(vista.idProducto);
  const tiendas = resumen && resumen.tiendasDisponibles > 0 ? resumen.tiendasDisponibles : 0;
  return {
    ...vista,
    numeroTiendas: tiendas,
    precioDesdeCOP: tiendas > 0 && resumen?.menorPrecio && resumen.menorPrecio > 0 ? resumen.menorPrecio : null,
    fechaPrecioTiendas: tiendas > 0 ? resumen?.fechaActualizacionMasReciente ?? null : null,
    disponibilidadConsultada: true,
  };
}
