"use client";

import type { ChipFiltro } from "@/data/catalogo";
import { CLASE_FOCO } from "@/components/ui/foco";

interface FilterChipsProps {
  chips: ChipFiltro[];
  onQuitar: (chip: ChipFiltro) => void;
  onLimpiar?: () => void;
}

export default function FilterChips({
  chips,
  onQuitar,
  onLimpiar,
}: FilterChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p
          className="text-xs font-medium text-subtle"
          aria-live="polite"
        >
          Filtros activos ({chips.length})
        </p>
        {onLimpiar && (
          <button
            type="button"
            onClick={onLimpiar}
            className={`cursor-pointer text-xs font-medium text-brand-blue transition-colors hover:underline ${CLASE_FOCO}`}
          >
            Borrar filtros
          </button>
        )}
      </div>
      <ul className="flex flex-wrap gap-2" aria-label="Filtros activos">
        {chips.map((chip) => (
          <li key={`${chip.tipo}-${chip.valor}`}>
            <span className="inline-flex items-center gap-1 rounded-card border border-hairline bg-paper py-1 pl-2.5 pr-1 text-xs font-medium text-ink">
              {chip.etiqueta}
              <button
                type="button"
                onClick={() => onQuitar(chip)}
                aria-label={`Quitar filtro ${chip.etiqueta}`}
                className={`flex h-5 w-5 cursor-pointer items-center justify-center rounded text-subtle transition-colors hover:bg-canvas hover:text-ink ${CLASE_FOCO}`}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  className="h-3.5 w-3.5"
                >
                  <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
