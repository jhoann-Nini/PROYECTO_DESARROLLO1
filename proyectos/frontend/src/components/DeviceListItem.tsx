/* eslint-disable @next/next/no-img-element */
"use client";

import { DispositivoKimovil } from "@/types/producto";
import { useState } from "react";

interface DeviceListItemProps {
  item: DispositivoKimovil;
  onVerDetalle?: (item: DispositivoKimovil) => void;
}

export default function DeviceListItem({ item, onVerDetalle }: DeviceListItemProps) {
  const [imgSrc, setImgSrc] = useState(item.imagen);

  return (
    <article
      onClick={() => onVerDetalle?.(item)}
      className="group relative flex items-center justify-between gap-4 rounded-xl border border-zinc-800/80 bg-[#101013] p-3.5 transition-all duration-200 hover:border-[#d71920]/60 hover:bg-[#151519] hover:shadow-[0_0_20px_rgba(215,25,32,0.12)] cursor-pointer"
    >
      {/* Columna Izquierda: Ranking y Tendencia */}
      <div className="flex flex-col items-center justify-center min-w-[36px] border-r border-zinc-800/70 pr-3">
        <span className="font-dot text-xl font-extrabold text-[#d71920]">
          {item.ranking < 10 ? `0${item.ranking}` : item.ranking}
        </span>
        <div className="mt-1 flex items-center text-[10px] font-mono font-medium">
          {item.tendencia === "sube" && (
            <span className="text-emerald-400 flex items-center gap-0.5" title="Sube en el ranking">
              <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 4l-8 8h6v8h4v-8h6z" />
              </svg>
              +{item.cambioRanking}
            </span>
          )}
          {item.tendencia === "baja" && (
            <span className="text-zinc-500 flex items-center gap-0.5" title="Baja en el ranking">
              <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 20l8-8h-6v-8h-4v8h-6z" />
              </svg>
              -{item.cambioRanking}
            </span>
          )}
          {item.tendencia === "igual" && (
            <span className="text-zinc-600 font-bold" title="Sin cambios">
              ―
            </span>
          )}
        </div>
      </div>

      {/* Miniatura del Dispositivo */}
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-zinc-800 bg-black/60 p-1 flex items-center justify-center">
        <img
          src={imgSrc}
          alt={item.nombre}
          onError={() =>
            setImgSrc(
              "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=500&auto=format&fit=crop&q=80"
            )
          }
          className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-110"
          loading="lazy"
        />
        {item.descuento && (
          <span className="absolute bottom-0 right-0 rounded-tl-md bg-[#d71920] px-1 py-0.2 text-[9px] font-mono font-bold text-white leading-tight">
            {item.descuento}
          </span>
        )}
      </div>

      {/* Información del Dispositivo */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-tech text-sm font-bold text-white group-hover:text-[#ff2a35] transition-colors truncate">
            {item.nombre}
          </h4>
          <span className="hidden sm:inline-block rounded border border-zinc-700/60 bg-zinc-900/80 px-1.5 py-0.2 text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
            {item.marca}
          </span>
        </div>

        <p className="mt-1 font-mono-tech text-[11px] text-zinc-400 truncate">
          {item.especificaciones}
        </p>

        {/* Puntuación TecnoReview Score */}
        <div className="mt-1.5 flex items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 border border-zinc-800 text-[10px] font-mono">
            <span className="text-zinc-500 font-bold">TECNO SCORE:</span>
            <span className="text-emerald-400 font-bold">{item.puntuacion}</span>
            <span className="text-zinc-600">/10</span>
          </div>
        </div>
      </div>

      {/* Columna Derecha: Precios y Acción */}
      <div className="flex flex-col items-end justify-center text-right shrink-0 pl-2">
        <span className="font-mono-tech text-base font-extrabold text-[#d71920] group-hover:text-[#ff2a35] transition-colors">
          ${item.precio}
        </span>
        {item.precioOriginal && (
          <span className="font-mono text-[11px] text-zinc-500 line-through">
            ${item.precioOriginal}
          </span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onVerDetalle?.(item);
          }}
          className="mt-1.5 hidden sm:inline-flex items-center gap-1 rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-[10px] font-mono font-semibold text-zinc-300 transition-all hover:border-[#d71920] hover:text-white cursor-pointer"
        >
          FICHA TÉCNICA
          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </article>
  );
}
