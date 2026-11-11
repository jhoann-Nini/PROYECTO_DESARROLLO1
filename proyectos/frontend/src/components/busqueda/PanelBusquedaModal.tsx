/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import ProductImagePlaceholder from "@/components/ProductImagePlaceholder";
import { filtrarProductos } from "@/data/catalogo";
import { construirCatalogo } from "@/data/catalogoApi";
import { PRODUCTOS_MOCK } from "@/data/mockProductos";
import type { ProductoViewModel } from "@/data/productoViewModel";
import { obtenerProductos } from "@/services/api";
import type { CategoriaDispositivo, Producto } from "@/types/producto";

type FiltroCategoria = "todos" | CategoriaDispositivo;

const CATEGORIAS: { valor: FiltroCategoria; etiqueta: string }[] = [
  { valor: "todos", etiqueta: "Todos" },
  { valor: "moviles", etiqueta: "Celulares" },
  { valor: "tablets", etiqueta: "Tablets" },
  { valor: "laptops", etiqueta: "Portátiles / PC" },
  { valor: "auriculares", etiqueta: "Auriculares" },
];

const SELECTOR_ENFOCABLES = [
  "a[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

export interface PanelBusquedaModalProps {
  abierto: boolean;
  onCerrar: () => void;
  /**
   * Catálogo ya construido. Si se omite, el panel lo carga al abrirse y cae a
   * los datos locales cuando la API no responde.
   */
  productos?: ProductoViewModel[];
  cargando?: boolean;
  onSeleccionarProducto?: (producto: ProductoViewModel) => void;
}

function FilaResultado({
  producto,
  onSeleccionar,
  onCerrar,
}: {
  producto: ProductoViewModel;
  onSeleccionar?: (producto: ProductoViewModel) => void;
  onCerrar: () => void;
}) {
  const [errorImagen, setErrorImagen] = useState(false);
  const tieneImagen = Boolean(producto.imagen) && !errorImagen;

  return (
    <Link
      href={`/productos/${producto.idProducto}`}
      onClick={() => {
        onSeleccionar?.(producto);
        onCerrar();
      }}
      className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-[var(--color-canvas)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-blue)]"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[var(--color-hairline)] bg-[var(--color-canvas)]">
        {tieneImagen ? (
          <img
            src={producto.imagen!}
            alt={`Fotografía de ${producto.nombre}`}
            loading="lazy"
            onError={() => setErrorImagen(true)}
            className="h-full w-full object-contain"
          />
        ) : (
          <ProductImagePlaceholder
            categoria={producto.categoriaEtiqueta}
            marca={producto.marca}
            nombre={producto.nombre}
            tamano="sm"
            tema="claro"
          />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[var(--color-ink)]">
          {producto.nombre}
        </span>
        <span className="mt-0.5 block truncate text-xs text-[var(--color-subtle)]">
          {producto.marca} · {producto.categoriaEtiqueta}
        </span>
      </span>

      <span className="shrink-0 text-xs font-semibold text-[var(--color-ink)]">
        {producto.precioFormateado}
      </span>
    </Link>
  );
}

export default function PanelBusquedaModal({
  abierto,
  onCerrar,
  productos,
  cargando,
  onSeleccionarProducto,
}: PanelBusquedaModalProps) {
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState<FiltroCategoria>("todos");
  const [productosInternos, setProductosInternos] = useState<ProductoViewModel[]>(
    [],
  );
  const [cargandoInterno, setCargandoInterno] = useState(true);
  const catalogoSolicitadoRef = useRef(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const disparadorRef = useRef<HTMLElement | null>(null);

  const catalogo = productos ?? productosInternos;
  const estaCargando =
    cargando ?? (productos === undefined && cargandoInterno);

  useEffect(() => {
    if (
      !abierto ||
      productos !== undefined ||
      catalogoSolicitadoRef.current
    ) {
      return;
    }

    catalogoSolicitadoRef.current = true;
    let activo = true;

    obtenerProductos<Producto>()
      .then((datos) => {
        if (!activo) return;
        const base = datos.length > 0 ? datos : PRODUCTOS_MOCK;
        setProductosInternos(
          construirCatalogo({ productos: base, categorias: [], marcas: [] }),
        );
      })
      .catch(() => {
        if (!activo) return;
        setProductosInternos(
          construirCatalogo({
            productos: PRODUCTOS_MOCK,
            categorias: [],
            marcas: [],
          }),
        );
      })
      .finally(() => {
        if (activo) setCargandoInterno(false);
      });

    return () => {
      activo = false;
    };
  }, [abierto, productos]);

  useEffect(() => {
    if (!abierto) return;

    disparadorRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    inputRef.current?.focus();

    return () => {
      disparadorRef.current?.focus();
    };
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;

    function manejarEscape(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        evento.preventDefault();
        onCerrar();
      }
    }

    window.addEventListener("keydown", manejarEscape);
    return () => window.removeEventListener("keydown", manejarEscape);
  }, [abierto, onCerrar]);

  const resultados = useMemo(
    () =>
      filtrarProductos(catalogo, {
        busqueda,
        categorias: categoria === "todos" ? [] : [categoria],
        marcas: [],
        precioMin: 0,
        precioMax: Number.MAX_SAFE_INTEGER,
        caracteristicas: [],
      }),
    [catalogo, busqueda, categoria],
  );

  function manejarTeclaPanel(evento: ReactKeyboardEvent<HTMLDivElement>) {
    if (evento.key !== "Tab") return;

    const contenedor = panelRef.current;
    if (!contenedor) return;

    const enfocables = Array.from(
      contenedor.querySelectorAll<HTMLElement>(SELECTOR_ENFOCABLES),
    ).filter((elemento) => elemento.tabIndex >= 0);

    if (enfocables.length === 0) {
      evento.preventDefault();
      contenedor.focus();
      return;
    }

    const primero = enfocables[0];
    const ultimo = enfocables[enfocables.length - 1];
    const activo = document.activeElement;

    if (evento.shiftKey && activo === primero) {
      evento.preventDefault();
      ultimo.focus();
      return;
    }

    if (!evento.shiftKey && activo === ultimo) {
      evento.preventDefault();
      primero.focus();
      return;
    }

    if (!contenedor.contains(activo)) {
      evento.preventDefault();
      primero.focus();
    }
  }

  if (!abierto) return null;

  const mensajeResultados = estaCargando
    ? "Buscando dispositivos..."
    : `Se encontraron ${resultados.length} ${
        resultados.length === 1 ? "producto" : "productos"
      }`;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
      <div
        data-testid="backdrop-busqueda"
        aria-hidden="true"
        onClick={onCerrar}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-busqueda-modal"
        tabIndex={-1}
        onKeyDown={manejarTeclaPanel}
        className="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[var(--color-hairline)] bg-[var(--color-paper)] text-[var(--color-ink)] shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-hairline)] p-5">
          <div>
            <h2
              id="titulo-busqueda-modal"
              className="text-lg font-semibold tracking-tight text-[var(--color-ink)]"
            >
              Buscar dispositivos
            </h2>
            <p className="mt-1 text-xs text-[var(--color-subtle)]">
              Encuentra por modelo, marca o especificación.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <kbd className="hidden rounded border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-2 py-1 text-[10px] font-semibold text-[var(--color-subtle)] sm:inline">
              Esc para cerrar
            </kbd>
            <button
              type="button"
              onClick={onCerrar}
              aria-label="Cerrar búsqueda"
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-[var(--color-hairline)] bg-[var(--color-paper)] text-[var(--color-subtle)] transition-colors hover:border-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-blue)]"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="border-b border-[var(--color-hairline)] p-5">
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-subtle)]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.35-4.35" />
            </svg>

            <input
              ref={inputRef}
              type="search"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder="Buscar por modelo, marca o especificación..."
              aria-label="Buscar por modelo, marca o especificación"
              className="w-full rounded-lg border border-[var(--color-hairline)] bg-[var(--color-canvas)] py-3 pl-10 pr-11 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-subtle)] transition-colors focus:border-[var(--color-brand-blue)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-blue)]/40"
            />

            {busqueda ? (
              <button
                type="button"
                onClick={() => {
                  setBusqueda("");
                  inputRef.current?.focus();
                }}
                aria-label="Limpiar búsqueda"
                className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-[var(--color-subtle)] transition-colors hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-blue)]"
              >
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            ) : null}
          </div>

          <div
            role="group"
            aria-label="Filtrar por categoría"
            className="mt-4 flex flex-wrap gap-2"
          >
            {CATEGORIAS.map((opcion) => {
              const activa = categoria === opcion.valor;
              return (
                <button
                  key={opcion.valor}
                  type="button"
                  aria-pressed={activa}
                  onClick={() => setCategoria(opcion.valor)}
                  className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-blue)] ${
                    activa
                      ? "border-[var(--color-brand-solid)] bg-[var(--color-brand-solid)] text-[var(--color-on-solid)]"
                      : "border-[var(--color-hairline)] bg-[var(--color-paper)] text-[var(--color-subtle)] hover:border-[var(--color-brand-blue)]/40 hover:text-[var(--color-ink)]"
                  }`}
                >
                  {opcion.etiqueta}
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <div
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
          >
            {mensajeResultados}
          </div>

          {estaCargando ? (
            <ul aria-hidden="true" className="space-y-2">
              {[0, 1, 2, 3].map((indice) => (
                <li
                  key={indice}
                  className="flex animate-pulse items-center gap-3 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-paper)] p-3"
                >
                  <div className="h-12 w-12 shrink-0 rounded-md bg-[var(--color-hairline)]" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-4 w-3/4 rounded bg-[var(--color-hairline)]" />
                    <div className="h-3 w-1/2 rounded bg-[var(--color-hairline)]" />
                  </div>
                  <div className="h-3 w-20 shrink-0 rounded bg-[var(--color-hairline)]" />
                </li>
              ))}
            </ul>
          ) : resultados.length > 0 ? (
            <ul className="space-y-1">
              {resultados.map((producto) => (
                <li key={producto.idProducto}>
                  <FilaResultado
                    producto={producto}
                    onSeleccionar={onSeleccionarProducto}
                    onCerrar={onCerrar}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-semibold text-[var(--color-ink)]">
                No se encontraron productos.
              </p>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-[var(--color-subtle)]">
                Prueba con otro término o cambia la categoría seleccionada.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[var(--color-hairline)] px-5 py-3 text-[11px] text-[var(--color-subtle)]">
          <span>Selecciona un resultado para abrir su ficha.</span>
          <span>
            {estaCargando
              ? "Cargando..."
              : `${resultados.length} ${
                  resultados.length === 1 ? "resultado" : "resultados"
                }`}
          </span>
        </div>
      </div>
    </div>
  );
}
