/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import type { ProductoViewModel } from "@/data/productoViewModel";
import { formatearCOP } from "@/data/specsHelper";
import ProductImagePlaceholder from "@/components/ProductImagePlaceholder";
import BotonFavorito from "@/components/favoritos/BotonFavorito";
import { CLASE_FOCO } from "@/components/ui/foco";
import RatingStars from "./RatingStars";

export type VarianteTarjetaProducto = "grid" | "lista";

interface TarjetaProductoProps {
  producto: ProductoViewModel;
  onVerDetalle?: (producto: ProductoViewModel) => void;
  presupuesto?: "dentro" | "fuera" | null;
  posicionRanking?: number | null;
  variante?: VarianteTarjetaProducto;
}

function textoCantidadTiendas(cantidad: number): string {
  return `${cantidad} ${cantidad === 1 ? "tienda" : "tiendas"}`;
}

export default function TarjetaProducto({
  producto,
  onVerDetalle,
  presupuesto = null,
  posicionRanking = null,
  variante = "grid",
}: TarjetaProductoProps) {
  const [errorImagen, setErrorImagen] = useState(false);

  const esLista = variante === "lista";
  const tieneImagen =
    Boolean(producto.imagen) && producto.imagen !== null && !errorImagen;
  const specs = [
    producto.especificaciones.pantalla,
    producto.especificaciones.procesador,
  ]
    .filter((valor): valor is string => Boolean(valor))
    .slice(0, 2);

  const numeroTiendas = producto.numeroTiendas ?? 0;
  const precioDesde = producto.precioDesdeCOP ?? producto.precioCOP;
  const mostrarPrecioTiendas = numeroTiendas > 0 && precioDesde > 0;
  const precioTexto = mostrarPrecioTiendas
    ? `Desde ${formatearCOP(precioDesde)}`
    : producto.precioCOP > 0
      ? producto.precioFormateado
      : "Consultar disponibilidad";
  const tienePosicion =
    typeof posicionRanking === "number" &&
    Number.isInteger(posicionRanking) &&
    posicionRanking > 0;

  return (
    <article
      data-variante={variante}
      className={
        esLista
          ? "group flex gap-4 overflow-hidden rounded-lg border border-[var(--color-hairline)] bg-[var(--color-paper)] p-3 shadow-[var(--shadow-paper)] transition-shadow duration-200 hover:shadow-[var(--shadow-paper-hover)]"
          : "group flex flex-col overflow-hidden rounded-lg border border-[var(--color-hairline)] bg-[var(--color-paper)] shadow-[var(--shadow-paper)] transition-shadow duration-200 hover:shadow-[var(--shadow-paper-hover)]"
      }
    >
      <div
        className={
          esLista
            ? "relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-2"
            : "relative flex h-40 items-center justify-center overflow-hidden border-b border-[var(--color-hairline)] bg-[var(--color-canvas)] p-4"
        }
      >
        <button
          type="button"
          onClick={() => onVerDetalle?.(producto)}
          aria-label={`Ver detalle de ${producto.nombre}`}
          className={`flex h-full w-full cursor-pointer items-center justify-center ${CLASE_FOCO}`}
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
              tamano={esLista ? "sm" : "md"}
            />
          )}
        </button>

        {tienePosicion && (
          <span className="absolute left-2 top-2 rounded-md bg-[var(--color-brand-solid)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-on-solid)] shadow-[var(--shadow-paper)]">
            #{posicionRanking} TOP
          </span>
        )}

        <div className="absolute right-2 top-2">
          <BotonFavorito
            idProducto={producto.idProducto}
            nombreProducto={producto.nombre}
            compacto
          />
        </div>
      </div>

      <div
        className={
          esLista
            ? "flex min-w-0 flex-1 flex-col py-1 pr-1"
            : "flex flex-1 flex-col p-4"
        }
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-xs font-medium text-[var(--color-subtle)]">
            <span>{producto.marca}</span>
            <span aria-hidden="true"> · </span>
            <span>{producto.categoriaEtiqueta}</span>
          </p>

          <span
            className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ${
              producto.disponible
                ? "bg-[var(--color-positive)]/15 text-[var(--color-ink)]"
                : "bg-[var(--color-hairline)] text-[var(--color-subtle)]"
            }`}
          >
            {producto.disponible ? "Disponible" : "No disponible"}
          </span>
        </div>

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
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {specs.map((spec) => (
              <li
                key={spec}
                title={spec}
                className="inline-flex max-w-full items-center gap-1 rounded-md border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-2 py-1 text-[11px] text-[var(--color-subtle)]"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  className="h-3 w-3 shrink-0"
                >
                  <path strokeLinecap="round" d="M9 12.75l2.25 2.25L15 9.75" />
                  <circle cx="12" cy="12" r="8.25" />
                </svg>
                <span className="truncate">{spec}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-[var(--color-hairline)] pt-3">
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
                producto.precioCOP > 0 || mostrarPrecioTiendas
                  ? "text-[var(--color-ink)]"
                  : "text-[var(--color-subtle)]"
              }`}
            >
              {precioTexto}
            </span>
            {mostrarPrecioTiendas && (
              <span className="mt-0.5 block text-[11px] font-medium text-[var(--color-subtle)]">
                · {textoCantidadTiendas(numeroTiendas)}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => onVerDetalle?.(producto)}
            className={`shrink-0 cursor-pointer rounded-md bg-[var(--color-brand-solid)] px-3 py-2 text-xs font-semibold text-[var(--color-on-solid)] transition-colors hover:bg-[var(--color-brand-solid)]/90 ${CLASE_FOCO}`}
          >
            Ver detalle
          </button>
        </div>
      </div>
    </article>
  );
}
