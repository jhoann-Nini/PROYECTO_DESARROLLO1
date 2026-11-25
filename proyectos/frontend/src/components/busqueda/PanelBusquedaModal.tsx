/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import ProductImagePlaceholder from "@/components/ProductImagePlaceholder";
import {
  AYUDA_NO_EN_CATALOGO,
  MENSAJE_BUSQUEDA_GENERICA,
  TITULO_ALTERNATIVAS,
  analizarBusqueda,
  ayudaBusquedaGenerica,
  buscarAlternativas,
  filtrarProductos,
  mensajeNoEnCatalogo,
  textoProductosEncontrados,
} from "@/data/catalogo";
import { construirCatalogo } from "@/data/catalogoApi";
import type { ProductoViewModel } from "@/data/productoViewModel";
import { obtenerProductos } from "@/services/api";
import type { CategoriaDispositivo, Producto } from "@/types/producto";

type FiltroCategoria = "todos" | CategoriaDispositivo;

const CATEGORIAS: { valor: FiltroCategoria; etiqueta: string }[] = [
  { valor: "todos", etiqueta: "Todos" },
  { valor: "moviles", etiqueta: "Celulares" },
  { valor: "tablets", etiqueta: "Tablets" },
  { valor: "laptops", etiqueta: "Portátiles" },
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

  const esIdApiValido =
    (typeof producto.idApi === "number" &&
      Number.isSafeInteger(producto.idApi) &&
      producto.idApi > 0) ||
    (typeof producto.idProducto === "number" &&
      Number.isSafeInteger(producto.idProducto) &&
      producto.idProducto > 0 &&
      producto.origen !== "mock" &&
      producto.origen !== "ranking");

  const idDestino =
    typeof producto.idApi === "number" &&
    Number.isSafeInteger(producto.idApi) &&
    producto.idApi > 0
      ? producto.idApi
      : esIdApiValido
        ? producto.idProducto
        : null;

  const contenido = (
    <>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-surface-0">
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
        <span className="block truncate text-base font-medium uppercase tracking-normal text-ink">
          {producto.nombre}
        </span>
        <span className="mt-0.5 block truncate text-xs text-subtle">
          {producto.marca} · {producto.categoriaEtiqueta}
        </span>
      </span>

      <span className="shrink-0 text-label font-medium uppercase tracking-normal text-ink">
        {producto.precioFormateado}
      </span>
    </>
  );

  if (idDestino) {
    return (
      <Link
        href={`/productos/${idDestino}`}
        onClick={() => {
          onSeleccionar?.(producto);
          onCerrar();
        }}
        className="group flex min-h-11 items-center gap-3 rounded-card border-b border-dotted border-line px-3 py-2.5 transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-blue)]"
      >
        {contenido}
      </Link>
    );
  }

  return (
    <div
      role={onSeleccionar ? "button" : undefined}
      tabIndex={onSeleccionar ? 0 : undefined}
      onClick={() => {
        onSeleccionar?.(producto);
        onCerrar();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSeleccionar?.(producto);
          onCerrar();
        }
      }}
      className={`group flex min-h-11 items-center gap-3 rounded-card border-b border-dotted border-line px-3 py-2.5 transition-colors ${
        onSeleccionar
          ? "cursor-pointer hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-blue)]"
          : "text-text-secondary"
      }`}
    >
      {contenido}
    </div>
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
        setProductosInternos(
          construirCatalogo({ productos: datos, categorias: [], marcas: [] }),
        );
      })
      .catch(() => {
        if (!activo) return;
        setProductosInternos([]);
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

  // Aviso según el tipo de búsqueda sin resultados.
  const busquedaGenerica = useMemo(() => analizarBusqueda(busqueda).generica, [busqueda]);
  const alternativas = useMemo(
    () =>
      busqueda.trim() && !busquedaGenerica && resultados.length === 0
        ? buscarAlternativas(catalogo, busqueda)
        : [],
    [catalogo, busqueda, busquedaGenerica, resultados.length],
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

  // Anuncio para lectores de pantalla («Se encontraron 1 producto» era incorrecto).
  const mensajeResultados = estaCargando
    ? "Buscando dispositivos…"
    : busquedaGenerica
      ? MENSAJE_BUSQUEDA_GENERICA
      : textoProductosEncontrados(resultados.length);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
      <div
        data-testid="backdrop-busqueda"
        aria-hidden="true"
        onClick={onCerrar}
        className="fixed inset-0 bg-inverse/60 backdrop-blur-sm"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-busqueda-modal"
        tabIndex={-1}
        onKeyDown={manejarTeclaPanel}
        className="relative z-10 flex max-h-[85dvh] w-full max-w-2xl flex-col overflow-hidden rounded-card border border-hairline bg-paper text-ink"
      >
        <div className="flex items-start justify-between gap-4 border-b border-dotted border-line p-card-padding">
          <div>
            <h2
              id="titulo-busqueda-modal"
              className="text-heading-sm font-medium uppercase tracking-normal text-ink"
            >
              Buscar dispositivos
            </h2>
            <p className="mt-1 text-xs text-subtle">
              Busca por marca o modelo.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <kbd className="hidden rounded-card border border-line bg-canvas px-2 py-1 font-sans text-micro font-medium uppercase tracking-normal text-subtle sm:inline">
              Esc para cerrar
            </kbd>
            <Button
              type="button"
              variant="secondary"
              onClick={onCerrar}
              aria-label="Cerrar búsqueda"
              className="h-11 w-11 shrink-0 p-0!"
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
            </Button>
          </div>
        </div>

        <div className="border-b border-dotted border-line p-card-padding">
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
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

            <Input
              ref={inputRef}
              type="search"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder="Busca por marca o modelo. Ej.: Galaxy S24, iPhone 16"
              aria-label="Buscar dispositivos por marca o modelo"
              className="sin-x-nativa pl-10 pr-12"
            />

            {busqueda ? (
              <button
                type="button"
                onClick={() => {
                  setBusqueda("");
                  inputRef.current?.focus();
                }}
                aria-label="Limpiar búsqueda"
                className="absolute right-0 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-subtle transition-colors hover:bg-paper hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-blue)]"
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
                  className={`min-h-11 cursor-pointer rounded-full border px-3.5 py-2 text-label font-medium uppercase tracking-normal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-blue)] ${
                    activa
                      ? "border-ink bg-ink text-canvas"
                      : "border-hairline bg-paper text-subtle hover:border-brand-blue hover:text-ink"
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
                  className="flex animate-pulse items-center gap-3 rounded-lg border border-hairline bg-paper p-3"
                >
                  <div className="h-12 w-12 shrink-0 rounded-md bg-hairline" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-4 w-3/4 rounded-full bg-hairline" />
                    <div className="h-3 w-1/2 rounded-full bg-hairline" />
                  </div>
                  <div className="h-3 w-20 shrink-0 rounded-full bg-hairline" />
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
              {busquedaGenerica ? (
                <>
                  <p className="text-base font-medium uppercase tracking-normal text-ink">
                    {MENSAJE_BUSQUEDA_GENERICA}
                  </p>
                  <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-subtle">
                    {ayudaBusquedaGenerica(busqueda)}
                  </p>
                </>
              ) : busqueda.trim() ? (
                <>
                  <p className="text-base font-medium uppercase tracking-normal text-ink">
                    {mensajeNoEnCatalogo(busqueda)}
                  </p>
                  <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-subtle">
                    {AYUDA_NO_EN_CATALOGO} Prueba con menos palabras, revisa la escritura o
                    cambia la categoría.
                  </p>
                  {alternativas.length > 0 && (
                    <div className="mt-4 text-left">
                      <p className="px-1 text-label font-medium uppercase tracking-normal text-ink">
                        {TITULO_ALTERNATIVAS}
                      </p>
                      <ul className="mt-1 space-y-1" aria-label={TITULO_ALTERNATIVAS}>
                        {alternativas.map((producto) => (
                          <li key={producto.idProducto}>
                            <FilaResultado
                              producto={producto}
                              onSeleccionar={onSeleccionarProducto}
                              onCerrar={onCerrar}
                            />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="text-base font-medium uppercase tracking-normal text-ink">
                    No se encontraron productos.
                  </p>
                  <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-subtle">
                    Prueba con otro término o cambia la categoría seleccionada.
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-dotted border-line px-5 py-3 text-micro text-subtle">
          <span>Selecciona un resultado para abrir su ficha.</span>
          <span>
            {estaCargando
              ? "Cargando…"
              : `${resultados.length} ${
                  resultados.length === 1 ? "resultado" : "resultados"
                }`}
          </span>
        </div>
      </div>
    </div>
  );
}
