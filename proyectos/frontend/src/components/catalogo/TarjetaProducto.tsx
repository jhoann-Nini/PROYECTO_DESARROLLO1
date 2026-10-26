/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import type { ProductoViewModel } from "@/data/productoViewModel";
import ProductImagePlaceholder from "@/components/ProductImagePlaceholder";
import BotonFavorito from "@/components/favoritos/BotonFavorito";
import RatingStars from "./RatingStars";

interface TarjetaProductoProps {
  producto: ProductoViewModel;
  onVerDetalle?: (producto: ProductoViewModel) => void;
  presupuesto?: "dentro" | "fuera" | null;
}

export default function TarjetaProducto({
  producto,
  onVerDetalle,
  presupuesto = null,
}: TarjetaProductoProps) {
  const [errorImagen, setErrorImagen] = useState(false);

  const tieneImagen =
    Boolean(producto.imagen) && producto.imagen !== null && !errorImagen;
  const specs = [producto.especificaciones.pantalla, producto.especificaciones.procesador]
    .filter((valor): valor is string => Boolean(valor))
    .slice(0, 2);

  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border border-[var(--color-hairline)] bg-[var(--color-paper)] shadow-[var(--shadow-paper)] transition-shadow duration-200 hover:shadow-[var(--shadow-paper-hover)]">
      <div className="relative flex h-40 items-center justify-center overflow-hidden border-b border-[var(--color-hairline)] bg-[var(--color-canvas)] p-4">
        <button
          type="button"
          onClick={() => onVerDetalle?.(producto)}
          aria-label={`Ver detalle de ${producto.nombre}`}
          className="flex h-full w-full cursor-pointer items-center justify-center"
        >
          {tieneImagen ? (
            <img
              src={producto.imagen!}
              alt={`Fotografía de ${producto.nombre}`}
              onError={() => setErrorImagen(true)}
              loading="lazy"
              className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <ProductImagePlaceholder
              categoria={producto.categoriaEtiqueta}
              marca={producto.marca}
              nombre={producto.nombre}
              tamano="md"
            />
          )}
        </button>

        <div className="absolute left-3 top-3">
          <BotonFavorito
            idProducto={producto.idProducto}
            nombreProducto={producto.nombre}
            compacto
          />
        </div>

        <span
          className={`absolute right-3 top-3 rounded-md px-2 py-1 text-[11px] font-semibold ${
            producto.disponible
              ? "bg-[var(--color-positive)] text-[var(--color-on-positive)]"
              : "bg-[var(--color-hairline)] text-[var(--color-subtle)]"
          }`}
        >
          {producto.disponible ? "Disponible" : "No disponible"}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-medium text-[var(--color-subtle)]">
          <span>{producto.marca}</span>
          <span aria-hidden="true"> · </span>
          <span>{producto.categoriaEtiqueta}</span>
        </p>

        <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-[var(--color-ink)]">
          {producto.nombre}
        </h3>

        <div className="mt-2">
          <RatingStars
            rating={producto.rating}
            cantidadResenas={producto.cantidadResenas}
          />
        </div>

        {specs.length > 0 && (
          <ul className="mt-3 flex-1 space-y-1">
            {specs.map((spec) => (
              <li
                key={spec}
                className="flex items-start gap-1.5 text-xs text-[var(--color-subtle)]"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                >
                  <path strokeLinecap="round" d="M9 12.75l2.25 2.25L15 9.75" />
                  <circle cx="12" cy="12" r="8.25" />
                </svg>
                <span className="line-clamp-1">{spec}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex items-end justify-between gap-3 border-t border-[var(--color-hairline)] pt-3">
          <div className="min-w-0">
            {presupuesto === "dentro" && (
              <span className="mb-1 inline-flex items-center rounded-md bg-[var(--color-positive)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-ink)]">
                ✓ En presupuesto
              </span>
            )}
            {presupuesto === "fuera" && (
              <span className="mb-1 inline-flex items-center rounded-md bg-[var(--color-hairline)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-subtle)]">
                Supera presupuesto
              </span>
            )}
            <span
              className={`block text-base font-semibold ${
                producto.precioCOP > 0
                  ? "text-[var(--color-ink)]"
                  : "text-[var(--color-subtle)]"
              }`}
            >
              {producto.precioCOP > 0
                ? producto.precioFormateado
                : "Consultar disponibilidad"}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onVerDetalle?.(producto)}
            className="shrink-0 cursor-pointer rounded-md bg-[var(--color-brand-solid)] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-brand-solid)]/90"
          >
            Ver detalle
          </button>
        </div>
      </div>
    </article>
  );
}
