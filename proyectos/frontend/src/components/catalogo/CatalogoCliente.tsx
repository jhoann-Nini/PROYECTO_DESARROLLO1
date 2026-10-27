"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  CategoriaResponse,
  MarcaResponse,
  Producto,
} from "@/types/producto";
import {
  obtenerCategorias,
  obtenerMarcas,
  obtenerProductos,
} from "@/services/api";
import {
  ORDENES_CATALOGO,
  construirChips,
  filtrarProductos,
  hayFiltrosActivos,
  ordenarProductos,
  paginar,
  prepararCatalogo,
  type ChipFiltro,
  type FiltrosCatalogo,
  type OrdenCatalogo,
} from "@/data/catalogo";
import { construirCatalogo } from "@/data/catalogoApi";
import type { ProductoViewModel } from "@/data/productoViewModel";
import SearchBar from "@/components/SearchBar";
import TarjetaProducto from "./TarjetaProducto";
import FilterSidebar from "./FilterSidebar";
import FilterChips from "./FilterChips";
import Pagination from "./Pagination";

const POR_PAGINA = 12;

function filtrosBase(): FiltrosCatalogo {
  return {
    busqueda: "",
    categorias: [],
    marcas: [],
    precioMin: 0,
    precioMax: Number.MAX_SAFE_INTEGER,
    caracteristicas: [],
  };
}

