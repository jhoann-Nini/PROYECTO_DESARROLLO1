import type { RiesgoModeracion } from "@/data/resenas";

interface AvisoTerminosResenaProps {
  /** Nivel del filtro. «ninguno» no muestra nada. */
  riesgo?: RiesgoModeracion;
  className?: string;
}

export const AVISO_RIESGO_BAJO =
  "Algunas palabras pueden sonar ofensivas. Puedes publicar, pero revisa el tono.";
export const AVISO_RIESGO_BLOQUEO =
  "Tu opinión tiene lenguaje que no se permite. Corrígelo para poder publicarla.";

/**
 * Aviso preventivo mientras se escribe (TEC-98, niveles del Caso 6). No borra
 * el texto. Riesgo bajo: solo sugiere revisar el tono y se puede publicar.
 * Riesgo medio o alto: pide corregir antes de publicar. El backend decide.
 */
export default function AvisoTerminosResena({
  riesgo = "medio",
  className = "",
}: AvisoTerminosResenaProps) {
  if (riesgo === "ninguno") return null;
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
        {riesgo === "bajo" ? AVISO_RIESGO_BAJO : AVISO_RIESGO_BLOQUEO}
      </span>
    </p>
  );
}
