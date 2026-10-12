/* eslint-disable @next/next/no-img-element */
"use client";

import { Producto } from "@/types/producto";
import { useState } from "react";

interface ProductCardProps {
  producto: Producto;
  onVerDetalle?: (producto: Producto) => void;
}

export default function ProductCard({ producto, onVerDetalle }: ProductCardProps) {
  const [imgSrc, setImgSrc] = useState<string>(
    producto.imagen || "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80"
  );

  return (
    <article
      onClick={() => onVerDetalle?.(producto)}
      className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-800/90 bg-[#101013] shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-[#d71920]/70 hover:shadow-[0_0_25px_rgba(215,25,32,0.15)] cursor-pointer"
    >
      {/* Imagen del Producto en contenedor dark Nothing */}
      <div className="relative h-48 w-full overflow-hidden bg-black/60 p-2 flex items-center justify-center border-b border-zinc-800/80">
        <img
          src={imgSrc}
          alt={producto.nombre}
          onError={() =>
            setImgSrc(
              "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80"
            )
          }
          className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        <div className="absolute top-3 left-3 flex gap-1.5 font-mono text-[10px]">
          <span className="rounded bg-black/80 px-2 py-0.5 font-bold text-zinc-300 border border-zinc-700/60 backdrop-blur-md">
            CAT.{producto.idCategoria}
          </span>
          <span className="rounded bg-black/80 px-2 py-0.5 font-bold text-[#d71920] border border-[#d71920]/40 backdrop-blur-md">
            MARCA.{producto.idMarca}
          </span>
        </div>

        {producto.estado ? (
          <span className="absolute top-3 right-3 rounded-full bg-emerald-500/20 border border-emerald-500/50 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-400">
            ONLINE
          </span>
        ) : (
          <span className="absolute top-3 right-3 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-mono font-bold text-zinc-400">
            OFFLINE
          </span>
        )}
      </div>

      {/* Contenido */}
      <div className="flex flex-1 flex-col p-5">
        <h4 className="font-tech text-base font-bold text-white line-clamp-1 group-hover:text-[#ff2a35] transition-colors">
          {producto.nombre}
        </h4>

        <p className="mt-2 text-xs font-mono-tech text-zinc-400 line-clamp-2 flex-1 leading-relaxed">
          {producto.descripcion || "Sin especificaciones registradas."}
        </p>

        {/* Footer técnico con precio Crimson y acción */}
        <div className="mt-5 flex items-center justify-between border-t border-zinc-800/80 pt-3.5">
          <div>
            <span className="text-[10px] font-mono text-zinc-500 block uppercase tracking-wider">
              PRECIO BASE
            </span>
            <span className="font-mono-tech text-lg font-extrabold text-[#d71920]">
              {producto.precioReferencia !== null
                ? `$${producto.precioReferencia.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                : "CONSULTAR"}
            </span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onVerDetalle?.(producto);
            }}
            className="rounded-lg border border-[#d71920]/60 bg-black px-3.5 py-1.5 font-dot text-[11px] font-bold text-white transition-all hover:bg-[#d71920] hover:shadow-[0_0_15px_rgba(215,25,32,0.4)] cursor-pointer"
          >
            FICHA TÉCNICA
          </button>
        </div>
      </div>
    </article>
  );
}
