"use client";

import { useEffect, useMemo, useState } from "react";
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
  construirChips,
  filtrarProductos,
  hayFiltrosActivos,
  paginar,
  prepararCatalogo,
  type ChipFiltro,
  type FiltrosCatalogo,
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
  const [productosApi, setProductosApi] = useState<Producto[]>([]);
  const [categoriasApi, setCategoriasApi] = useState<CategoriaResponse[]>([]);
  const [marcasApi, setMarcasApi] = useState<MarcaResponse[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [filtros, setFiltros] = useState<FiltrosCatalogo>(() => filtrosBase());
  const [pagina, setPagina] = useState(1);

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
  const paginaActual = useMemo(
    () => paginar(filtrados, pagina, POR_PAGINA),
    [filtrados, pagina]
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
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <FilterSidebar
            catalogo={catalogo}
            filtros={filtros}
            onCambiar={actualizarFiltros}
            onLimpiar={limpiarFiltros}
            hayFiltros={hayFiltros}
          />

          <section aria-label="Resultados del catálogo">
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
                  className="mt-4 cursor-pointer rounded-md bg-[var(--color-brand-solid)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-solid)]/90"
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
