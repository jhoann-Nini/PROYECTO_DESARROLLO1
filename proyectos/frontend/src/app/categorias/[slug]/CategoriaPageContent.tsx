"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  obtenerCategorias,
  obtenerMarcas,
  obtenerProductosPorCategoria,
} from "@/services/api";
import type { MarcaResponse, Producto } from "@/types/producto";
import {
  resolverCategoriasPorSlug,
  type ResolucionCategoria,
} from "@/lib/categorias";
import ProductCard from "@/components/ProductCard";
import GeometricBackground from "@/components/GeometricBackground";

type OrdenProductos = "nombre" | "precio-asc" | "precio-desc";

interface CategoriaPageContentProps {
  slug: string;
}

interface ResultadoConsulta {
  resolucion: ResolucionCategoria | null;
  productos: Producto[];
}

function precioNumerico(producto: Producto): number | null {
  if (
    producto.precioReferencia === null ||
    producto.precioReferencia === undefined
  ) {
    return null;
  }
  return producto.precioReferencia < 10000
    ? producto.precioReferencia * 4000
    : producto.precioReferencia;
}

export default function CategoriaPageContent({
  slug,
}: CategoriaPageContentProps) {
  const router = useRouter();
  const [categoria, setCategoria] = useState<ResolucionCategoria | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noEncontrada, setNoEncontrada] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [orden, setOrden] = useState<OrdenProductos>("nombre");
  const [intento, setIntento] = useState(0);

  const consultar = useCallback(async (): Promise<ResultadoConsulta> => {
    const categorias = await obtenerCategorias();
    const resolucion = resolverCategoriasPorSlug(categorias, slug);

    if (!resolucion) {
      return { resolucion: null, productos: [] };
    }

    const [marcas, listas] = await Promise.all([
      obtenerMarcas().catch(() => [] as MarcaResponse[]),
      Promise.all(
        resolucion.categorias.map((item) =>
          obtenerProductosPorCategoria<Producto>(item.idCategoria),
        ),
      ),
    ]);

    const nombreCategoriaPorId = new Map(
      resolucion.categorias.map((item) => [item.idCategoria, item.nombre]),
    );
    const nombreMarcaPorId = new Map(
      marcas.map((marca) => [marca.idMarca, marca.nombre]),
    );

    const unicos = new Map<number, Producto>();
    for (const producto of listas.flat()) {
      if (producto.estado === false || unicos.has(producto.idProducto)) {
        continue;
      }
      unicos.set(producto.idProducto, {
        ...producto,
        nombreCategoria:
          producto.nombreCategoria ||
          nombreCategoriaPorId.get(producto.idCategoria),
        nombreMarca:
          producto.nombreMarca || nombreMarcaPorId.get(producto.idMarca),
      });
    }

    return { resolucion, productos: [...unicos.values()] };
  }, [slug]);

  useEffect(() => {
    let activo = true;

    consultar()
      .then((resultado) => {
        if (!activo) return;
        setCategoria(resultado.resolucion);
        setProductos(resultado.productos);
        setNoEncontrada(resultado.resolucion === null);
      })
      .catch((err: unknown) => {
        if (!activo) return;
        setCategoria(null);
        setProductos([]);
        setError(
          err instanceof Error
            ? err.message
            : "No fue posible cargar los productos de esta categoría.",
        );
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [consultar, intento]);

  const reintentar = () => {
    setCargando(true);
    setError(null);
    setNoEncontrada(false);
    setIntento((valor) => valor + 1);
  };

  const productosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    const filtrados = termino
      ? productos.filter(
          (producto) =>
            producto.nombre.toLowerCase().includes(termino) ||
            (producto.descripcion || "").toLowerCase().includes(termino) ||
            (producto.nombreMarca || "").toLowerCase().includes(termino),
        )
      : productos;

    return [...filtrados].sort((a, b) => {
      if (orden === "precio-asc" || orden === "precio-desc") {
        const precioA = precioNumerico(a);
        const precioB = precioNumerico(b);
        if (precioA === null && precioB === null) return 0;
        if (precioA === null) return 1;
        if (precioB === null) return -1;
        return orden === "precio-asc" ? precioA - precioB : precioB - precioA;
      }
      return a.nombre.localeCompare(b.nombre, "es");
    });
  }, [productos, busqueda, orden]);

  const nombreCategoria =
    categoria?.categorias.map((item) => item.nombre).join(" · ") ||
    categoria?.definicion.etiqueta ||
    "";
  const descripcionCategoria =
    categoria?.categorias
      .map((item) => item.descripcion)
      .filter((descripcion): descripcion is string => Boolean(descripcion))
      .join(" ") || categoria?.definicion.descripcion || "";

  const total = productosFiltrados.length;

  return (
    <main className="relative min-h-screen overflow-x-clip text-slate-100 dark">
      <GeometricBackground tema="oscuro" />

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <nav
          aria-label="Migas de pan"
          className="flex flex-wrap items-center justify-between gap-3 border-b border-line/70 pb-6"
        >
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <Link href="/" className="transition-colors hover:text-blue-300">
              Inicio
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-slate-300">Categorías</span>
            {nombreCategoria && (
              <>
                <span aria-hidden="true">/</span>
                <span className="text-blue-300">{nombreCategoria}</span>
              </>
            )}
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-control border border-line bg-surface-1/80 px-4 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-blue-500/40 hover:text-white"
          >
            ← Volver al catálogo
          </Link>
        </nav>

        {cargando ? (
          <section
            className="flex flex-col items-center justify-center py-24"
            aria-live="polite"
            aria-busy="true"
          >
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-line border-t-blue-500" />
            <p className="mt-4 text-sm text-slate-500">
              Consultando productos de la categoría...
            </p>
          </section>
        ) : noEncontrada ? (
          <section className="mt-10 rounded-card border border-dashed border-line bg-surface-1/70 p-10 text-center sm:p-12">
            <p className="font-display text-2xl font-semibold tracking-[-0.02em] text-white">
              Categoría no encontrada
            </p>
            <p className="mx-auto mt-3 max-w-lg text-sm text-slate-400">
              La categoría solicitada no existe en el catálogo actual o su
              nombre cambió en la base de datos.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-1.5 rounded-control bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500"
            >
              ← Volver al catálogo
            </Link>
          </section>
        ) : error ? (
          <section
            className="mt-10 rounded-card border border-red-500/30 bg-red-500/10 p-8 text-center"
            role="alert"
          >
            <p className="font-display text-lg font-semibold text-red-300">
              No fue posible cargar la categoría
            </p>
            <p className="mt-2 text-sm text-red-200/80">{error}</p>
            <button
              type="button"
              onClick={reintentar}
              className="mt-5 inline-flex items-center gap-1.5 rounded-control bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500 cursor-pointer"
            >
              Reintentar
            </button>
          </section>
        ) : (
          <>
            <header className="animate-fade-in border-b border-line/70 pb-6 pt-8">
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-500/25 bg-blue-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-300">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                {categoria?.definicion.etiqueta || "Categoría"}
              </span>
              <h1 className="mt-3 font-display text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
                {nombreCategoria}
              </h1>
              {descripcionCategoria && (
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
                  {descripcionCategoria}
                </p>
              )}
            </header>

            <section className="py-6" aria-label="Filtros de la categoría">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="w-full lg:max-w-md">
                  <label
                    htmlFor="buscar-categoria"
                    className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400"
                  >
                    Buscar dentro de la categoría
                  </label>
                  <input
                    id="buscar-categoria"
                    type="search"
                    value={busqueda}
                    onChange={(event) => setBusqueda(event.target.value)}
                    placeholder="Buscar por nombre, marca o descripción..."
                    className="w-full rounded-control border border-line bg-surface-1/80 px-4 py-3 text-sm text-white placeholder:text-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                  />
                </div>

                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label
                      htmlFor="ordenar-categoria"
                      className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400"
                    >
                      Ordenar productos
                    </label>
                    <select
                      id="ordenar-categoria"
                      value={orden}
                      onChange={(event) =>
                        setOrden(event.target.value as OrdenProductos)
                      }
                      className="cursor-pointer rounded-control border border-line bg-surface-1/80 px-4 py-3 text-sm text-white transition-colors focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                    >
                      <option value="nombre">Nombre (A-Z)</option>
                      <option value="precio-asc">Menor precio</option>
                      <option value="precio-desc">Mayor precio</option>
                    </select>
                  </div>

                  <span className="inline-flex items-center rounded-full border border-line bg-surface-2/60 px-3.5 py-2 text-xs font-medium text-slate-300">
                    {total} producto{total === 1 ? "" : "s"} encontrado
                    {total === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
            </section>

            {productosFiltrados.length > 0 ? (
              <section
                aria-label={`Productos de ${nombreCategoria}`}
                className="grid animate-fade-in gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6"
              >
                {productosFiltrados.map((producto) => (
                  <ProductCard
                    key={producto.idProducto}
                    producto={producto}
                    onVerDetalle={(producto) =>
                      router.push(`/productos/${producto.idProducto}`)
                    }
                  />
                ))}
              </section>
            ) : (
              <section className="rounded-card border border-dashed border-line bg-surface-1/50 p-10 text-center sm:p-12">
                {busqueda.trim() ? (
                  <>
                    <p className="font-semibold text-slate-200">
                      No se encontraron productos para &ldquo;{busqueda}&rdquo;.
                    </p>
                    <button
                      type="button"
                      onClick={() => setBusqueda("")}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-control bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500 cursor-pointer"
                    >
                      Limpiar búsqueda
                    </button>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-slate-200">
                      Aún no hay productos registrados en esta categoría.
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      Cuando se registren productos en la base de datos
                      aparecerán aquí automáticamente.
                    </p>
                  </>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
