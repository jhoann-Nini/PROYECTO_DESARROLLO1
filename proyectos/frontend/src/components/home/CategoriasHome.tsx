import Link from "next/link";
import {
  CATEGORIAS_NAVEGABLES,
  obtenerRutaCategoria,
} from "@/lib/categorias";

interface CategoriasHomeProps {
  onSeleccionarTodos: () => void;
}

export default function CategoriasHome({
  onSeleccionarTodos,
}: CategoriasHomeProps) {
  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="group"
      aria-label="Explorar por categoría"
    >
      <button
        type="button"
        onClick={onSeleccionarTodos}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-[var(--color-brand-solid)] px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[var(--color-brand-solid)]/90"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
        Todos
      </button>

      {CATEGORIAS_NAVEGABLES.map((categoria) => (
        <Link
          key={categoria.slug}
          href={obtenerRutaCategoria(categoria.slug)}
          title={`Ver todos los productos de ${categoria.etiqueta}`}
          className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-hairline)] bg-[var(--color-paper)] px-3.5 py-2 text-[13px] font-medium text-[var(--color-ink)] transition-colors hover:border-[var(--color-brand-blue)]/40 hover:text-[var(--color-brand-blue)]"
        >
          <span aria-hidden="true">{categoria.icono}</span>
          {categoria.etiqueta}
        </Link>
      ))}
    </div>
  );
}
