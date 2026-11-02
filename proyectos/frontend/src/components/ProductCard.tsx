/* eslint-disable @next/next/no-img-element */
"use client";

import { Producto } from "@/types/producto";
import { useState } from "react";
import { formatearCOP } from "@/data/specsHelper";
import ProductImagePlaceholder from "@/components/ProductImagePlaceholder";

interface ProductCardProps {
  producto: Producto;
  onVerDetalle?: (producto: Producto) => void;
  limitePresupuestoCOP?: number | null;
}

export default function ProductCard({
  producto,
  onVerDetalle,
  limitePresupuestoCOP,
}: ProductCardProps) {
  const [errorImagen, setErrorImagen] = useState(false);
  const tieneImagenValida = Boolean(
    producto.imagen && producto.imagen.trim().length > 0 && !errorImagen
  );

  const precioFormateado = formatearCOP(producto.precioReferencia);

  const cumplePresupuesto =
    limitePresupuestoCOP !== undefined &&
    limitePresupuestoCOP !== null &&
    producto.precioReferencia !== null &&
    producto.precioReferencia !== undefined
      ? (producto.precioReferencia < 10000
          ? producto.precioReferencia * 4000
          : producto.precioReferencia) <= limitePresupuestoCOP
      : null;

  return (
    <article
      onClick={() => onVerDetalle?.(producto)}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-card border border-line bg-surface-1/80 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-500/40 hover:bg-surface-1 hover:shadow-soft"
    >
      {/* Contenedor de Fotografía */}
      <div className="relative flex h-48 w-full items-center justify-center overflow-hidden border-b border-line/70 bg-surface-0 p-5">
        {tieneImagenValida ? (
          <img
            src={producto.imagen!}
            alt={`Fotografía oficial de ${producto.nombre}`}
            onError={() => setErrorImagen(true)}
            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <ProductImagePlaceholder
            categoria={producto.nombreCategoria || producto.idCategoria}
            marca={producto.nombreMarca}
            nombre={producto.nombre}
            tamano="md"
          />
        )}

        {/* Etiquetas informativas */}
        <div className="absolute left-3 top-3 flex max-w-[62%] flex-wrap gap-1.5">
          <span className="rounded-full border border-line bg-surface-1/90 px-2.5 py-1 text-[10px] font-medium text-slate-300 backdrop-blur">
            {producto.nombreCategoria || `CAT ${producto.idCategoria}`}
          </span>
          <span className="rounded-full border border-blue-500/25 bg-blue-500/10 px-2.5 py-1 text-[10px] font-medium text-blue-300 backdrop-blur">
            {producto.nombreMarca || `Marca ${producto.idMarca}`}
          </span>
        </div>

        {/* Indicador de disponibilidad */}
        {producto.estado ? (
          <span className="absolute right-3 top-3 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-300 backdrop-blur">
            Disponible
          </span>
        ) : (
          <span className="absolute right-3 top-3 rounded-full border border-line bg-surface-2/90 px-2.5 py-1 text-[10px] font-medium text-slate-400 backdrop-blur">
            No disponible
          </span>
        )}
      </div>

      {/* Contenido descriptivo del producto */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-1 text-base font-semibold tracking-[-0.01em] text-white transition-colors group-hover:text-blue-300">
          {producto.nombre}
        </h3>

        <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-slate-400">
          {producto.descripcion || "Especificaciones técnicas detalladas disponibles en la ficha."}
        </p>

        {/* Sección de precio y acción principal */}
        <div className="mt-5 flex items-end justify-between gap-3 border-t border-line/70 pt-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="block text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
                Precio estimado
              </span>
              {cumplePresupuesto !== null && (
                cumplePresupuesto ? (
                  <span
                    className="inline-flex items-center rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300"
                    title="Dentro del presupuesto máximo"
                  >
                    ✓ En presupuesto
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300"
                    title="Supera el presupuesto máximo"
                  >
                    Supera presupuesto
                  </span>
                )
              )}
            </div>
            <span className="mt-1 block truncate text-base font-semibold tracking-tight text-emerald-400">
              {precioFormateado}
            </span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onVerDetalle?.(producto);
            }}
            aria-label={`Consultar ficha técnica de ${producto.nombre}`}
            className="shrink-0 rounded-control bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white transition-all duration-200 hover:bg-blue-500 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 cursor-pointer"
          >
            Ver ficha técnica
          </button>
        </div>
      </div>
    </article>
  );
}
