/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { formatearCOP } from "@/data/specsHelper";
import ProductImagePlaceholder from "@/components/ProductImagePlaceholder";

export interface RankingItemProps {
  ranking: number;
  nombre: string;
  marca?: string | null;
  categoria?: string | number | null;
  descripcion?: string | null;
  imagen?: string | null;
  precio?: number | null;
  metricaTipo: "valoracion" | "comentario";
  puntuacion?: number;
  cantidadValoraciones?: number;
  cantidadResenas?: number;
  onVerDetalle?: () => void;
}

export default function RankingItem({
  ranking,
  nombre,
  marca,
  categoria,
  descripcion,
  imagen,
  precio,
  metricaTipo,
  puntuacion,
  cantidadValoraciones,
  cantidadResenas,
  onVerDetalle,
}: RankingItemProps) {
  const [errorImagen, setErrorImagen] = useState(false);
  const tieneImagenValida = Boolean(imagen && imagen.trim().length > 0 && !errorImagen);

  return (
    <article
      onClick={() => onVerDetalle?.()}
      className="group relative flex items-center justify-between gap-3 sm:gap-4 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#111827]/90 p-3 sm:p-3.5 shadow-2xs transition-all duration-200 hover:border-blue-500/50 hover:bg-slate-50/50 dark:hover:bg-[#151f33] hover:shadow-md cursor-pointer"
    >
      {/* Columna Izquierda: Posición en el Ranking */}
      <div className="flex flex-col items-center justify-center min-w-[38px] border-r border-slate-200 dark:border-slate-800/80 pr-2.5 sm:pr-3 shrink-0">
        <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-doto tracking-wider">
          #{ranking}
        </span>
        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold font-mono">
          TOP
        </span>
      </div>

      {/* Miniatura del producto */}
      <div className="relative h-12 w-12 sm:h-14 sm:w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0a0e17] p-1 flex items-center justify-center">
        {tieneImagenValida ? (
          <img
            src={imagen!}
            alt={`Imagen de ${nombre}`}
            onError={() => setErrorImagen(true)}
            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <ProductImagePlaceholder
            categoria={categoria}
            marca={marca}
            nombre={nombre}
            tamano="sm"
          />
        )}
      </div>

      {/* Información del Dispositivo */}
      <div className="flex-1 min-w-0">
        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
          {marca && <span className="font-extrabold text-slate-900 dark:text-white mr-1.5">{marca}</span>}
          <span className="text-slate-700 dark:text-slate-300 font-medium">{nombre}</span>
        </h4>

        {descripcion && (
          <p className="mt-0.5 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
            {descripcion}
          </p>
        )}

        {/* Métrica real de Mejor Valorados */}
        {metricaTipo === "valoracion" && typeof puntuacion === "number" && (
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Nota: <strong className="text-slate-900 dark:text-white font-bold">{puntuacion.toFixed(1)}</strong> / 5.0
            </span>
            <div className="w-14 sm:w-18 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 dark:bg-emerald-400 rounded-full transition-all"
                style={{ width: `${Math.min((puntuacion / 5) * 100, 100)}%` }}
              />
            </div>
            {typeof cantidadValoraciones === "number" && (
              <span className="text-[10px] text-slate-400 font-mono">
                ({cantidadValoraciones} {cantidadValoraciones === 1 ? "valoración" : "valoraciones"})
              </span>
            )}
          </div>
        )}

        {/* Métrica real de Más Comentados */}
        {metricaTipo === "comentario" && typeof cantidadResenas === "number" && (
          <div className="mt-1.5 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800/80 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-300">
              <span>💬</span>
              <span>{cantidadResenas} {cantidadResenas === 1 ? "reseña" : "reseñas"}</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Interacción comunitaria
            </span>
          </div>
        )}
      </div>

      {/* Columna Derecha: Precio de Referencia y Acción */}
      <div className="flex flex-col items-end justify-center text-right shrink-0 pl-1.5 sm:pl-2">
        {precio !== null && precio !== undefined ? (
          <span className="text-xs sm:text-sm font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight font-sans">
            {formatearCOP(precio)}
          </span>
        ) : (
          <span className="text-[10px] text-slate-400 font-mono">
            Consultar precio
          </span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onVerDetalle?.();
          }}
          aria-label={`Ver ficha de ${nombre}`}
          className="mt-1.5 inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1a2336] px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors hover:border-blue-500 hover:text-blue-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#23304a] cursor-pointer"
        >
          Ver ficha
        </button>
      </div>
    </article>
  );
}
