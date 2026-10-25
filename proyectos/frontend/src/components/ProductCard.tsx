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
      className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-950/10 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2"
    >
      {/* Contenedor de Fotografía */}
      <div className="relative h-48 w-full overflow-hidden bg-slate-50 dark:bg-[#0a0e17] p-4 flex items-center justify-center border-b border-slate-100 dark:border-slate-800/80">
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

        {/* Etiquetas informativas con estilo técnico */}
        <div className="absolute top-3 left-3 flex gap-1.5 text-xs">
          <span className="rounded-md bg-white/95 dark:bg-[#111827]/90 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 shadow-2xs font-doto uppercase tracking-wider">
            {producto.nombreCategoria || `CAT ${producto.idCategoria}`}
          </span>
          <span className="rounded-full border border-blue-100 bg-blue-50/95 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-blue-800">
            {producto.nombreMarca || `Marca ${producto.idMarca}`}
          </span>
        </div>
        <span className={`absolute right-3 top-3 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${producto.estado ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-100 text-slate-600"}`}>
          <span aria-hidden="true" className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${producto.estado ? "bg-emerald-600" : "bg-slate-500"}`} />
          {producto.estado ? "Activo" : "Inactivo"}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-5">
        <h3 className="line-clamp-2 min-h-12 text-base font-bold leading-6 text-slate-900 transition-colors group-hover:text-blue-700">
          {producto.nombre}
        </h3>
        <p className="mt-2 line-clamp-2 min-h-10 flex-1 text-sm leading-5 text-slate-600">
          {producto.descripcion || "Consulta las características y especificaciones técnicas de este dispositivo."}
        </p>

        {/* Sección de precio y acción principal */}
        <div className="mt-5 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-3.5">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
                Precio estimado
              </span>
              {cumplePresupuesto !== null && (
                cumplePresupuesto ? (
                  <span
                    className="inline-flex items-center rounded-md bg-emerald-50 dark:bg-emerald-950/80 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 font-mono tracking-tight"
                    title="Dentro del presupuesto máximo"
                  >
                    ✓ En presupuesto
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center rounded-md bg-amber-50 dark:bg-amber-950/80 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 font-mono tracking-tight"
                    title="Supera el presupuesto máximo"
                  >
                    Supera presupuesto
                  </span>
                )
              )}
            </div>
            <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight font-sans">
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
            className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 active:scale-[0.99]"
          >
            Ver ficha técnica <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15 15 5M6 5h9v9" /></svg>
          </button>
        </div>
      </div>
    </article>
  );
}
