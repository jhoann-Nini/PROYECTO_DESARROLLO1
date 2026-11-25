/* eslint-disable @next/next/no-img-element */
"use client";

import { formatearCOP } from "@/data/specsHelper";
import ProductImagePlaceholder from "@/components/ProductImagePlaceholder";
import type { ProductoOferta } from "@/types/producto";
import { CLASE_FOCO } from "@/components/ui/foco";

export interface OfertasHomeProps {
  ofertas: ProductoOferta[];
  cargando: boolean;
  error: string | null;
  onReintentar: () => void;
  mostrarTodas: boolean;
  onAlternar: () => void;
  onVerDetalle: (oferta: ProductoOferta) => void;
  onReportar: (oferta: ProductoOferta) => void;
}

export default function OfertasHome({
  ofertas,
  cargando,
  error,
  onReintentar,
  mostrarTodas,
  onAlternar,
  onVerDetalle,
  onReportar,
}: OfertasHomeProps) {
  const visibles = mostrarTodas ? ofertas : ofertas.slice(0, 3);

  return (
    <div className="flex h-full flex-col rounded-card border border-hairline bg-paper p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-dotted border-line pb-3">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 animate-pulse rounded-full bg-star"
            aria-hidden="true"
          />
          <h3 className="text-sm font-medium text-ink">
            Ofertas destacadas
          </h3>
        </div>
        <span className="rounded-card border border-line bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-brand-blue">
          En promoción ({ofertas.length})
        </span>
      </div>

      <div className="flex-1 space-y-3">
        {cargando ? (
          <div
            className="flex flex-col items-center justify-center py-12 text-center"
            aria-live="polite"
            aria-busy="true"
          >
            <div
              className="h-6 w-6 animate-spin rounded-full border-2 border-hairline border-t-brand-blue"
              aria-hidden="true"
            />
            <p className="mt-3 text-xs text-subtle">
              Cargando ofertas reales...
            </p>
          </div>
        ) : error ? (
          <div className="flex min-h-[220px] items-center justify-center">
            <div
              role="alert"
              className="w-full rounded-card border border-line bg-surface-2 px-4 py-6 text-center text-xs"
            >
              <p className="font-medium text-ink">⚠️ {error}</p>
              <button
                type="button"
                onClick={onReintentar}
                aria-label="Reintentar ofertas"
                className="mt-2 cursor-pointer text-xs font-medium text-brand-blue underline decoration-brand-blue underline-offset-4 transition-colors hover:no-underline"
              >
                Reintentar ofertas
              </button>
            </div>
          </div>
        ) : visibles.length > 0 ? (
          visibles.map((oferta) => (
            <div
              key={`oferta-${oferta.idProducto}-${oferta.idEstablecimiento}`}
              className="rounded-card border border-hairline bg-canvas p-3 transition-colors hover:border-line"
            >
              <button type="button" onClick={() => onVerDetalle(oferta)}
                className={`group flex w-full cursor-pointer items-center justify-between gap-3 text-left ${CLASE_FOCO}`}
              >
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-card border border-hairline bg-paper p-1">
                {oferta.imagen && oferta.imagen.trim().length > 0 ? (
                  <img
                    src={oferta.imagen}
                    alt={`Imagen de ${oferta.nombre}`}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <ProductImagePlaceholder
                    categoria={oferta.idCategoria}
                    nombre={oferta.nombre}
                    tamano="sm"
                  />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-ink transition-colors group-hover:text-brand-blue">
                  {oferta.nombre}
                </p>
                <p className="truncate text-[11px] text-subtle">
                  {oferta.nombreEstablecimiento}
                  {oferta.descripcion ? ` · ${oferta.descripcion}` : ""}
                </p>
                {oferta.ahorroMonetario > 0 && (
                  <p className="text-[10px] font-medium text-positive">
                    Ahorras: {formatearCOP(oferta.ahorroMonetario)}
                  </p>
                )}
              </div>

              <div className="shrink-0 text-right">
                {oferta.porcentajeDescuento > 0 && (
                  <span className="inline-block rounded-card border border-line bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-positive">
                    -{Math.round(oferta.porcentajeDescuento)}%
                  </span>
                )}
                <div className="text-xs font-medium text-brand-blue">
                  {formatearCOP(oferta.precioActual)}
                </div>
                {oferta.precioReferencia && (
                  <div className="text-[10px] text-subtle line-through">
                    {formatearCOP(oferta.precioReferencia)}
                  </div>
                )}
              </div>
              </button>
              <button type="button" onClick={() => onReportar(oferta)}
                aria-label={`Reportar precio o enlace de ${oferta.nombre} en ${oferta.nombreEstablecimiento}`}
                className={`mt-2 cursor-pointer text-xs font-medium text-brand-blue underline underline-offset-4 ${CLASE_FOCO}`}
              >Reportar precio o enlace</button>
            </div>
          ))
        ) : (
          <div className="py-8 text-center text-xs text-subtle">
            No hay ofertas coincidentes con este filtro.
          </div>
        )}
      </div>

      {ofertas.length > 3 && (
        <div className="mt-4 border-t border-dotted border-line pt-3 text-center">
          <button
            type="button"
            onClick={onAlternar}
            className="cursor-pointer text-xs font-medium text-brand-blue transition-colors hover:underline"
          >
            {mostrarTodas
              ? "Ocultar ofertas adicionales"
              : "Ver todas las ofertas disponibles"}
          </button>
        </div>
      )}
    </div>
  );
}
