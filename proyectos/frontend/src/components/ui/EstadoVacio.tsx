import Link from "next/link";
import type { ReactNode } from "react";
import { CLASE_FOCO } from "./foco";

export type TipoEstadoVacio = "vacio" | "error";

export interface AccionEstadoVacio {
  etiqueta: string;
  href?: string;
  onClick?: () => void;
}

interface EstadoVacioProps {
  titulo: string;
  descripcion?: string;
  tipo?: TipoEstadoVacio;
  icono?: ReactNode;
  accion?: AccionEstadoVacio;
  className?: string;
}

const ICONO_VACIO = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    className="h-8 w-8"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 9.75 12 3.75l8.25 6v9a1.5 1.5 0 0 1-1.5 1.5h-13.5a1.5 1.5 0 0 1-1.5-1.5v-9Z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 20.25v-6h7.5v6" />
  </svg>
);

const ICONO_ERROR = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    className="h-8 w-8"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3.75 21 19.5H3L12 3.75Z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4.5" />
    <path strokeLinecap="round" d="M12 16.75h.01" />
  </svg>
);

/**
 * Estado vacío o de error reutilizable.
 * Mantiene el mismo tratamiento visual y accesible en todas las vistas.
 */
export default function EstadoVacio({
  titulo,
  descripcion,
  tipo = "vacio",
  icono,
  accion,
  className = "",
}: EstadoVacioProps) {
  const esError = tipo === "error";
  const claseAccion = `mt-5 inline-flex cursor-pointer items-center justify-center rounded-md bg-[var(--color-brand-solid)] px-4 py-2 text-sm font-semibold text-[var(--color-on-solid)] transition-colors hover:bg-[var(--color-brand-solid)]/90 ${CLASE_FOCO}`;

  return (
    <div
      role={esError ? "alert" : "status"}
      data-estado={tipo}
      className={`rounded-xl border p-8 text-center sm:p-10 ${
        esError
          ? "border-[var(--color-status-error)]/30 bg-[var(--color-status-error-bg)] dark:bg-[var(--color-paper)]"
          : "border-dashed border-[var(--color-hairline)] bg-[var(--color-paper)]"
      } ${className}`}
    >
      <div
        aria-hidden="true"
        className={`mx-auto flex h-10 w-10 items-center justify-center ${
          esError
            ? "text-[var(--color-status-error)] dark:text-[var(--color-ink)]"
            : "text-[var(--color-subtle)]"
        }`}
      >
        {icono ?? (esError ? ICONO_ERROR : ICONO_VACIO)}
      </div>

      <p
        className={`mt-3 text-sm font-semibold ${
          esError
            ? "text-[var(--color-status-error)] dark:text-[var(--color-ink)]"
            : "text-[var(--color-ink)]"
        }`}
      >
        {titulo}
      </p>

      {descripcion && (
        <p className="mt-1 text-sm leading-relaxed text-[var(--color-subtle)]">
          {descripcion}
        </p>
      )}

      {accion &&
        (accion.href ? (
          <Link href={accion.href} className={claseAccion}>
            {accion.etiqueta}
          </Link>
        ) : (
          <button
            type="button"
            onClick={accion.onClick}
            className={claseAccion}
          >
            {accion.etiqueta}
          </button>
        ))}
    </div>
  );
}
