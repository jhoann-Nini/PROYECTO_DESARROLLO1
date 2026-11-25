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
import {
  crearProductoViewModel,
  type ProductoViewModel,
} from "@/data/productoViewModel";
import { aplicarResumenOfertasAVistas } from "@/data/catalogoApi";
import { coincideProductoConBusqueda } from "@/data/catalogo";
import { useResumenOfertas } from "@/hooks/useResumenOfertas";
import TarjetaProducto from "@/components/catalogo/TarjetaProducto";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

type OrdenProductos = "nombre" | "precio-asc" | "precio-desc";

interface CategoriaPageContentProps {
  slug: string;
}

interface ResultadoConsulta {
  resolucion: ResolucionCategoria | null;
  productos: ProductoViewModel[];
}

export default function CategoriaPageContent({
  slug,
}: CategoriaPageContentProps) {
  const router = useRouter();
  const [categoria, setCategoria] = useState<ResolucionCategoria | null>(null);
  const [productos, setProductos] = useState<ProductoViewModel[]>([]);
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

    return {
      resolucion,
      productos: [...unicos.values()].map((producto) =>
        crearProductoViewModel(producto),
      ),
    };
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

  // Fase 4 (H-04, H-12): disponibilidad desde las ofertas y búsqueda por palabras.
  const resumenOfertas = useResumenOfertas();
  const productosFiltrados = useMemo(() => {
    const conOfertas = aplicarResumenOfertasAVistas(productos, resumenOfertas);
    const filtrados = busqueda.trim()
      ? conOfertas.filter((producto) => coincideProductoConBusqueda(producto, busqueda))
      : conOfertas;

    return [...filtrados].sort((a, b) => {
      if (orden === "precio-asc" || orden === "precio-desc") {
        const precioA = a.precioCOP > 0 ? a.precioCOP : null;
        const precioB = b.precioCOP > 0 ? b.precioCOP : null;
        if (precioA === null && precioB === null) return 0;
        if (precioA === null) return 1;
        if (precioB === null) return -1;
        return orden === "precio-asc" ? precioA - precioB : precioB - precioA;
      }
      return a.nombre.localeCompare(b.nombre, "es");
    });
  }, [productos, resumenOfertas, busqueda, orden]);

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
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <nav
        aria-label="Migas de pan"
        className="mb-6 flex flex-wrap items-center justify-between gap-3 text-xs text-subtle"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/" className="transition-colors hover:text-brand-blue">
            Inicio
          </Link>
          <span aria-hidden="true">/</span>
          <span>Categorías</span>
          {nombreCategoria && (
            <>
              <span aria-hidden="true">/</span>
              <span className="font-medium text-ink">
                {nombreCategoria}
              </span>
            </>
          )}
        </div>

        <Link
          href="/productos"
          className="inline-flex items-center gap-1.5 rounded-card border border-hairline bg-paper px-4 py-2 text-xs font-medium text-ink transition-colors hover:border-brand-blue hover:text-brand-blue"
        >
          ← Volver al catálogo
        </Link>
      </nav>

      {cargando ? (
        <section
          className="flex flex-col items-center justify-center rounded-card border border-hairline bg-paper py-24"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-hairline border-t-brand-blue" />
          <p className="mt-4 text-sm text-subtle">
            Consultando productos de la categoría...
          </p>
        </section>
      ) : noEncontrada ? (
        <section className="mt-10 rounded-card border border-dashed border-hairline bg-paper p-10 text-center sm:p-12">
          <p className="text-2xl font-medium tracking-normal text-ink">
            Categoría no encontrada
          </p>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-subtle">
            La categoría solicitada no existe en el catálogo actual o su nombre
            cambió en la base de datos.
          </p>
          <Link
            href="/productos"
            className="mt-6 inline-flex min-h-11 items-center gap-1.5 rounded-pill bg-brand-solid px-5 py-3 text-xs font-medium uppercase text-on-solid"
          >
            ← Volver al catálogo
          </Link>
        </section>
      ) : error ? (
        <section
          className="mt-10 rounded-card border border-status-error bg-paper p-8 text-center"
          role="alert"
        >
          <p className="text-lg font-medium text-status-error">
            No fue posible cargar la categoría
          </p>
          <p className="mt-2 text-sm text-status-error">{error}</p>
          <Button
            type="button"
            onClick={reintentar}
            className="mt-5 text-xs"
          >
            Reintentar
          </Button>
        </section>
      ) : (
        <>
          <header className="border-b border-dotted border-line pb-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1 text-[11px] font-medium uppercase tracking-normal text-brand-blue">
              <span className="h-1.5 w-1.5 rounded-full bg-positive" />
              {categoria?.definicion.etiqueta || "Categoría"}
            </span>
            <h1 className="mt-3 text-3xl font-medium uppercase tracking-normal text-ink sm:text-4xl">
              {nombreCategoria}
            </h1>
            {descripcionCategoria && (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-subtle">
                {descripcionCategoria}
              </p>
            )}
          </header>

          <section className="py-6" aria-label="Filtros de la categoría">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="w-full lg:max-w-md">
                <label
                  htmlFor="buscar-categoria"
                  className="mb-2 block text-[11px] font-medium uppercase tracking-normal text-subtle"
                >
                  Buscar dentro de la categoría
                </label>
                <Input
                  id="buscar-categoria"
                  type="search"
                  value={busqueda}
                  onChange={(event) => setBusqueda(event.target.value)}
                  placeholder="Busca por marca o modelo"
                  className="text-sm"
                />
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label
                    htmlFor="ordenar-categoria"
                    className="mb-2 block text-[11px] font-medium uppercase tracking-normal text-subtle"
                  >
                    Ordenar productos
                  </label>
                  <select
                    id="ordenar-categoria"
                    value={orden}
                    onChange={(event) =>
                      setOrden(event.target.value as OrdenProductos)
                    }
                    className="min-h-11 cursor-pointer rounded-input border-0 border-b border-ink bg-transparent px-0 py-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-brand-blue"
                  >
                    <option value="nombre">Nombre (A-Z)</option>
                    <option value="precio-asc">Menor precio</option>
                    <option value="precio-desc">Mayor precio</option>
                  </select>
                </div>

                <span className="inline-flex items-center rounded-full bg-paper px-3.5 py-2 text-xs font-medium text-subtle ring-1 ring-hairline">
                  {total} producto{total === 1 ? "" : "s"} encontrado
                  {total === 1 ? "" : "s"}
                </span>
              </div>
            </div>
          </section>

          {productosFiltrados.length > 0 ? (
            <section
              aria-label={`Productos de ${nombreCategoria}`}
              className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6"
            >
              {productosFiltrados.map((producto) => (
                <TarjetaProducto
                  key={producto.idProducto}
                  producto={producto}
                  onVerDetalle={(vista) => {
                    const idDestino =
                      typeof vista.idApi === "number" && Number.isSafeInteger(vista.idApi) && vista.idApi > 0
                        ? vista.idApi
                        : typeof vista.idProducto === "number" && Number.isSafeInteger(vista.idProducto) && vista.idProducto > 0
                          ? vista.idProducto
                          : null;
                    if (idDestino) {
                      router.push(`/productos/${idDestino}`);
                    }
                  }}
                />
              ))}
            </section>
          ) : (
            <section className="rounded-card border border-dashed border-hairline bg-paper p-10 text-center sm:p-12">
              {busqueda.trim() ? (
                <>
                  <p className="font-medium text-ink">
                    No se encontraron productos para &ldquo;{busqueda}&rdquo;.
                  </p>
                  <Button
                    type="button"
                    onClick={() => setBusqueda("")}
                    className="mt-3 text-xs"
                  >
                    Limpiar búsqueda
                  </Button>
                </>
              ) : (
                <>
                  <p className="font-medium text-ink">
                    Aún no hay productos registrados en esta categoría.
                  </p>
                  <p className="mt-2 text-sm text-subtle">
                    Cuando se registren productos en la base de datos
                    aparecerán aquí automáticamente.
                  </p>
                </>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}
