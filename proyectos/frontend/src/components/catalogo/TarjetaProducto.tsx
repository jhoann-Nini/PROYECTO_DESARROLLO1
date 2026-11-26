/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import type { ProductoViewModel } from "@/data/productoViewModel";
import { obtenerAtribucionImagen } from "@/data/atribucionImagenes";
import { formatearCOP } from "@/data/specsHelper";
import ProductImagePlaceholder from "@/components/ProductImagePlaceholder";
import AtribucionImagenProducto from "@/components/AtribucionImagenProducto";
import BotonFavorito from "@/components/favoritos/BotonFavorito";
import { CLASE_FOCO } from "@/components/ui/foco";
import Button from "@/components/ui/Button";
import RatingStars from "./RatingStars";

export type VarianteTarjetaProducto = "grid" | "lista" | "inicio";

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
  const esInicio = variante === "inicio";
  const tieneImagen =
    Boolean(producto.imagen) && producto.imagen !== null && !errorImagen;
  const imagenSinDerivados = obtenerAtribucionImagen(producto.imagen)?.licencia === "CC BY-ND 2.0";
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
          ? "group flex gap-4 overflow-hidden rounded-card border border-line bg-paper p-3 transition-colors duration-200 hover:border-brand-blue"
          : esInicio
            ? "group flex flex-col overflow-hidden rounded-card border border-line bg-paper p-4 transition-colors duration-200 hover:border-brand-blue"
            : "group flex flex-col overflow-hidden rounded-card border border-line bg-paper transition-colors duration-200 hover:border-brand-blue"
      }
    >
      <div
        className={
          esLista
            ? "relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-card border border-line bg-surface-0 p-2"
            : esInicio
              ? "relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-card border border-hairline bg-surface-0 p-4"
              : "relative flex h-40 items-center justify-center overflow-hidden border-b border-dotted border-line bg-surface-0 p-4"
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
              className={`h-full w-full object-contain ${imagenSinDerivados ? "" : "transition-transform duration-300 group-hover:scale-[1.03]"}`}
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
        <AtribucionImagenProducto
          src={producto.imagen}
          className="absolute bottom-1 left-1 right-1 rounded bg-paper px-1 py-0.5"
        />

        {tienePosicion && (
          <span className="absolute left-2 top-2 rounded-card bg-brand-solid px-2 py-1 text-[10px] font-medium uppercase tracking-normal text-on-solid ">
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
            : esInicio
              ? "flex flex-1 flex-col pt-4"
              : "flex flex-1 flex-col p-4"
        }
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-xs font-medium text-subtle">
            <span>{producto.marca}</span>
            <span aria-hidden="true"> · </span>
            <span>{producto.categoriaEtiqueta}</span>
          </p>

          {/* Fase 4 (H-04): solo se afirma disponibilidad con ofertas confirmadas por el backend. */}
          {producto.disponibilidadConsultada && (
            <span
              className={`inline-flex shrink-0 items-center rounded-card px-2 py-0.5 text-[10px] font-medium ${
 numeroTiendas > 0
 ? "bg-surface-2 text-ink"
 : "border border-line bg-paper text-subtle"
 }`}
            >
              {numeroTiendas > 0 ? "Disponible" : "Sin tiendas registradas"}
            </span>
          )}
        </div>

        <h3 className="mt-1 line-clamp-2 text-sm font-medium uppercase leading-snug text-ink">
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
                className="inline-flex max-w-full items-center gap-1 rounded-card border border-hairline bg-canvas px-2 py-1 text-[11px] text-subtle"
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

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-dotted border-line pt-3">
          <div className="min-w-0">
            {presupuesto === "dentro" && (
              <span className="mb-1 inline-flex items-center rounded-card bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-ink">
                ✓ En presupuesto
              </span>
            )}
            {presupuesto === "fuera" && (
              <span className="mb-1 inline-flex items-center rounded-card border border-line bg-paper px-2 py-0.5 text-[10px] font-medium text-subtle">
                Supera presupuesto
              </span>
            )}
            <span
              className={`block font-medium uppercase ${esInicio ? "text-lg leading-none" : "text-base"} ${
 producto.precioCOP > 0 || mostrarPrecioTiendas
 ? "text-ink"
 : "text-subtle"
 }`}
            >
              {precioTexto}
            </span>
            {mostrarPrecioTiendas && (
              <span className="mt-0.5 block text-[11px] font-medium text-subtle">
                · {textoCantidadTiendas(numeroTiendas)}
              </span>
            )}
          </div>

          <Button
            type="button"
            variant={esInicio ? "secondary" : "primary"}
            onClick={() => onVerDetalle?.(producto)}
            className={esInicio ? "min-h-9 shrink-0 px-3 py-1.5 text-[11px]" : "shrink-0 text-xs"}
          >
            Ver detalle
          </Button>
        </div>
      </div>
    </article>
  );
}
