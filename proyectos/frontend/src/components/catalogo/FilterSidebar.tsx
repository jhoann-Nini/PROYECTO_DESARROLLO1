"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import type {
  CatalogoPreparado,
  FiltrosCatalogo,
} from "@/data/catalogo";
import {
  normalizarTexto,
  type CaracteristicaClave,
} from "@/data/productoViewModel";
import type { CategoriaDispositivo } from "@/types/producto";
import { formatearCOP } from "@/data/specsHelper";
import { CLASE_FOCO } from "@/components/ui/foco";

interface FilterSidebarProps {
  catalogo: CatalogoPreparado;
  filtros: FiltrosCatalogo;
  onCambiar: (filtros: FiltrosCatalogo) => void;
  onLimpiar: () => void;
  hayFiltros: boolean;
  abierto?: boolean;
  onCerrar?: () => void;
}

const SELECTOR_ENFOCABLES = [
  "a[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

function alternar<T>(lista: T[], valor: T): T[] {
  return lista.includes(valor)
    ? lista.filter((item) => item !== valor)
    : [...lista, valor];
}

function textoPrecio(valor: number, limite: number, esMinimo: boolean): string {
  if (esMinimo) return valor > limite ? String(valor) : "";
  return valor < limite ? String(valor) : "";
}

export default function FilterSidebar({
  catalogo,
  filtros,
  onCambiar,
  onLimpiar,
  hayFiltros,
  abierto,
  onCerrar,
}: FilterSidebarProps) {
  const { rangoPrecio } = catalogo;
  const rangoValido = rangoPrecio.max > 0;
  const minActual = Math.max(filtros.precioMin, rangoPrecio.min);
  const maxActual = Math.min(filtros.precioMax, rangoPrecio.max);
  const modoDrawer = onCerrar !== undefined;
  const drawerAbierto = modoDrawer && Boolean(abierto);

  const panelRef = useRef<HTMLElement>(null);
  const cerrarRef = useRef<HTMLButtonElement>(null);
  const [busquedaMarca, setBusquedaMarca] = useState("");
  const baseMinTexto = textoPrecio(filtros.precioMin, rangoPrecio.min, true);
  const baseMaxTexto = textoPrecio(filtros.precioMax, rangoPrecio.max, false);
  const [edicionMin, setEdicionMin] = useState<{
    valor: string;
    base: string;
  } | null>(null);
  const [edicionMax, setEdicionMax] = useState<{
    valor: string;
    base: string;
  } | null>(null);
  const precioMinTexto =
    edicionMin && edicionMin.base === baseMinTexto
      ? edicionMin.valor
      : baseMinTexto;
  const precioMaxTexto =
    edicionMax && edicionMax.base === baseMaxTexto
      ? edicionMax.valor
      : baseMaxTexto;

  useEffect(() => {
    if (!drawerAbierto) return;
    cerrarRef.current?.focus();
  }, [drawerAbierto]);

  useEffect(() => {
    if (!drawerAbierto) return;

    function manejarEscape(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        evento.preventDefault();
        onCerrar?.();
      }
    }

    window.addEventListener("keydown", manejarEscape);
    return () => window.removeEventListener("keydown", manejarEscape);
  }, [drawerAbierto, onCerrar]);

  useEffect(() => {
    if (!drawerAbierto) return;

    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = overflowPrevio;
    };
  }, [drawerAbierto]);

  const busquedaNormalizada = normalizarTexto(busquedaMarca);
  const marcasFiltradas = catalogo.marcas.filter(
    (marca) =>
      filtros.marcas.includes(marca.nombre) ||
      normalizarTexto(marca.nombre).includes(busquedaNormalizada)
  );

  function confirmarPrecioMin() {
    if (!rangoValido) return;

    const texto = precioMinTexto.trim();
    if (texto === "") {
      setEdicionMin({ valor: "", base: baseMinTexto });
      if (filtros.precioMin !== 0) {
        onCambiar({ ...filtros, precioMin: 0 });
      }
      return;
    }

    const numero = Math.round(Number(texto));
    if (!Number.isFinite(numero)) {
      setEdicionMin(null);
      return;
    }

    const limitado = Math.min(
      Math.max(numero, rangoPrecio.min),
      rangoPrecio.max
    );
    const precioMin = limitado <= rangoPrecio.min ? 0 : limitado;
    const precioMax = Math.max(filtros.precioMax, limitado);

    setEdicionMin({
      valor: precioMin === 0 ? "" : String(precioMin),
      base: baseMinTexto,
    });
    if (precioMin !== filtros.precioMin || precioMax !== filtros.precioMax) {
      onCambiar({ ...filtros, precioMin, precioMax });
    }
  }

  function confirmarPrecioMax() {
    if (!rangoValido) return;

    const texto = precioMaxTexto.trim();
    if (texto === "") {
      setEdicionMax({ valor: "", base: baseMaxTexto });
      if (filtros.precioMax !== Number.MAX_SAFE_INTEGER) {
        onCambiar({ ...filtros, precioMax: Number.MAX_SAFE_INTEGER });
      }
      return;
    }

    const numero = Math.round(Number(texto));
    if (!Number.isFinite(numero)) {
      setEdicionMax(null);
      return;
    }

    const limitado = Math.min(
      Math.max(numero, rangoPrecio.min),
      rangoPrecio.max
    );
    const precioMax =
      limitado >= rangoPrecio.max ? Number.MAX_SAFE_INTEGER : limitado;
    const precioMin = Math.min(filtros.precioMin, limitado);

    setEdicionMax({
      valor: precioMax === Number.MAX_SAFE_INTEGER ? "" : String(precioMax),
      base: baseMaxTexto,
    });
    if (precioMin !== filtros.precioMin || precioMax !== filtros.precioMax) {
      onCambiar({ ...filtros, precioMin, precioMax });
    }
  }

  function manejarTeclaPanel(evento: ReactKeyboardEvent<HTMLElement>) {
    if (evento.key !== "Tab") return;

    const contenedor = panelRef.current;
    if (!contenedor) return;

    const enfocables = Array.from(
      contenedor.querySelectorAll<HTMLElement>(SELECTOR_ENFOCABLES)
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

  const clasesDrawer = modoDrawer
    ? `fixed inset-y-0 left-0 z-50 w-[85vw] max-w-sm overflow-y-auto rounded-r-lg border border-[var(--color-hairline)] bg-[var(--color-paper)] p-4 shadow-[var(--shadow-paper)] md:static md:inset-auto md:z-auto md:w-auto md:max-w-none md:overflow-visible md:rounded-lg ${
        drawerAbierto ? "block" : "hidden md:block"
      }`
    : "rounded-lg border border-[var(--color-hairline)] bg-[var(--color-paper)] p-4 shadow-[var(--shadow-paper)]";

  return (
    <>
      {drawerAbierto && (
        <div
          data-testid="backdrop-filtros"
          aria-hidden="true"
          onClick={onCerrar}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
        />
      )}

      <aside
        ref={panelRef}
        id="filtros-catalogo"
        role={drawerAbierto ? "dialog" : undefined}
        aria-modal={drawerAbierto ? true : undefined}
        aria-label="Filtros del catálogo"
        tabIndex={drawerAbierto ? -1 : undefined}
        onKeyDown={drawerAbierto ? manejarTeclaPanel : undefined}
        className={clasesDrawer}
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">
            Filtros
          </h2>
          <div className="flex items-center gap-1">
            {modoDrawer && (
              <button
                ref={cerrarRef}
                type="button"
                onClick={onCerrar}
                aria-label="Cerrar filtros"
                className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-[var(--color-subtle)] transition-colors hover:bg-[var(--color-canvas)] hover:text-[var(--color-ink)] md:hidden ${CLASE_FOCO}`}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  className="h-4 w-4"
                >
                  <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={onLimpiar}
              disabled={!hayFiltros}
              className={`cursor-pointer rounded-md px-2 py-1 text-xs font-medium text-[var(--color-brand-blue)] transition-colors hover:bg-[var(--color-canvas)] disabled:cursor-not-allowed disabled:text-[var(--color-subtle)]/50 ${CLASE_FOCO}`}
            >
              Limpiar filtros
            </button>
          </div>
        </div>

        <fieldset className="mt-5">
          <legend className="text-xs font-semibold uppercase tracking-wide text-[var(--color-subtle)]">
            Categoría
          </legend>
          <ul className="mt-2 space-y-2">
            {catalogo.categorias.map((categoria) => (
              <li key={categoria.valor}>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-ink)]">
                  <input
                    type="checkbox"
                    checked={filtros.categorias.includes(categoria.valor)}
                    onChange={() =>
                      onCambiar({
                        ...filtros,
                        categorias: alternar<CategoriaDispositivo>(
                          filtros.categorias,
                          categoria.valor
                        ),
                      })
                    }
                    className={`h-4 w-4 accent-[var(--color-brand-blue)] ${CLASE_FOCO}`}
                  />
                  <span className="flex-1">
                    {categoria.etiqueta} ({categoria.cantidad})
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        <fieldset className="mt-5">
          <legend className="text-xs font-semibold uppercase tracking-wide text-[var(--color-subtle)]">
            Marca
          </legend>
          <input
            type="search"
            value={busquedaMarca}
            onChange={(event) => setBusquedaMarca(event.target.value)}
            placeholder="Buscar marca..."
            aria-label="Buscar marcas"
            className={`mt-2 w-full rounded-md border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-3 py-1.5 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-subtle)] transition-colors focus:border-[var(--color-brand-blue)] ${CLASE_FOCO}`}
          />
          {marcasFiltradas.length > 0 ? (
            <ul className="mt-2 max-h-52 space-y-2 overflow-y-auto pr-1">
              {marcasFiltradas.map((marca) => (
                <li key={marca.nombre}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-ink)]">
                    <input
                      type="checkbox"
                      checked={filtros.marcas.includes(marca.nombre)}
                      onChange={() =>
                        onCambiar({
                          ...filtros,
                          marcas: alternar(filtros.marcas, marca.nombre),
                        })
                      }
                      className={`h-4 w-4 accent-[var(--color-brand-blue)] ${CLASE_FOCO}`}
                    />
                    <span className="flex-1">
                      {marca.nombre} ({marca.cantidad})
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-[var(--color-subtle)]">
              No encontramos marcas.
            </p>
          )}
        </fieldset>

        <fieldset className="mt-5" disabled={!rangoValido}>
          <legend className="text-xs font-semibold uppercase tracking-wide text-[var(--color-subtle)]">
            Precio
          </legend>
          <div className="mt-2 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs text-[var(--color-subtle)]">
                Precio mínimo en pesos
                <input
                  type="number"
                  inputMode="numeric"
                  min={rangoPrecio.min}
                  max={rangoPrecio.max}
                  step={1}
                  value={precioMinTexto}
                  onChange={(event) =>
                    setEdicionMin({
                      valor: event.target.value,
                      base: baseMinTexto,
                    })
                  }
                  onBlur={confirmarPrecioMin}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      confirmarPrecioMin();
                    }
                  }}
                  placeholder={formatearCOP(rangoPrecio.min)}
                  className={`mt-1 w-full rounded-md border border-[var(--color-hairline)] bg-[var(--color-paper)] px-2.5 py-1.5 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-subtle)] transition-colors focus:border-[var(--color-brand-blue)] ${CLASE_FOCO}`}
                />
              </label>
              <label className="block text-xs text-[var(--color-subtle)]">
                Precio máximo en pesos
                <input
                  type="number"
                  inputMode="numeric"
                  min={rangoPrecio.min}
                  max={rangoPrecio.max}
                  step={1}
                  value={precioMaxTexto}
                  onChange={(event) =>
                    setEdicionMax({
                      valor: event.target.value,
                      base: baseMaxTexto,
                    })
                  }
                  onBlur={confirmarPrecioMax}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      confirmarPrecioMax();
                    }
                  }}
                  placeholder={formatearCOP(rangoPrecio.max)}
                  className={`mt-1 w-full rounded-md border border-[var(--color-hairline)] bg-[var(--color-paper)] px-2.5 py-1.5 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-subtle)] transition-colors focus:border-[var(--color-brand-blue)] ${CLASE_FOCO}`}
                />
              </label>
            </div>

            <label className="block text-xs text-[var(--color-subtle)]">
              Mínimo: {formatearCOP(minActual)}
              <input
                type="range"
                aria-label="Precio mínimo"
                min={rangoPrecio.min}
                max={rangoPrecio.max}
                step={100000}
                value={minActual}
                onChange={(event) => {
                  const valor = Number(event.target.value);
                  const precioMin = valor <= rangoPrecio.min ? 0 : valor;
                  onCambiar({
                    ...filtros,
                    precioMin,
                    precioMax: Math.max(filtros.precioMax, valor),
                  });
                }}
                className={`mt-1 w-full accent-[var(--color-brand-blue)] ${CLASE_FOCO}`}
              />
            </label>
            <label className="block text-xs text-[var(--color-subtle)]">
              Máximo: {formatearCOP(maxActual)}
              <input
                type="range"
                aria-label="Precio máximo"
                min={rangoPrecio.min}
                max={rangoPrecio.max}
                step={100000}
                value={maxActual}
                onChange={(event) => {
                  const valor = Number(event.target.value);
                  const precioMax =
                    valor >= rangoPrecio.max
                      ? Number.MAX_SAFE_INTEGER
                      : valor;
                  onCambiar({
                    ...filtros,
                    precioMax,
                    precioMin: Math.min(filtros.precioMin, valor),
                  });
                }}
                className={`mt-1 w-full accent-[var(--color-brand-blue)] ${CLASE_FOCO}`}
              />
            </label>
          </div>
        </fieldset>

        <fieldset className="mt-5">
          <legend className="text-xs font-semibold uppercase tracking-wide text-[var(--color-subtle)]">
            Características
          </legend>
          <ul className="mt-2 space-y-2">
            {catalogo.caracteristicas.map((caracteristica) => (
              <li key={caracteristica.valor}>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-ink)]">
                  <input
                    type="checkbox"
                    checked={filtros.caracteristicas.includes(
                      caracteristica.valor
                    )}
                    onChange={() =>
                      onCambiar({
                        ...filtros,
                        caracteristicas: alternar<CaracteristicaClave>(
                          filtros.caracteristicas,
                          caracteristica.valor
                        ),
                      })
                    }
                    className={`h-4 w-4 accent-[var(--color-brand-blue)] ${CLASE_FOCO}`}
                  />
                  <span className="flex-1">
                    {caracteristica.etiqueta} ({caracteristica.cantidad})
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        {modoDrawer && (
          <div className="mt-5 border-t border-[var(--color-hairline)] pt-4 md:hidden">
            <button
              type="button"
              onClick={onCerrar}
              className={`w-full cursor-pointer rounded-md bg-[var(--color-brand-solid)] px-4 py-2 text-sm font-semibold text-[var(--color-on-solid)] transition-colors hover:bg-[var(--color-brand-solid)]/90 ${CLASE_FOCO}`}
            >
              Ver resultados
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
