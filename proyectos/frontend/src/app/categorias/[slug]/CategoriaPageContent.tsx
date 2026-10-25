"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
import FichaTecnicaModal from "@/components/FichaTecnicaModal";
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
  const [categoria, setCategoria] = useState<ResolucionCategoria | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noEncontrada, setNoEncontrada] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [orden, setOrden] = useState<OrdenProductos>("nombre");
  const [productoSeleccionado, setProductoSeleccionado] =
    useState<Producto | null>(null);
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
    <main className="relative min-h-screen dark text-slate-100">
      <GeometricBackground tema="oscuro" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <nav
          aria-label="Migas de pan"
          className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-slate-800/80"
        >
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <Link href="/" className="hover:text-blue-400 transition-colors">
              Inicio
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-slate-200">Categorías</span>
            {nombreCategoria && (
              <>
                <span aria-hidden="true">/</span>
                <span className="text-blue-400">{nombreCategoria}</span>
              </>
            )}
          </div>

          <Link
            href="/"
            className="font-doto uppercase tracking-wider inline-flex items-center gap-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 px-4 py-2 text-xs font-bold text-white shadow-2xs transition-colors"
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
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-800 border-t-blue-600" />
            <p className="mt-4 text-sm font-doto uppercase tracking-wider text-slate-400">
              Consultando productos de la categoría...
            </p>
          </section>
        ) : noEncontrada ? (
          <section className="mt-10 rounded-2xl border border-dashed border-slate-700 bg-slate-900/70 p-12 text-center">
            <p className="font-doto text-2xl font-black uppercase tracking-wider text-slate-100">
              Categoría no encontrada
            </p>
            <p className="mt-3 text-sm text-slate-400 max-w-lg mx-auto">
              La categoría solicitada no existe en el catálogo actual o su
              nombre cambió en la base de datos.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 px-4 py-2 text-xs font-bold font-doto uppercase tracking-wider text-white transition-colors"
            >
              ← Volver al catálogo
            </Link>
          </section>
        ) : error ? (
          <section
            className="mt-10 rounded-2xl border border-red-900/60 bg-red-950/40 p-8 text-center"
            role="alert"
          >
            <p className="font-doto text-lg font-black uppercase tracking-wider text-red-300">
              No fue posible cargar la categoría
            </p>
            <p className="mt-2 text-sm text-red-200">{error}</p>
            <button
              type="button"
              onClick={reintentar}
              className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 px-4 py-2 text-xs font-bold font-doto uppercase tracking-wider text-white transition-colors cursor-pointer"
            >
              Reintentar
            </button>
          </section>
        ) : (
          <>
            <header className="pt-8 pb-6 border-b border-slate-800/80">
              <span className="inline-flex items-center gap-2 rounded-md bg-blue-950/80 border border-blue-800/80 px-3 py-1 text-[11px] font-bold font-doto uppercase tracking-widest text-blue-300">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                {categoria?.definicion.etiqueta || "Categoría"}
              </span>
              <h1 className="mt-3 font-doto text-3xl sm:text-4xl font-black uppercase tracking-wider text-white">
                {nombreCategoria}
              </h1>
              {descripcionCategoria && (
                <p className="mt-2 max-w-2xl text-sm text-slate-400 leading-relaxed">
                  {descripcionCategoria}
                </p>
              )}
            </header>

            <section className="py-6" aria-label="Filtros de la categoría">
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                <div className="w-full lg:max-w-md">
                  <label
                    htmlFor="buscar-categoria"
                    className="block text-xs font-bold font-doto uppercase tracking-wider text-slate-300 mb-2"
                  >
                    Buscar dentro de la categoría
                  </label>
                  <input
                    id="buscar-categoria"
                    type="search"
                    value={busqueda}
                    onChange={(event) => setBusqueda(event.target.value)}
                    placeholder="Buscar por nombre, marca o descripción..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 py-3 px-4 text-sm text-white placeholder:text-slate-500 focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 transition-colors"
                  />
                </div>

                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label
                      htmlFor="ordenar-categoria"
                      className="block text-xs font-bold font-doto uppercase tracking-wider text-slate-300 mb-2"
                    >
                      Ordenar productos
                    </label>
                    <select
                      id="ordenar-categoria"
                      value={orden}
                      onChange={(event) =>
                        setOrden(event.target.value as OrdenProductos)
                      }
                      className="rounded-xl border border-slate-700 bg-slate-900 py-3 px-4 text-sm text-white focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 transition-colors cursor-pointer"
                    >
                      <option value="nombre">Nombre (A-Z)</option>
                      <option value="precio-asc">Menor precio</option>
                      <option value="precio-desc">Mayor precio</option>
                    </select>
                  </div>

                  <span className="inline-flex items-center rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold font-mono text-slate-300">
                    {total} producto{total === 1 ? "" : "s"} encontrado
                    {total === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
            </section>

            {productosFiltrados.length > 0 ? (
              <section
                aria-label={`Productos de ${nombreCategoria}`}
                className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
              >
                {productosFiltrados.map((producto) => (
                  <ProductCard
                    key={producto.idProducto}
                    producto={producto}
                    onVerDetalle={setProductoSeleccionado}
                  />
                ))}
              </section>
            ) : (
              <section className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-12 text-center">
                {busqueda.trim() ? (
                  <>
                    <p className="font-bold text-slate-100">
                      No se encontraron productos para &ldquo;{busqueda}&rdquo;.
                    </p>
                    <button
                      type="button"
                      onClick={() => setBusqueda("")}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 px-3.5 py-1.5 text-xs font-bold font-doto uppercase tracking-wider text-white transition-colors cursor-pointer"
                    >
                      Limpiar búsqueda
                    </button>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-slate-100">
                      Aún no hay productos registrados en esta categoría.
                    </p>
                    <p className="mt-2 text-sm text-slate-400">
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

      <FichaTecnicaModal
        producto={productoSeleccionado}
        onClose={() => setProductoSeleccionado(null)}
      />
    </main>
  );
}
