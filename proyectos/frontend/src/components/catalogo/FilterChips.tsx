"use client";

import type { ChipFiltro } from "@/data/catalogo";
import { CLASE_FOCO } from "@/components/ui/foco";

interface FilterChipsProps {
  chips: ChipFiltro[];
  onQuitar: (chip: ChipFiltro) => void;
}

export default function FilterChips({ chips, onQuitar }: FilterChipsProps) {
  if (chips.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-2" aria-label="Filtros activos">
      {chips.map((chip) => (
        <li key={`${chip.tipo}-${chip.valor}`}>
          <span className="inline-flex items-center gap-1 rounded-md border border-[var(--color-hairline)] bg-[var(--color-paper)] py-1 pl-2.5 pr-1 text-xs font-medium text-[var(--color-ink)]">
            {chip.etiqueta}
            <button
              type="button"
              onClick={() => onQuitar(chip)}
              aria-label={`Quitar filtro ${chip.etiqueta}`}
              className={`flex h-5 w-5 cursor-pointer items-center justify-center rounded text-[var(--color-subtle)] transition-colors hover:bg-[var(--color-canvas)] hover:text-[var(--color-ink)] ${CLASE_FOCO}`}
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
  );
}
