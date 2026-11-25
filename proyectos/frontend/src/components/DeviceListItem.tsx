/* eslint-disable @next/next/no-img-element */
"use client";

import { DispositivoKimovil } from "@/types/producto";
import { useState } from "react";
import { formatearCOP } from "@/data/specsHelper";
import ProductImagePlaceholder from "@/components/ProductImagePlaceholder";
import { buttonClassName } from "@/components/ui/Button";

interface DeviceListItemProps {
  item: DispositivoKimovil;
  onVerDetalle?: (item: DispositivoKimovil) => void;
  esTopDeseado?: boolean;
}

export default function DeviceListItem({ item, onVerDetalle, esTopDeseado }: DeviceListItemProps) {
  const [errorImagen, setErrorImagen] = useState(false);
  const tieneImagenValida = Boolean(item.imagen && item.imagen.trim().length > 0 && !errorImagen);

  const nombreSinMarca = item.nombre.toLowerCase().startsWith(item.marca.toLowerCase())
    ? item.nombre.slice(item.marca.length).trim()
    : item.nombre;

  return (
    <article
      onClick={() => onVerDetalle?.(item)}
      className="group relative flex cursor-pointer items-center justify-between gap-3 rounded-card border border-line bg-paper p-3 transition-colors hover:border-brand-blue hover:bg-surface-muted sm:gap-4 sm:p-3.5"
    >
      {/* Columna Izquierda: Ranking y Tendencia */}
      <div className="flex flex-col items-center justify-center min-w-[38px] border-r border-dotted border-line pr-2.5 sm:pr-3 shrink-0">
        <span className="text-base sm:text-lg font-medium text-ink tracking-normal">
          #{item.ranking}
        </span>
        <div className="mt-0.5 flex items-center text-[10px] font-medium">
          {item.ranking === 1 && esTopDeseado ? (
            <span className="text-brand-blue flex items-center gap-0.5" title="Top Rendimiento">
              ★ TOP
            </span>
          ) : item.tendencia === "sube" ? (
            <span className="text-brand-blue flex items-center gap-0.5 font-medium" title="Sube en el ranking">
              ▲ +{item.cambioRanking}
            </span>
          ) : item.tendencia === "baja" ? (
            <span className="text-star flex items-center gap-0.5 font-medium" title="Baja en el ranking">
              ▼ -{item.cambioRanking}
            </span>
          ) : (
            <span className="text-subtle font-medium" title="Sin cambios">
              = 0
            </span>
          )}
        </div>
      </div>

      {/* Miniatura del Dispositivo */}
      <div className="relative h-12 w-12 sm:h-14 sm:w-14 shrink-0 overflow-hidden rounded-card border border-line bg-surface-0 p-1 flex items-center justify-center">
        {tieneImagenValida ? (
          <img
            src={item.imagen}
            alt={`Imagen de ${item.nombre}`}
            onError={() => setErrorImagen(true)}
            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <ProductImagePlaceholder
            categoria={item.categoria}
            marca={item.marca}
            nombre={item.nombre}
            tamano="sm"
          />
        )}
        {item.descuento && (
          <span className="absolute bottom-0 right-0 rounded-card border border-star bg-paper px-1 py-0.5 text-[8px] font-medium text-star leading-tight font-sans">
            {item.descuento}
          </span>
        )}
      </div>

      {/* Información del Dispositivo */}
      <div className="flex-1 min-w-0">
        <h4 className="text-xs sm:text-sm font-medium uppercase text-ink truncate">
          <span className="font-medium text-ink mr-1.5">{item.marca}</span>
          <span className="text-ink font-medium">{nombreSinMarca}</span>
        </h4>

        <p className="mt-0.5 text-[11px] sm:text-xs text-subtle truncate">
          {item.especificaciones}
        </p>

        {/* Puntuación TecReview con barra horizontal */}
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-[11px] text-subtle font-medium">
            Nota: <strong className="text-ink font-medium">{item.puntuacion.toFixed(1)}</strong> / 10
          </span>
          <div className="w-14 sm:w-18 h-1.5 bg-surface-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-solid rounded-full transition-all"
              style={{ width: `${Math.min(item.puntuacion * 10, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Columna Derecha: Precios en COP y Acción */}
      <div className="flex flex-col items-end justify-center text-right shrink-0 pl-1.5 sm:pl-2">
        <span className="text-xs sm:text-sm md:text-base font-medium uppercase text-brand-blue tracking-normal font-sans">
          {formatearCOP(item.precio)}
        </span>
        {item.precioOriginal && (
          <span className="text-[10px] sm:text-[11px] text-subtle line-through">
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
          className={buttonClassName("secondary", "mt-1.5")}
        >
          Ver ficha
        </button>
      </div>
    </article>
  );
}
