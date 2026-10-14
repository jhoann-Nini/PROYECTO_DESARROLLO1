/* eslint-disable @next/next/no-img-element */
"use client";

import { DispositivoKimovil } from "@/types/producto";
import { useState } from "react";
import { formatearCOP } from "@/data/specsHelper";

interface DeviceListItemProps {
  item: DispositivoKimovil;
  onVerDetalle?: (item: DispositivoKimovil) => void;
  esTopDeseado?: boolean;
}

export default function DeviceListItem({ item, onVerDetalle, esTopDeseado }: DeviceListItemProps) {
  const [imgSrc, setImgSrc] = useState(item.imagen);

  const nombreSinMarca = item.nombre.toLowerCase().startsWith(item.marca.toLowerCase())
    ? item.nombre.slice(item.marca.length).trim()
    : item.nombre;

  return (
    <article
      onClick={() => onVerDetalle?.(item)}
      className="group relative flex items-center justify-between gap-3 sm:gap-4 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#111827]/90 p-3 sm:p-3.5 shadow-2xs transition-all duration-200 hover:border-blue-500/50 hover:bg-slate-50/50 dark:hover:bg-[#151f33] hover:shadow-md cursor-pointer"
    >
      {/* Columna Izquierda: Ranking y Tendencia */}
      <div className="flex flex-col items-center justify-center min-w-[38px] border-r border-slate-200 dark:border-slate-800/80 pr-2.5 sm:pr-3 shrink-0">
        <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-doto tracking-wider">
          #{item.ranking}
        </span>
        <div className="mt-0.5 flex items-center text-[10px] font-bold">
          {item.ranking === 1 && esTopDeseado ? (
            <span className="text-emerald-500 dark:text-emerald-400 font-doto flex items-center gap-0.5" title="Top Rendimiento">
              ★ TOP
            </span>
          ) : item.tendencia === "sube" ? (
            <span className="text-emerald-500 dark:text-emerald-400 flex items-center gap-0.5 font-bold" title="Sube en el ranking">
              ▲ +{item.cambioRanking}
            </span>
          ) : item.tendencia === "baja" ? (
            <span className="text-amber-500 dark:text-amber-400 flex items-center gap-0.5 font-bold" title="Baja en el ranking">
              ▼ -{item.cambioRanking}
            </span>
          ) : (
            <span className="text-slate-400 dark:text-slate-500 font-bold" title="Sin cambios">
              = 0
            </span>
          )}
        </div>
      </div>

      {/* Miniatura del Dispositivo */}
      <div className="relative h-12 w-12 sm:h-14 sm:w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0a0e17] p-1 flex items-center justify-center">
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
          <span className="absolute bottom-0 right-0 rounded-tl-md bg-blue-600 px-1 py-0.2 text-[8px] font-bold text-white leading-tight font-doto">
            {item.descuento}
          </span>
        )}
      </div>

      {/* Información del Dispositivo */}
      <div className="flex-1 min-w-0">
        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
          <span className="font-extrabold text-slate-900 dark:text-white mr-1.5">{item.marca}</span>
          <span className="text-slate-700 dark:text-slate-300 font-medium">{nombreSinMarca}</span>
        </h4>

        <p className="mt-0.5 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
          {item.especificaciones}
        </p>

        {/* Puntuación TecReview con barra horizontal */}
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Nota: <strong className="text-slate-900 dark:text-white font-bold">{item.puntuacion.toFixed(1)}</strong> / 10
          </span>
          <div className="w-14 sm:w-18 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 dark:bg-emerald-400 rounded-full transition-all"
              style={{ width: `${Math.min(item.puntuacion * 10, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Columna Derecha: Precios en COP y Acción */}
      <div className="flex flex-col items-end justify-center text-right shrink-0 pl-1.5 sm:pl-2">
        <span className="text-xs sm:text-sm md:text-base font-black text-emerald-600 dark:text-emerald-400 tracking-tight font-doto">
          {formatearCOP(item.precio)}
        </span>
        {item.precioOriginal && (
          <span className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 line-through">
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
          className="mt-1.5 inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1a2336] px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors hover:border-blue-500 hover:text-blue-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#23304a] cursor-pointer"
        >
          Ver ficha
        </button>
      </div>
    </article>
  );
}
