interface AvisoTerminosResenaProps {
  className?: string;
}

/**
 * Aviso preventivo de lenguaje no permitido (TEC-98).
 * Se anuncia de forma cortés mientras la persona escribe y no bloquea la
 * edición ni borra el texto. La decisión final sigue siendo del backend.
 */
export default function AvisoTerminosResena({
  className = "",
}: AvisoTerminosResenaProps) {
  return (
    <p
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`flex items-start gap-1.5 text-sm text-[var(--color-star)] ${className}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mt-0.5 h-4 w-4 shrink-0"
      >
        <path d="M12 9v4m0 3h.01M10.3 3.9 2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      </svg>
      <span>
        Tu reseña contiene términos que requieren revisión antes de publicarse.
      </span>
    </p>
  );
}
