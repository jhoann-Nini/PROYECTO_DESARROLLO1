"use client";

import { CLASE_FOCO } from "@/components/ui/foco";

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
      className="flex flex-col items-center justify-between gap-3 border-t border-dotted border-line pt-4 sm:flex-row"
    >
      <p className="text-xs text-subtle">
        Página {pagina} de {totalPaginas} · {total}{" "}
        {total === 1 ? "producto" : "productos"}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onCambiar(pagina - 1)}
          disabled={pagina <= 1}
          className={`cursor-pointer rounded-card border border-hairline bg-paper px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:text-subtle ${CLASE_FOCO}`}
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={() => onCambiar(pagina + 1)}
          disabled={pagina >= totalPaginas}
          className={`cursor-pointer rounded-card border border-hairline bg-paper px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:text-subtle ${CLASE_FOCO}`}
        >
          Siguiente
        </button>
      </div>
    </nav>
  );
}
