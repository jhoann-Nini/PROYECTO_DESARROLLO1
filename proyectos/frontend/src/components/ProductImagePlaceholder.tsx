import React from "react";
import { detectarCategoria, INFO_CATEGORIAS } from "@/data/specsHelper";
import type { CategoriaDispositivo } from "@/types/producto";

export interface ProductImagePlaceholderProps {
  /**
   * Nombre o ID de la categoría (ej: "Móviles", "auriculares", 1, 2)
   */
  categoria?: string | number | null;
  /**
   * Nombre de la marca del producto (ej: "Apple", "Samsung", "Sony")
   */
  marca?: string | null;
  /**
   * Nombre completo del producto para inferir la categoría si no se pasa explícitamente
   */
  nombre?: string | null;
  /**
   * Clases adicionales para el contenedor
   */
  className?: string;
  /**
   * Modo de tamaño ("sm" para miniaturas compactas en rankings; "md", "lg" o "auto" para tarjetas y modales)
   */
  tamano?: "sm" | "md" | "lg" | "auto";
}

/**
 * Renderiza el icono SVG correspondiente a la categoría del dispositivo.
 */
function IconoCategoria({
  tipo,
  className,
}: {
  tipo: CategoriaDispositivo;
  className: string;
}) {
  switch (tipo) {
    case "auriculares":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
          <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
        </svg>
      );
    case "laptops":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20 16V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v10" />
          <path d="M2 18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-1H2v1z" />
        </svg>
      );
    case "tablets":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="4" y="3" width="16" height="18" rx="2" ry="2" />
          <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2.5" />
        </svg>
      );
    case "moviles":
    default:
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="5" y="2" width="14" height="20" rx="3" ry="3" />
          <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2.5" />
          <line x1="10" y1="5" x2="14" y2="5" />
        </svg>
      );
  }
}

/**
 * Componente marcador visual (placeholder) accesible para dispositivos que no cuentan con
 * imagen fotográfica oficial o cuya carga remota ha fallado.
 */
export default function ProductImagePlaceholder({
  categoria,
  marca,
  nombre,
  className = "",
  tamano = "auto",
}: ProductImagePlaceholderProps) {
  // Detección consistente de la categoría usando el helper existente
  const catTipo: CategoriaDispositivo = detectarCategoria({
    nombre: typeof nombre === "string" ? nombre : undefined,
    idCategoria: typeof categoria === "number" ? categoria : undefined,
    nombreCategoria: typeof categoria === "string" ? categoria : undefined,
    categoria: typeof categoria === "string" ? categoria : undefined,
  });

  const catInfo = INFO_CATEGORIAS[catTipo] || INFO_CATEGORIAS.moviles;
  const marcaLimpia = marca && marca.trim().length > 0 ? marca.trim() : null;

  const descripcionAccesible = [
    "Imagen pendiente",
    marcaLimpia ? `de ${marcaLimpia}` : "",
    catInfo?.etiqueta ? `(${catInfo.etiqueta})` : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (tamano === "sm") {
    return (
      <div
        role="img"
        aria-label={descripcionAccesible}
        className={`flex h-full w-full select-none flex-col items-center justify-center rounded-control border border-line/70 bg-surface-1/60 p-1 text-slate-500 transition-colors ${className}`}
      >
        <IconoCategoria tipo={catTipo} className="mb-0.5 h-5 w-5 shrink-0 text-slate-400" />
        {marcaLimpia ? (
          <span className="max-w-full truncate text-[8px] font-medium uppercase leading-none text-slate-300">
            {marcaLimpia}
          </span>
        ) : (
          <span className="text-[7.5px] font-medium uppercase leading-none text-slate-500">
            Pendiente
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={descripcionAccesible}
      className={`flex h-full w-full select-none flex-col items-center justify-center rounded-card border border-line/70 bg-surface-1/40 p-4 text-slate-500 transition-colors ${className}`}
    >
      <div className="mb-2.5 flex h-12 w-12 items-center justify-center rounded-control border border-line bg-surface-1 text-slate-300">
        <IconoCategoria tipo={catTipo} className="h-6 w-6" />
      </div>

      {marcaLimpia && (
        <span className="mb-1.5 rounded-full border border-line bg-surface-1 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-300">
          {marcaLimpia}
        </span>
      )}

      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" aria-hidden="true" />
        <span>Imagen pendiente</span>
      </div>

      <span className="mt-1 text-[11px] text-slate-500">
        {catInfo.etiqueta}
      </span>
    </div>
  );
}
