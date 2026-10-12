"use client";

interface SearchBarProps {
  value?: string;
  onChange?: (val: string) => void;
  placeholder?: string;
}

export default function SearchBar({
  value = "",
  onChange,
  placeholder = "Buscar por marca, modelo o categoría (ej. iPhone, Lenovo)...",
}: SearchBarProps) {
  return (
    <div className="relative flex items-center w-full">
      {/* Icono decorativo de búsqueda */}
      <div
        className="pointer-events-none absolute left-4 text-slate-400 flex items-center justify-center"
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
        aria-label="Buscar dispositivos tecnológicos por marca o modelo"
        className="w-full rounded-xl border border-slate-300 bg-white py-3.5 pl-11 pr-12 text-sm text-slate-900 placeholder:text-slate-500 shadow-xs transition-colors hover:border-slate-400 focus:border-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
      />

      {/* Botón para limpiar búsqueda con etiqueta accesible */}
      {value.trim().length > 0 && (
        <button
          type="button"
          onClick={() => onChange?.("")}
          aria-label="Borrar texto de búsqueda"
          className="absolute right-3.5 flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none cursor-pointer"
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
