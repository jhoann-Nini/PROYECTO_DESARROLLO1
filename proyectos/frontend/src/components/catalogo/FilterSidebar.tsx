"use client";

import type {
  CatalogoPreparado,
  FiltrosCatalogo,
} from "@/data/catalogo";
import type {
  CaracteristicaClave,
} from "@/data/productoViewModel";
import type { CategoriaDispositivo } from "@/types/producto";
import { formatearCOP } from "@/data/specsHelper";

interface FilterSidebarProps {
  catalogo: CatalogoPreparado;
  filtros: FiltrosCatalogo;
  onCambiar: (filtros: FiltrosCatalogo) => void;
  onLimpiar: () => void;
  hayFiltros: boolean;
}

function alternar<T>(lista: T[], valor: T): T[] {
  return lista.includes(valor)
    ? lista.filter((item) => item !== valor)
    : [...lista, valor];
}

export default function FilterSidebar({
  catalogo,
  filtros,
  onCambiar,
  onLimpiar,
  hayFiltros,
}: FilterSidebarProps) {
  const { rangoPrecio } = catalogo;
  const rangoValido = rangoPrecio.max > 0;
  const minActual = Math.max(filtros.precioMin, rangoPrecio.min);
  const maxActual = Math.min(filtros.precioMax, rangoPrecio.max);

  return (
    <aside
      aria-label="Filtros del catálogo"
      className="rounded-lg border border-[var(--color-hairline)] bg-[var(--color-paper)] p-4 shadow-[var(--shadow-paper)]"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-[var(--color-ink)]">
          Filtros
        </h2>
        <button
          type="button"
          onClick={onLimpiar}
          disabled={!hayFiltros}
          className="cursor-pointer rounded-md px-2 py-1 text-xs font-medium text-[var(--color-brand-blue)] transition-colors hover:bg-[var(--color-canvas)] disabled:cursor-not-allowed disabled:text-[var(--color-subtle)]/50"
        >
          Limpiar filtros
        </button>
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
                  className="h-4 w-4 accent-[var(--color-brand-blue)]"
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
        <ul className="mt-2 max-h-52 space-y-2 overflow-y-auto pr-1">
          {catalogo.marcas.map((marca) => (
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
                  className="h-4 w-4 accent-[var(--color-brand-blue)]"
                />
                <span className="flex-1">
                  {marca.nombre} ({marca.cantidad})
                </span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <fieldset className="mt-5" disabled={!rangoValido}>
        <legend className="text-xs font-semibold uppercase tracking-wide text-[var(--color-subtle)]">
          Precio
        </legend>
        <div className="mt-2 space-y-3">
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
                const precioMin =
                  valor <= rangoPrecio.min ? 0 : valor;
                onCambiar({
                  ...filtros,
                  precioMin,
                  precioMax: Math.max(filtros.precioMax, valor),
                });
              }}
              className="mt-1 w-full accent-[var(--color-brand-blue)]"
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
              className="mt-1 w-full accent-[var(--color-brand-blue)]"
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
                  className="h-4 w-4 accent-[var(--color-brand-blue)]"
                />
                <span className="flex-1">
                  {caracteristica.etiqueta} ({caracteristica.cantidad})
                </span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
    </aside>
  );
}
