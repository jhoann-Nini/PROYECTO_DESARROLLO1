"use client";

interface SearchBarProps {
  value?: string;
  onChange?: (val: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}

export default function SearchBar({
  value = "",
  onChange,
  placeholder = "Buscar por marca, modelo o categoría (ej. iPhone, Lenovo)...",
  ariaLabel = "Buscar dispositivos tecnológicos por marca o modelo",
}: SearchBarProps) {
  return (
    <div className="relative flex items-center w-full">
      {/* Icono decorativo de búsqueda */}
      <div
        className="pointer-events-none absolute left-4 flex items-center justify-center text-[var(--color-subtle)]"
        aria-hidden="true"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Campo de búsqueda con accesibilidad y foco visible */}
      <input
        type="search"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="w-full rounded-lg border border-[var(--color-hairline)] bg-[var(--color-paper)] py-3.5 pl-11 pr-12 text-sm text-[var(--color-ink)] shadow-[var(--shadow-paper)] transition-colors placeholder:text-[var(--color-subtle)] hover:border-[var(--color-subtle)]/40 focus:border-[var(--color-brand-blue)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-blue)]"
      />

      {/* Botón para limpiar búsqueda con etiqueta accesible */}
      {value.trim().length > 0 && (
        <button
          type="button"
          onClick={() => onChange?.("")}
          aria-label="Borrar texto de búsqueda"
          className="absolute right-3.5 flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[var(--color-subtle)] transition-colors hover:bg-[var(--color-canvas)] hover:text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-blue)]"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
