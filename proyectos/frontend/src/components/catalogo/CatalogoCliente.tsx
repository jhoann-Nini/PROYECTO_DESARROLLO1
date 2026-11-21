"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  MENSAJE_BUSQUEDA_GENERICA,
  ORDENES_CATALOGO,
  analizarBusqueda,
  ayudaBusquedaGenerica,
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
import { useResumenOfertas } from "@/hooks/useResumenOfertas";
import type { ProductoViewModel } from "@/data/productoViewModel";
import { normalizarPresupuestoCOP } from "@/data/presupuesto";
import SearchBar from "@/components/SearchBar";
import { CLASE_FOCO } from "@/components/ui/foco";
import EstadoVacio from "@/components/ui/EstadoVacio";
import TarjetaProducto from "./TarjetaProducto";
import FilterSidebar from "./FilterSidebar";
import FilterChips from "./FilterChips";
import Pagination from "./Pagination";

const POR_PAGINA = 12;

function filtrosBase(precioMax = Number.MAX_SAFE_INTEGER): FiltrosCatalogo {
  return {
    busqueda: "",
    categorias: [],
    marcas: [],
    precioMin: 0,
    precioMax,
    caracteristicas: [],
    excluirMarcas: false,
  };
}

export default function CatalogoCliente() {
  const parametros = useSearchParams();
  const valores = parametros.getAll("precioMax");
  const presupuesto = valores.length === 1
    ? normalizarPresupuestoCOP(valores[0])
    : null;

  return (
    <CatalogoFiltrado
      key={presupuesto ?? "sin-presupuesto"}
      precioMaxInicial={presupuesto ?? Number.MAX_SAFE_INTEGER}
    />
  );
}

function CatalogoFiltrado({ precioMaxInicial }: { precioMaxInicial: number }) {
  const router = useRouter();
  const botonFiltrosRef = useRef<HTMLButtonElement>(null);
  const [productosApi, setProductosApi] = useState<Producto[]>([]);
  const [categoriasApi, setCategoriasApi] = useState<CategoriaResponse[]>([]);
  const [marcasApi, setMarcasApi] = useState<MarcaResponse[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [intento, setIntento] = useState(0);
  const [filtros, setFiltros] = useState<FiltrosCatalogo>(() => filtrosBase(precioMaxInicial));
  const [orden, setOrden] = useState<OrdenCatalogo>("relevancia");
  const [pagina, setPagina] = useState(1);
  const [drawerAbierto, setDrawerAbierto] = useState(false);

  useEffect(() => {
    let activo = true;

    // Los productos son el contenido principal: no bloquearlos por los metadatos.
    obtenerProductos<Producto>()
      .then((productos) => {
        if (!activo) return;
        setProductosApi(productos);
        setError("");
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

    obtenerCategorias()
      .then((categorias) => {
        if (activo) setCategoriasApi(categorias);
      })
      .catch(() => {
        // Los filtros siguen disponibles con los productos aunque falle este metadato.
      });

    obtenerMarcas()
      .then((marcas) => {
        if (activo) setMarcasApi(marcas);
      })
      .catch(() => {
        // Los filtros siguen disponibles con los productos aunque falle este metadato.
      });

    return () => {
      activo = false;
    };
  }, [intento]);

  const resumenOfertas = useResumenOfertas();
  const vistas = useMemo(
    () =>
      construirCatalogo({
        productos: productosApi,
        categorias: categoriasApi,
        marcas: marcasApi,
        resumenOfertas,
      }),
    [productosApi, categoriasApi, marcasApi, resumenOfertas]
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
      {
        const marcasRestantes = filtros.marcas.filter(
          (marca) => marca !== chip.valor
        );
        actualizarFiltros({
          ...filtros,
          marcas: marcasRestantes,
          excluirMarcas: marcasRestantes.length > 0 && filtros.excluirMarcas,
        });
        break;
      }
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
    const idDestino =
      typeof vista.idApi === "number" && Number.isSafeInteger(vista.idApi) && vista.idApi > 0
        ? vista.idApi
        : typeof vista.idProducto === "number" && Number.isSafeInteger(vista.idProducto) && vista.idProducto > 0
          ? vista.idProducto
          : null;
    if (idDestino) {
      router.push(`/productos/${idDestino}`);
    }
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
        <EstadoVacio
          tipo="error"
          titulo="No pudimos cargar el catálogo"
          descripcion={error}
          accion={{
            etiqueta: "Reintentar",
            onClick: () => {
              setCargando(true);
              setError("");
              setIntento((valor) => valor + 1);
            },
          }}
        />
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
                className={`inline-flex cursor-pointer items-center gap-2 rounded-md border border-[var(--color-hairline)] bg-[var(--color-paper)] px-3 py-2 text-sm font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-canvas)] md:hidden ${CLASE_FOCO}`}
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
                  className={`cursor-pointer rounded-md border border-[var(--color-hairline)] bg-[var(--color-paper)] px-3 py-2 text-sm font-medium text-[var(--color-ink)] transition-colors focus:border-[var(--color-brand-blue)] ${CLASE_FOCO}`}
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
                <FilterChips
                  chips={chips}
                  onQuitar={quitarChip}
                  onLimpiar={limpiarFiltros}
                />
              </div>
            )}

            {paginaActual.total === 0 ? (
              productosApi.length === 0 ? (
                <EstadoVacio
                  titulo="El catálogo está vacío"
                  descripcion="Aún no hay productos registrados en la plataforma."
                />
              ) : (
                analizarBusqueda(filtros.busqueda).generica ? (
                  <EstadoVacio
                    titulo={MENSAJE_BUSQUEDA_GENERICA}
                    descripcion={`${ayudaBusquedaGenerica(filtros.busqueda)} Para ver todos los de un tipo, usa el filtro de categoría.`}
                    accion={{ etiqueta: "Limpiar filtros", onClick: limpiarFiltros }}
                  />
                ) : (
                  <EstadoVacio
                    titulo="No encontramos productos con esos filtros"
                    descripcion="Puede existir en el mercado, pero no en nuestro catálogo. Ajusta la búsqueda o limpia los filtros."
                    accion={{ etiqueta: "Limpiar filtros", onClick: limpiarFiltros }}
                  />
                )
              )
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
