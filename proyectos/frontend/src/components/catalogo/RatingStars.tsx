interface RatingStarsProps {
  rating: number | null;
  cantidadResenas?: number | null;
  tamano?: "sm" | "md";
  etiquetaCantidad?: "reseñas" | "valoraciones" | "opiniones";
}

const ETIQUETAS = {
  reseñas: ["reseña", "reseñas"],
  valoraciones: ["valoración", "valoraciones"],
  opiniones: ["opinión", "opiniones"],
} as const;

export default function RatingStars({
  rating,
  cantidadResenas = null,
  tamano = "sm",
  etiquetaCantidad = "opiniones",
}: RatingStarsProps) {
  const valor = rating === null ? 0 : Math.min(5, Math.max(0, rating));
  const cantidad =
    cantidadResenas !== null &&
    cantidadResenas !== undefined &&
    cantidadResenas > 0
      ? Math.round(cantidadResenas)
      : null;
  const textoValor = valor.toFixed(1).replace(".", ",");
  const dimension = tamano === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  const [singular, plural] = ETIQUETAS[etiquetaCantidad];
  const textoCantidad =
    cantidad === null ? "Sin opiniones" : `(${cantidad} ${cantidad === 1 ? singular : plural})`;
  const ariaLabel =
    cantidad === null
      ? "Sin opiniones"
      : `Valoración ${textoValor} de 5, ${cantidad} ${
          cantidad === 1 ? singular : plural
        }`;

  return (
    <span
      role="img"
      aria-label={ariaLabel}
      className="inline-flex items-center gap-1.5"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className={dimension}
        fill="var(--color-star)"
        stroke="var(--color-star)"
        strokeWidth={1.5}
      >
        <path d="M10 2.5l2.35 4.76 5.25.76-3.8 3.7.9 5.23L10 14.48l-4.7 2.47.9-5.23-3.8-3.7 5.25-.76L10 2.5z" />
      </svg>
      <span className="text-xs font-semibold text-[var(--color-ink)]">
        {textoValor}
      </span>
      <span aria-hidden="true" className="text-xs text-[var(--color-subtle)]">
        ·
      </span>
      <span className="text-xs text-[var(--color-subtle)]">{textoCantidad}</span>
    </span>
  );
}
