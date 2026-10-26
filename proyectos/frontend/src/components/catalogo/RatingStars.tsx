interface RatingStarsProps {
  rating: number | null;
  cantidadResenas?: number | null;
  tamano?: "sm" | "md";
}

const ESTRELLAS = [1, 2, 3, 4, 5];

export default function RatingStars({
  rating,
  cantidadResenas = null,
  tamano = "sm",
}: RatingStarsProps) {
  if (rating === null) {
    return (
      <span className="text-xs font-medium text-[var(--color-subtle)]">
        Sin reseñas
      </span>
    );
  }

  const valor = Math.min(5, Math.max(0, rating));
  const rellenas = Math.round(valor);
  const textoValor = valor.toFixed(1).replace(".", ",");
  const dimension = tamano === "md" ? "h-4 w-4" : "h-3.5 w-3.5";

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        role="img"
        aria-label={`Valoración ${textoValor} de 5`}
        className="inline-flex items-center gap-0.5"
      >
        {ESTRELLAS.map((estrella) => (
          <svg
            key={estrella}
            aria-hidden="true"
            viewBox="0 0 20 20"
            className={dimension}
            fill={
              estrella <= rellenas
                ? "var(--color-star)"
                : "none"
            }
            stroke="var(--color-star)"
            strokeWidth={1.5}
          >
            <path d="M10 2.5l2.35 4.76 5.25.76-3.8 3.7.9 5.23L10 14.48l-4.7 2.47.9-5.23-3.8-3.7 5.25-.76L10 2.5z" />
          </svg>
        ))}
      </span>
      <span className="text-xs font-semibold text-[var(--color-ink)]">
        {textoValor}
      </span>
      {cantidadResenas !== null && (
        <span className="text-xs text-[var(--color-subtle)]">
          ({cantidadResenas} reseñas)
        </span>
      )}
    </span>
  );
}
