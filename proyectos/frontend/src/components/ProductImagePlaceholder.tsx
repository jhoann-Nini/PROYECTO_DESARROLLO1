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
    case "monitores":
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
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
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
        className={`w-full h-full flex flex-col items-center justify-center rounded-lg bg-slate-100/90 dark:bg-[#0a0e17] text-slate-400 dark:text-slate-500 p-1 border border-dashed border-slate-200 dark:border-slate-800 transition-colors select-none ${className}`}
      >
        <IconoCategoria tipo={catTipo} className="w-5 h-5 text-slate-500 dark:text-slate-400 mb-0.5 shrink-0" />
        {marcaLimpia ? (
          <span className="text-[8px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-full leading-none font-doto uppercase">
            {marcaLimpia}
          </span>
        ) : (
          <span className="text-[7.5px] font-semibold text-slate-500 dark:text-slate-400 uppercase leading-none">
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
      className={`w-full h-full flex flex-col items-center justify-center rounded-xl bg-slate-50/90 dark:bg-[#0a0e17] text-slate-400 dark:text-slate-500 p-4 border border-dashed border-slate-200 dark:border-slate-800/80 transition-colors select-none ${className}`}
    >
      <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 shadow-2xs mb-2.5">
        <IconoCategoria tipo={catTipo} className="w-6 h-6" />
      </div>

      {marcaLimpia && (
        <span className="font-doto uppercase tracking-wider text-[11px] font-bold px-2 py-0.5 rounded-md bg-white/95 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 shadow-2xs mb-1.5">
          {marcaLimpia}
        </span>
      )}

      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" aria-hidden="true" />
        <span>Imagen pendiente</span>
      </div>

      <span className="mt-1 text-[11px] text-slate-400 dark:text-slate-500 font-sans">
        {catInfo.etiqueta}
      </span>
    </div>
  );
}
