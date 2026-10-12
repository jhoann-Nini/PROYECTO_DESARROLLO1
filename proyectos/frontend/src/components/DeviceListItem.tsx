/* eslint-disable @next/next/no-img-element */
"use client";

import { DispositivoKimovil } from "@/types/producto";
import { useState } from "react";
import { formatearCOP } from "@/data/specsHelper";

interface DeviceListItemProps {
  item: DispositivoKimovil;
  onVerDetalle?: (item: DispositivoKimovil) => void;
}

export default function DeviceListItem({ item, onVerDetalle }: DeviceListItemProps) {
  const [imgSrc, setImgSrc] = useState(item.imagen);

  return (
    <article
      onClick={() => onVerDetalle?.(item)}
      className="group relative flex items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-3.5 shadow-2xs transition-all duration-200 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm cursor-pointer"
    >
      {/* Columna Izquierda: Ranking y Tendencia */}
      <div className="flex flex-col items-center justify-center min-w-[36px] border-r border-slate-200 dark:border-slate-800 pr-3">
        <span className="text-lg font-bold text-blue-700 dark:text-blue-400">
          #{item.ranking}
        </span>
        <div className="mt-1 flex items-center text-[11px] font-medium">
          {item.tendencia === "sube" && (
            <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-0.5" title="Sube en el ranking">
              <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 4l-8 8h6v8h4v-8h6z" />
              </svg>
              +{item.cambioRanking}
            </span>
          )}
          {item.tendencia === "baja" && (
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-0.5" title="Baja en el ranking">
              <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 20l8-8h-6v-8h-4v8h-6z" />
              </svg>
              -{item.cambioRanking}
            </span>
          )}
          {item.tendencia === "igual" && (
            <span className="text-slate-400 font-bold" title="Sin cambios">
              ―
            </span>
          )}
        </div>
      </div>

      {/* Miniatura del Dispositivo */}
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-1 flex items-center justify-center">
        <img
          src={imgSrc}
          alt={`Imagen de ${item.nombre}`}
          onError={() =>
            setImgSrc(
              "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=500&auto=format&fit=crop&q=80"
            )
          }
          className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        {item.descuento && (
          <span className="absolute bottom-0 right-0 rounded-tl-md bg-blue-700 px-1 py-0.2 text-[9px] font-bold text-white leading-tight">
            {item.descuento}
          </span>
        )}
      </div>

      {/* Información del Dispositivo */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors truncate">
            {item.nombre}
          </h4>
          <span className="hidden sm:inline-block rounded border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300">
            {item.marca}
          </span>
        </div>

        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 truncate">
          {item.especificaciones}
        </p>

        {/* Puntuación TecReview */}
        <div className="mt-1.5 flex items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 border border-slate-200 dark:border-slate-700 text-[11px]">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Nota:</span>
            <span className="text-blue-700 dark:text-blue-400 font-bold">{item.puntuacion}</span>
            <span className="text-slate-400">/10</span>
          </div>
        </div>
      </div>

      {/* Columna Derecha: Precios en COP y Acción */}
      <div className="flex flex-col items-end justify-center text-right shrink-0 pl-2">
        <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
          {formatearCOP(item.precio)}
        </span>
        {item.precioOriginal && (
          <span className="text-[11px] text-slate-400 dark:text-slate-500 line-through">
            {formatearCOP(item.precioOriginal)}
          </span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onVerDetalle?.(item);
          }}
          aria-label={`Ver ficha de ${item.nombre}`}
          className="mt-1.5 hidden sm:inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors hover:border-blue-600 hover:text-blue-700 dark:hover:text-blue-400 cursor-pointer"
        >
          Ver ficha
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </article>
  );
}
