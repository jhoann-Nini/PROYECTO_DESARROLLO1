/* eslint-disable @next/next/no-img-element */
"use client";

import { Producto } from "@/types/producto";
import { obtenerAtribucionImagen } from "@/data/atribucionImagenes";
import { useState } from "react";
import { formatearCOP } from "@/data/specsHelper";
import { sanearPrecioCOP } from "@/data/precios";
import ProductImagePlaceholder from "@/components/ProductImagePlaceholder";
import AtribucionImagenProducto from "@/components/AtribucionImagenProducto";
import Button from "@/components/ui/Button";

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

  const imagenSinDerivados = obtenerAtribucionImagen(producto.imagen)?.licencia === "CC BY-ND 2.0";

  const precioFormateado = formatearCOP(producto.precioReferencia);

  const cumplePresupuesto =
    limitePresupuestoCOP !== undefined &&
    limitePresupuestoCOP !== null &&
    producto.precioReferencia !== null &&
    producto.precioReferencia !== undefined
      ? sanearPrecioCOP(producto.precioReferencia) <= limitePresupuestoCOP
      : null;

  return (
    <article
      onClick={() => onVerDetalle?.(producto)}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-card border border-line bg-surface-1 transition-colors duration-200 hover:border-brand-blue"
    >
      {/* Contenedor de Fotografía */}
      <div className="relative flex h-48 w-full items-center justify-center overflow-hidden border-b border-dotted border-line bg-surface-0 p-5">
        {tieneImagenValida ? (
          <img
            src={producto.imagen!}
            alt={`Fotografía de ${producto.nombre}`}
            onError={() => setErrorImagen(true)}
            className={`h-full w-full object-contain ${imagenSinDerivados ? "" : "transition-transform duration-300 group-hover:scale-105"}`}
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
          <span className="rounded-pill border border-line bg-surface-1 px-2.5 py-1 text-[10px] font-medium text-subtle">
            {producto.nombreCategoria || `CAT ${producto.idCategoria}`}
          </span>
          <span className="rounded-pill border border-line bg-surface-1 px-2.5 py-1 text-[10px] font-medium text-ink">
            {producto.nombreMarca || `Marca ${producto.idMarca}`}
          </span>
        </div>

        {/* Indicador de disponibilidad */}
        {producto.estado ? (
          <span className="absolute right-3 top-3 rounded-pill border border-line bg-surface-1 px-2.5 py-1 text-[10px] font-medium text-ink">
            Disponible
          </span>
        ) : (
          <span className="absolute right-3 top-3 rounded-pill border border-line bg-surface-2 px-2.5 py-1 text-[10px] font-medium text-subtle">
            No disponible
          </span>
        )}
      </div>
      <AtribucionImagenProducto src={producto.imagen} className="px-3 py-1" />

      {/* Contenido descriptivo del producto */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-1 text-base font-medium uppercase tracking-normal text-ink transition-colors group-hover:text-brand-blue">
          {producto.nombre}
        </h3>

        <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-subtle">
          {producto.descripcion || "Especificaciones técnicas detalladas disponibles en la ficha."}
        </p>

        {/* Sección de precio y acción principal */}
        <div className="mt-5 flex items-end justify-between gap-3 border-t border-dotted border-line pt-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="block text-[10px] font-medium uppercase tracking-normal text-subtle">
                Precio estimado
              </span>
              {cumplePresupuesto !== null && (
                cumplePresupuesto ? (
                  <span
                    className="inline-flex items-center rounded-pill border border-line bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-ink"
                    title="Dentro del presupuesto máximo"
                  >
                    ✓ En presupuesto
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center rounded-pill border border-line bg-surface-1 px-2 py-0.5 text-[10px] font-medium text-ink"
                    title="Supera el presupuesto máximo"
                  >
                    Supera presupuesto
                  </span>
                )
              )}
            </div>
            <span className="mt-1 block truncate text-base font-medium uppercase tracking-normal text-ink">
              {precioFormateado}
            </span>
          </div>

          <Button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onVerDetalle?.(producto);
            }}
            aria-label={`Consultar ficha técnica de ${producto.nombre}`}
            className="shrink-0 text-xs"
          >
            Ver ficha técnica
          </Button>
        </div>
      </div>
    </article>
  );
}