export default function CatalogoCliente() {
  const router = useRouter();
  const botonFiltrosRef = useRef<HTMLButtonElement>(null);
  const [productosApi, setProductosApi] = useState<Producto[]>([]);
  const [categoriasApi, setCategoriasApi] = useState<CategoriaResponse[]>([]);
  const [marcasApi, setMarcasApi] = useState<MarcaResponse[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [filtros, setFiltros] = useState<FiltrosCatalogo>(() => filtrosBase());
  const [orden, setOrden] = useState<OrdenCatalogo>("relevancia");
  const [pagina, setPagina] = useState(1);
  const [drawerAbierto, setDrawerAbierto] = useState(false);

  useEffect(() => {
    let activo = true;

    Promise.all([
      obtenerProductos<Producto>(),
      obtenerCategorias(),
      obtenerMarcas(),
    ])
      .then(([productos, categorias, marcas]) => {
        if (!activo) return;
        setProductosApi(productos);
        setCategoriasApi(categorias);
        setMarcasApi(marcas);
        setFiltros(filtrosBase());
      })
      .catch((err: unknown) => {
        if (!activo) return;
        setError(
          err instanceof Error
            ? err.message
            : "No fue posible cargar el catálogo de productos."
        );
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, []);

  const vistas = useMemo(
    () =>
      construirCatalogo({
        productos: productosApi,
        categorias: categoriasApi,
        marcas: marcasApi,
      }),
    [productosApi, categoriasApi, marcasApi]
  );

  const catalogo = useMemo(() => prepararCatalogo(vistas), [vistas]);
  const filtrados = useMemo(
    () => filtrarProductos(vistas, filtros),
    [vistas, filtros]
  );
  const ordenados = useMemo(
    () => ordenarProductos(filtrados, orden),
    [filtrados, orden]
  );
  const paginaActual = useMemo(
    () => paginar(ordenados, pagina, POR_PAGINA),
    [ordenados, pagina]
  );
  const chips = useMemo(() => construirChips(filtros), [filtros]);
  const hayFiltros = useMemo(
    () => hayFiltrosActivos(filtros, catalogo.rangoPrecio),
    [filtros, catalogo.rangoPrecio]
  );

  function actualizarFiltros(nuevos: FiltrosCatalogo) {
    setFiltros(nuevos);
    setPagina(1);
  }

  function limpiarFiltros() {
    actualizarFiltros(filtrosBase());
  }

  function cambiarOrden(nuevo: OrdenCatalogo) {
    setOrden(nuevo);
    setPagina(1);
  }

  function cerrarFiltros() {
    setDrawerAbierto(false);
    botonFiltrosRef.current?.focus();
  }

  function quitarChip(chip: ChipFiltro) {
    switch (chip.tipo) {
      case "busqueda":
        actualizarFiltros({ ...filtros, busqueda: "" });
        break;
      case "categoria":
        actualizarFiltros({
          ...filtros,
          categorias: filtros.categorias.filter(
            (categoria) => categoria !== chip.valor
          ),
        });
        break;
      case "marca":
        actualizarFiltros({
          ...filtros,
          marcas: filtros.marcas.filter((marca) => marca !== chip.valor),
        });
        break;
      case "precio":
        actualizarFiltros({
          ...filtros,
          precioMin: 0,
          precioMax: Number.MAX_SAFE_INTEGER,
        });
        break;
      case "caracteristica":
        actualizarFiltros({
          ...filtros,
          caracteristicas: filtros.caracteristicas.filter(
            (caracteristica) => caracteristica !== chip.valor
          ),
        });
        break;
    }
  }

  function abrirDetalle(vista: ProductoViewModel) {
    router.push(`/productos/${vista.idProducto}`);
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)] sm:text-3xl">
          Catálogo de productos
        </h1>
        <p className="mt-1 text-sm text-[var(--color-subtle)]">
          Compara especificaciones, precios y disponibilidad antes de decidir.
        </p>
      </header>

      <div className="mb-6">
        <SearchBar
          value={filtros.busqueda}
          onChange={(busqueda) => actualizarFiltros({ ...filtros, busqueda })}
        />
      </div>

      {cargando && (
        <div
          aria-live="polite"
          aria-busy="true"
          className="flex flex-col items-center justify-center rounded-lg border border-[var(--color-hairline)] bg-[var(--color-paper)] p-12 text-center"
        >
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-hairline)] border-t-[var(--color-brand-blue)]" />
          <p className="mt-4 text-sm text-[var(--color-subtle)]">
            Cargando catálogo de productos…
          </p>
        </div>
      )}

      {!cargando && error && (
        <div
          role="alert"
          className="rounded-lg border border-[var(--color-hairline)] bg-[var(--color-paper)] p-6"
        >
          <p className="text-sm font-semibold text-[var(--color-ink)]">
            No pudimos cargar el catálogo
          </p>
          <p className="mt-1 text-sm text-[var(--color-subtle)]">{error}</p>
        </div>
      )}

      {!cargando && !error && (
        <div className="grid gap-6 md:grid-cols-[260px_1fr]">
          <FilterSidebar
            catalogo={catalogo}
            filtros={filtros}
            onCambiar={actualizarFiltros}
            onLimpiar={limpiarFiltros}
            hayFiltros={hayFiltros}
            abierto={drawerAbierto}
            onCerrar={cerrarFiltros}
          />

          <section aria-label="Resultados del catálogo">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <button
                ref={botonFiltrosRef}
                type="button"
                onClick={() => setDrawerAbierto(true)}
                aria-expanded={drawerAbierto}
                aria-controls="filtros-catalogo"
                className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-[var(--color-hairline)] bg-[var(--color-paper)] px-3 py-2 text-sm font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-canvas)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-blue)]/40 md:hidden"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  strokeLinecap="round"
                  className="h-4 w-4"
                >
                  <path d="M4 6h16M7 12h10M10 18h4" />
                </svg>
                Filtros
              </button>

              <div className="flex items-center gap-2 sm:ml-auto">
                <label
                  htmlFor="orden-catalogo"
                  className="text-xs font-medium text-[var(--color-subtle)]"
                >
                  Ordenar por
                </label>
                <select
                  id="orden-catalogo"
                  value={orden}
                  onChange={(event) =>
                    cambiarOrden(event.target.value as OrdenCatalogo)
                  }
                  className="cursor-pointer rounded-md border border-[var(--color-hairline)] bg-[var(--color-paper)] px-3 py-2 text-sm font-medium text-[var(--color-ink)] transition-colors focus:border-[var(--color-brand-blue)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-blue)]/40"
                >
                  {ORDENES_CATALOGO.map((opcion) => (
                    <option key={opcion.valor} value={opcion.valor}>
                      {opcion.etiqueta}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {chips.length > 0 && (
              <div className="mb-4">
                <FilterChips chips={chips} onQuitar={quitarChip} />
              </div>
            )}

            {paginaActual.total === 0 ? (
              <div
                role="status"
                className="rounded-lg border border-dashed border-[var(--color-hairline)] bg-[var(--color-paper)] p-10 text-center"
              >
                <p className="text-sm font-semibold text-[var(--color-ink)]">
                  No encontramos productos con esos filtros
                </p>
                <p className="mt-1 text-sm text-[var(--color-subtle)]">
                  Ajusta la búsqueda o limpia los filtros para ver más
                  resultados.
                </p>
                <button
                  type="button"
                  onClick={limpiarFiltros}
                  className="mt-4 cursor-pointer rounded-md bg-[var(--color-brand-solid)] px-4 py-2 text-sm font-semibold text-[var(--color-on-solid)] transition-colors hover:bg-[var(--color-brand-solid)]/90"
                >
                  Limpiar filtros
                </button>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {paginaActual.items.map((vista) => (
                    <TarjetaProducto
                      key={vista.idProducto}
                      producto={vista}
                      onVerDetalle={abrirDetalle}
                    />
                  ))}
                </div>

                <div className="mt-6">
                  <Pagination
                    pagina={paginaActual.pagina}
                    totalPaginas={paginaActual.totalPaginas}
                    total={paginaActual.total}
                    onCambiar={setPagina}
                  />
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
