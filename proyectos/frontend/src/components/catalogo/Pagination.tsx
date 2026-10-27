"use client";

interface PaginationProps {
  pagina: number;
  totalPaginas: number;
  total: number;
  onCambiar: (pagina: number) => void;
}

export default function Pagination({
  pagina,
  totalPaginas,
  total,
  onCambiar,
}: PaginationProps) {
  return (
    <nav
      aria-label="Paginación del catálogo"
      className="flex flex-col items-center justify-between gap-3 border-t border-[var(--color-hairline)] pt-4 sm:flex-row"
    >
      <p className="text-xs text-[var(--color-subtle)]">
        Página {pagina} de {totalPaginas} · {total}{" "}
        {total === 1 ? "producto" : "productos"}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onCambiar(pagina - 1)}
          disabled={pagina <= 1}
          className="cursor-pointer rounded-md border border-[var(--color-hairline)] bg-[var(--color-paper)] px-3 py-1.5 text-xs font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-canvas)] disabled:cursor-not-allowed disabled:text-[var(--color-subtle)]/50"
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={() => onCambiar(pagina + 1)}
          disabled={pagina >= totalPaginas}
          className="cursor-pointer rounded-md border border-[var(--color-hairline)] bg-[var(--color-paper)] px-3 py-1.5 text-xs font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-canvas)] disabled:cursor-not-allowed disabled:text-[var(--color-subtle)]/50"
        >
          Siguiente
        </button>
      </div>
    </nav>
  );
}
