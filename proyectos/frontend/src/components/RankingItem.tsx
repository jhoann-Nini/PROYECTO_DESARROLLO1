/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { formatearCOP } from "@/data/specsHelper";
import ProductImagePlaceholder from "@/components/ProductImagePlaceholder";
import { buttonClassName } from "@/components/ui/Button";

export interface RankingItemProps {
  ranking: number;
  nombre: string;
  marca?: string | null;
  categoria?: string | number | null;
  descripcion?: string | null;
  imagen?: string | null;
  precio?: number | null;
  metricaTipo: "valoracion" | "comentario" | "deseo";
  puntuacion?: number;
  cantidadValoraciones?: number;
  cantidadResenas?: number;
  cantidadDeseados?: number;
  onVerDetalle?: () => void;
}

function pluralizar(cantidad: number, singular: string, plural: string) {
  return `${cantidad} ${cantidad === 1 ? singular : plural}`;
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
  cantidadDeseados,
  onVerDetalle,
}: RankingItemProps) {
  const [errorImagen, setErrorImagen] = useState(false);
  const tieneImagenValida = Boolean(
    imagen && imagen.trim().length > 0 && !errorImagen,
  );

  return (
    <article
      onClick={() => onVerDetalle?.()}
      className="group relative flex cursor-pointer flex-col gap-3 rounded-card border border-line bg-paper p-4 transition-colors hover:border-brand-blue"
    >
      <div className="flex items-start gap-3">
        {/* Posición en el ranking */}
        <div className="flex h-14 w-11 shrink-0 flex-col items-center justify-center rounded-card border border-line bg-canvas">
          <span className="text-sm font-medium tracking-normal text-ink">
            #{ranking}
          </span>
          <span className="text-[9px] font-medium uppercase tracking-normal text-brand-blue">
            TOP
          </span>
        </div>

        {/* Miniatura del producto */}
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-card border border-line bg-surface-0 p-1.5">
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

        {/* Marca, título y métrica real */}
        <div className="min-w-0 flex-1">
          {marca && (
            <p className="truncate text-[10px] font-medium uppercase tracking-normal text-subtle">
              {marca}
            </p>
          )}

          <h4 className="mt-0.5 line-clamp-2 text-sm font-medium uppercase leading-snug text-ink">
            {nombre}
          </h4>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            {metricaTipo === "valoracion" &&
              typeof puntuacion === "number" && (
                <>
                  <span
                    className="inline-flex items-center gap-1 rounded-full border border-star bg-transparent px-2 py-0.5 text-[10px] font-medium text-star"
                    aria-label={`Puntuación ${puntuacion.toFixed(1)} de 5`}
                  >
                    <svg
                      className="h-3 w-3 text-star"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M12 3.5l2.6 5.27 5.82.85-4.21 4.1.99 5.8L12 16.78l-5.2 2.74.99-5.8-4.21-4.1 5.82-.85L12 3.5z" />
                    </svg>
                    {puntuacion.toFixed(1)}
                  </span>

                  {typeof cantidadValoraciones === "number" && (
                    <span className="text-[10px] font-medium text-subtle">
                      {pluralizar(
                        cantidadValoraciones,
                        "valoración",
                        "valoraciones",
                      )}
                    </span>
                  )}
                </>
              )}

            {metricaTipo === "comentario" &&
              typeof cantidadResenas === "number" && (
                <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-ink">
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-4-.84L3 20l1.18-3.54A7.38 7.38 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  {pluralizar(cantidadResenas, "reseña", "reseñas")}
                </span>
              )}

            {metricaTipo === "deseo" && typeof cantidadDeseados === "number" && (
              <span className="inline-flex items-center gap-1 rounded-full border border-star bg-transparent px-2 py-0.5 text-[10px] font-medium text-star">
                <svg
                  className="h-3 w-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z"
                  />
                </svg>
                {pluralizar(cantidadDeseados, "deseo", "deseos")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Ficha sintetizada: dos líneas máximo para no saturar la tarjeta */}
      {descripcion && (
        <p className="line-clamp-2 text-xs leading-relaxed text-subtle">
          {descripcion}
        </p>
      )}

      {/* Precio y acción en una fila propia, sin competir con el texto */}
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-dotted border-line pt-3">
        <span
          className={`min-w-0 truncate text-sm font-medium uppercase tracking-normal ${
            precio !== null && precio !== undefined
              ? "text-ink"
              : "text-[10px] font-medium text-subtle"
          }`}
        >
          {precio !== null && precio !== undefined
            ? formatearCOP(precio)
            : "Consultar precio"}
        </span>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onVerDetalle?.();
          }}
          aria-label={`Ver ficha de ${nombre}`}
          className={buttonClassName("secondary", "shrink-0")}
        >
          Ver ficha
          <svg
            className="h-3 w-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </article>
  );
}
