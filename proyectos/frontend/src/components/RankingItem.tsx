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
      className="group relative flex cursor-pointer items-center justify-between gap-3 rounded-control border border-line/80 bg-surface-2/30 p-3 transition-all duration-200 hover:border-blue-500/40 hover:bg-surface-2/60 sm:gap-4 sm:p-3.5"
    >
      {/* Columna Izquierda: Posición en el Ranking */}
      <div className="flex min-w-[34px] shrink-0 flex-col items-center justify-center border-r border-line/70 pr-2.5 sm:min-w-[38px] sm:pr-3">
        <span className="font-display text-base font-semibold tracking-tight text-white sm:text-lg">
          #{ranking}
        </span>
        <span className="text-[10px] font-medium text-blue-400">
          TOP
        </span>
      </div>

      {/* Miniatura del producto */}
      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-control border border-line bg-surface-0 p-1.5 sm:h-14 sm:w-14">
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
        <h4 className="truncate text-xs font-semibold text-slate-100 sm:text-sm">
          {marca && <span className="mr-1.5 font-semibold text-white">{marca}</span>}
          <span className="font-medium text-slate-300">{nombre}</span>
        </h4>

        {descripcion && (
          <p className="mt-0.5 truncate text-[11px] text-slate-500 sm:text-xs">
            {descripcion}
          </p>
        )}

        {/* Métrica real de Mejor Valorados */}
        {metricaTipo === "valoracion" && typeof puntuacion === "number" && (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[11px] font-medium text-slate-400">
              Nota: <strong className="font-semibold text-white">{puntuacion.toFixed(1)}</strong> / 5.0
            </span>
            <div className="h-1.5 w-14 overflow-hidden rounded-full bg-surface-0 sm:w-18">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{ width: `${Math.min((puntuacion / 5) * 100, 100)}%` }}
              />
            </div>
            {typeof cantidadValoraciones === "number" && (
              <span className="text-[10px] text-slate-500">
                ({cantidadValoraciones} {cantidadValoraciones === 1 ? "valoración" : "valoraciones"})
              </span>
            )}
          </div>
        )}

        {/* Métrica real de Más Comentados */}
        {metricaTipo === "comentario" && typeof cantidadResenas === "number" && (
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/25 bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-300">
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-4-.84L3 20l1.18-3.54A7.38 7.38 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>{cantidadResenas} {cantidadResenas === 1 ? "reseña" : "reseñas"}</span>
            </span>
            <span className="text-[10px] text-slate-500">
              Interacción comunitaria
            </span>
          </div>
        )}
      </div>

      {/* Columna Derecha: Precio de Referencia y Acción */}
      <div className="flex shrink-0 flex-col items-end justify-center pl-1.5 text-right sm:pl-2">
        {precio !== null && precio !== undefined ? (
          <span className="text-xs font-semibold tracking-tight text-emerald-400 sm:text-sm">
            {formatearCOP(precio)}
          </span>
        ) : (
          <span className="text-[10px] text-slate-500">
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
          className="mt-1.5 inline-flex items-center gap-1 rounded-control border border-line bg-surface-1 px-2.5 py-1 text-xs font-medium text-slate-300 transition-colors hover:border-blue-500/40 hover:text-white cursor-pointer"
        >
          Ver ficha
        </button>
      </div>
    </article>
  );
}
