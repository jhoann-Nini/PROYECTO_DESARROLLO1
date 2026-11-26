"use client";

import type { FocusEvent } from "react";
import Input from "@/components/ui/Input";
import { CLASE_FOCO } from "@/components/ui/foco";

interface SearchBarProps {
  value?: string;
  onChange?: (val: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  onFocus?: () => void;
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
}

export default function SearchBar({
  value = "",
  onChange,
  placeholder = "Busca por marca o modelo. Ej.: Galaxy S24, iPhone 16",
  ariaLabel = "Buscar dispositivos tecnológicos por marca o modelo",
  onFocus,
  onBlur,
}: SearchBarProps) {
  return (
    <div className="relative flex items-center w-full">
      {/* Icono decorativo de búsqueda */}
      <div
        className="pointer-events-none absolute left-4 flex items-center justify-center text-subtle"
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
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onFocus={onFocus}
        onBlur={onBlur}
        className="sin-x-nativa pl-11 pr-12"
      />

      {/* Botón para limpiar búsqueda con etiqueta accesible */}
      {value.trim().length > 0 && (
        <button
          type="button"
          onClick={() => onChange?.("")}
          aria-label="Borrar texto de búsqueda"
          className={`absolute right-0 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-subtle transition-colors hover:bg-surface-muted hover:text-ink ${CLASE_FOCO}`}
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
