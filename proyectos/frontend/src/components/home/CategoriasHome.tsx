import type { ReactNode } from "react";
import Link from "next/link";
import {
  CATEGORIAS_NAVEGABLES,
  obtenerRutaCategoria,
  type CategoriaSlug,
} from "@/lib/categorias";

interface CategoriasHomeProps {
  onSeleccionarTodos: () => void;
}

const ICONOS_CATEGORIA: Record<CategoriaSlug, ReactNode> = {
  celulares: (
    <>
      <rect x="7" y="2.75" width="10" height="18.5" rx="2.5" />
      <path d="M10.75 18.5h2.5" />
    </>
  ),
  tablets: (
    <>
      <rect x="4.5" y="3.5" width="15" height="17" rx="2.5" />
      <path d="M10.75 17.75h2.5" />
    </>
  ),
  portatiles: (
    <>
      <rect x="4.5" y="4.75" width="15" height="10.5" rx="1.8" />
      <path d="M2.5 18.75h19" />
      <path d="M9.5 15.25h5" />
    </>
  ),
  auriculares: (
    <>
      <path d="M4.5 14.25v-2.5a7.5 7.5 0 0 1 15 0v2.5" />
      <rect x="2.75" y="13.5" width="4" height="7" rx="2" />
      <rect x="17.25" y="13.5" width="4" height="7" rx="2" />
    </>
  ),
};

function IconoCategoria({ slug }: { slug: CategoriaSlug }) {
  return (
    <svg
      className="h-[18px] w-[18px] shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONOS_CATEGORIA[slug]}
    </svg>
  );
}

export default function CategoriasHome({
  onSeleccionarTodos,
}: CategoriasHomeProps) {
  return (
    <div
      className="flex flex-wrap items-center gap-2.5"
      role="group"
      aria-label="Explorar por categoría"
    >
      <button
        type="button"
        onClick={onSeleccionarTodos}
        className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[var(--color-brand-solid)] px-4 py-2 text-[13px] font-semibold text-white shadow-[var(--shadow-paper)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--color-brand-solid)]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-blue)]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-canvas)]"
      >
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15"
          aria-hidden="true"
        >
          <svg
            className="h-[18px] w-[18px]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
            <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
            <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
            <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
          </svg>
        </span>
        Todos
      </button>

      {CATEGORIAS_NAVEGABLES.map((categoria) => (
        <Link
          key={categoria.slug}
          href={obtenerRutaCategoria(categoria.slug)}
          title={`Ver todos los productos de ${categoria.etiqueta}`}
          className="group inline-flex items-center gap-2 rounded-full border border-[var(--color-hairline)] bg-[var(--color-paper)] px-4 py-2 text-[13px] font-medium text-[var(--color-ink)] shadow-[var(--shadow-paper)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-brand-blue)]/45 hover:bg-[var(--color-brand-blue)]/5 hover:text-[var(--color-brand-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-blue)]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-canvas)]"
        >
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-canvas)] text-[var(--color-brand-blue)] transition-colors duration-200 group-hover:bg-[var(--color-brand-blue)]/10"
            aria-hidden="true"
          >
            <IconoCategoria slug={categoria.slug} />
          </span>
          {categoria.etiqueta}
        </Link>
      ))}
    </div>
  );
}
