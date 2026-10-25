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
      className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-950/10 hover:border-blue-300"
    >
      <div className="relative flex h-48 items-center justify-center overflow-hidden border-b border-slate-100 bg-gradient-to-br from-slate-50 via-white to-blue-50 p-5 ">
        {tieneImagenValida ? (
          <img
            src={producto.imagen!}
            alt={`Fotografía de ${producto.nombre}`}
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
        <div className="absolute left-3 top-3 flex max-w-[70%] flex-wrap gap-1.5">
          <span className="rounded-full border border-slate-200 bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600 shadow-sm backdrop-blur ">
            {producto.nombreCategoria || `Categoría ${producto.idCategoria}`}
          </span>
          <span className="rounded-full border border-violet-200 bg-violet-50/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-violet-700 ">
            {producto.nombreMarca || `Marca ${producto.idMarca}`}
          </span>
        </div>
        <span className={`absolute right-3 top-3 rounded-full border px-2.5 py-1 text-[10px] font-bold ${producto.estado ? "border-emerald-200 bg-emerald-50 text-emerald-700 " : "border-slate-200 bg-slate-100 text-slate-600 "}`}>
          <span aria-hidden="true">{producto.estado ? "● " : "○ "}</span>
          {producto.estado ? "Activo" : "Inactivo"}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-2 min-h-12 text-base font-bold leading-6 text-slate-900 transition-colors group-hover:text-blue-700 group-hover:text-blue-700">
          {producto.nombre}
        </h3>
        <p className="mt-2 line-clamp-2 min-h-10 flex-1 text-sm leading-5 text-slate-500 ">
          {producto.descripcion || "Consulta las características y especificaciones técnicas de este dispositivo."}
        </p>

        <div className="mt-4 border-t border-slate-100 pt-4 ">
          <div className="flex min-h-12 items-end justify-between gap-2">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Precio de referencia
              </p>
              <p className="mt-0.5 text-lg font-extrabold tracking-tight text-slate-950 ">
                {precioFormateado}
              </p>
            </div>
            {cumplePresupuesto !== null && (
              <span
                className={`mb-1 rounded-full px-2 py-1 text-[10px] font-bold ${cumplePresupuesto ? "bg-emerald-100 text-emerald-800 " : "bg-amber-100 text-amber-800 "}`}
                title={cumplePresupuesto ? "Dentro del presupuesto máximo" : "Supera el presupuesto máximo"}
              >
                {cumplePresupuesto ? "✓ En presupuesto" : "Sobre presupuesto"}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onVerDetalle?.(producto);
            }}
            aria-label={`Consultar ficha técnica de ${producto.nombre}`}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-[0.99] "
          >
            Ver ficha técnica <span aria-hidden="true">↗</span>
          </button>
        </div>
      </div>
    </article>
  );
}
