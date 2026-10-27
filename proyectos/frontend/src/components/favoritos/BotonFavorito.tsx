"use client";

import { useFavoritos } from "@/hooks/useFavoritos";

interface BotonFavoritoProps {
  idProducto: number;
  nombreProducto: string;
  compacto?: boolean;
  className?: string;
}

/**
 * Alterna un producto en la lista local de favoritos.
 * No requiere sesión: la persistencia es del navegador.
 */
export default function BotonFavorito({
  idProducto,
  nombreProducto,
  compacto = false,
  className = "",
}: BotonFavoritoProps) {
  const { ids, hidratado, alternar } = useFavoritos();
  const esFavorito = ids.includes(idProducto);
  const etiqueta = esFavorito
    ? `Quitar ${nombreProducto} de favoritos`
    : `Guardar ${nombreProducto} en favoritos`;

  function manejarClick(evento: React.MouseEvent<HTMLButtonElement>) {
    evento.stopPropagation();
    alternar(idProducto);
  }

  if (compacto) {
    return (
      <button
        type="button"
        onClick={manejarClick}
        disabled={!hidratado}
        aria-pressed={esFavorito}
        aria-label={etiqueta}
        title={esFavorito ? "Quitar de favoritos" : "Guardar en favoritos"}
        className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[var(--color-hairline)] bg-[var(--color-paper)]/95 text-[var(--color-subtle)] shadow-[var(--shadow-paper)] backdrop-blur transition-colors hover:border-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue)] disabled:cursor-wait disabled:opacity-60 ${
          esFavorito ? "text-[var(--color-brand-blue)]" : ""
        } ${className}`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill={esFavorito ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={1.75}
          className="h-4 w-4"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 20.25s-7.5-4.5-7.5-9.75A4.5 4.5 0 0 1 12 7.5a4.5 4.5 0 0 1 7.5 3c0 5.25-7.5 9.75-7.5 9.75Z"
          />
        </svg>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={manejarClick}
      disabled={!hidratado}
      aria-pressed={esFavorito}
      className={`inline-flex cursor-pointer items-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-wait disabled:opacity-60 ${
        esFavorito
          ? "border border-[var(--color-brand-blue)] bg-[var(--color-brand-blue)]/10 text-[var(--color-brand-blue)] hover:bg-[var(--color-brand-blue)]/15"
          : "border border-[var(--color-hairline)] bg-[var(--color-paper)] text-[var(--color-ink)] hover:border-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue)]"
      } ${className}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill={esFavorito ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={1.75}
        className="h-4 w-4"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 20.25s-7.5-4.5-7.5-9.75A4.5 4.5 0 0 1 12 7.5a4.5 4.5 0 0 1 7.5 3c0 5.25-7.5 9.75-7.5 9.75Z"
        />
      </svg>
      {!hidratado
        ? "Cargando favoritos…"
        : esFavorito
          ? "Guardado en favoritos"
          : "Guardar en favoritos"}
    </button>
  );
}
