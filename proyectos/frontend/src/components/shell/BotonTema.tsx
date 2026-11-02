"use client";

import { useTema } from "@/hooks/useTema";
import { CLASE_FOCO } from "@/components/ui/foco";

export default function BotonTema() {
  const { tema, alternarTema } = useTema();

  const etiqueta =
    tema === "oscuro" ? "Cambiar a tema claro" : "Cambiar a tema oscuro";

  return (
    <button
      type="button"
      onClick={alternarTema}
      aria-label={etiqueta}
      aria-pressed={tema === "oscuro"}
      title={etiqueta}
      className={`inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-[var(--color-hairline)] bg-[var(--color-paper)] text-[var(--color-subtle)] transition-colors hover:border-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue)] ${CLASE_FOCO}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="hidden h-4 w-4 dark:block"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" />
      </svg>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="block h-4 w-4 dark:hidden"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
      </svg>
    </button>
  );
}
