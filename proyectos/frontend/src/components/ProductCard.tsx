/* eslint-disable @next/next/no-img-element */
"use client";

import { Producto } from "@/types/producto";
import { useState } from "react";
import { formatearCOP } from "@/data/specsHelper";

interface ProductCardProps {
  producto: Producto;
  onVerDetalle?: (producto: Producto) => void;
}

export default function ProductCard({ producto, onVerDetalle }: ProductCardProps) {
  const [imgSrc, setImgSrc] = useState<string>(
    producto.imagen || "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80"
  );

  const precioFormateado = formatearCOP(producto.precioReferencia);

  return (
    <article
      onClick={() => onVerDetalle?.(producto)}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md cursor-pointer"
    >
      {/* Contenedor de Fotografía */}
      <div className="relative h-48 w-full overflow-hidden bg-slate-50 dark:bg-slate-950 p-4 flex items-center justify-center border-b border-slate-100 dark:border-slate-800">
        <img
          src={imgSrc}
          alt={`Fotografía oficial de ${producto.nombre}`}
          onError={() =>
            setImgSrc(
              "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80"
            )
          }
          className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />

        {/* Etiquetas informativas */}
        <div className="absolute top-3 left-3 flex gap-1.5 text-xs">
          <span className="rounded-md bg-white/95 dark:bg-slate-900/90 px-2.5 py-1 font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-2xs">
            Categoría {producto.idCategoria}
          </span>
          <span className="rounded-md bg-blue-50/95 dark:bg-blue-950/80 px-2.5 py-1 font-semibold text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-2xs">
            Marca {producto.idMarca}
          </span>
        </div>

        {/* Indicador de disponibilidad */}
        {producto.estado ? (
          <span className="absolute top-3 right-3 rounded-md bg-emerald-50 dark:bg-emerald-950/80 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            Disponible
          </span>
        ) : (
          <span className="absolute top-3 right-3 rounded-md bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            No disponible
          </span>
        )}
      </div>

      {/* Contenido descriptivo del producto */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
          {producto.nombre}
        </h3>

        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 line-clamp-2 flex-1 leading-relaxed">
          {producto.descripcion || "Especificaciones técnicas detalladas disponibles en la ficha."}
        </p>

        {/* Sección de precio y acción principal */}
        <div className="mt-5 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3.5">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
              Precio estimado (COP)
            </span>
            <span className="text-base font-bold text-slate-900 dark:text-white">
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
            className="rounded-lg bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none cursor-pointer"
          >
            Ver ficha técnica
          </button>
        </div>
      </div>
    </article>
  );
}
