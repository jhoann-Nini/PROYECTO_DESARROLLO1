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
    <section aria-labelledby="seccion-ofertas" className="rounded-card border border-hairline bg-paper">
      <div className="flex flex-col gap-3 border-b border-dashed border-line px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 animate-pulse rounded-full bg-star"
            aria-hidden="true"
          />
          <h2 id="seccion-ofertas" className="text-[28px] font-medium uppercase leading-none text-ink">
            Ofertas destacadas
          </h2>
        </div>
        <span className="rounded-pill border border-line bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-brand-blue">
          En promoción ({ofertas.length})
        </span>
      </div>

      <div className="flex-1 divide-y divide-dashed divide-line px-5">
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
              className="grid gap-3 py-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_80px_minmax(130px,auto)] md:items-center md:gap-4"
            >
              <button type="button" onClick={() => onVerDetalle(oferta)}
                className={`group flex min-w-0 cursor-pointer items-center gap-3 text-left ${CLASE_FOCO}`}
              >
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-card border border-hairline bg-canvas p-1">
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

              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink transition-colors group-hover:text-brand-blue">
                  {oferta.nombre}
                </p>
                {oferta.ahorroMonetario > 0 && (
                  <p className="text-[10px] font-medium text-positive">
                    Ahorras: {formatearCOP(oferta.ahorroMonetario)}
                  </p>
                )}
              </div>
              </button>
              <p className="truncate text-xs text-subtle">
                {oferta.nombreEstablecimiento}
                {oferta.descripcion ? ` · ${oferta.descripcion}` : ""}
              </p>
              <div className="text-left">
                <div className="text-sm font-medium text-ink">
                  {formatearCOP(oferta.precioActual)}
                </div>
                {oferta.precioReferencia && (
                  <div className="text-[11px] text-subtle line-through">
                    {formatearCOP(oferta.precioReferencia)}
                  </div>
                )}
              </div>
              <div>
                {oferta.porcentajeDescuento > 0 && (
                  <span className="inline-block rounded-pill bg-ink px-2 py-0.5 text-[11px] font-medium text-canvas">
                    -{Math.round(oferta.porcentajeDescuento)}%
                  </span>
                )}
              </div>
              <button type="button" onClick={() => onReportar(oferta)}
                aria-label={`Reportar precio o enlace de ${oferta.nombre} en ${oferta.nombreEstablecimiento}`}
                className={`cursor-pointer text-left text-xs font-medium text-brand-blue underline underline-offset-4 md:text-right ${CLASE_FOCO}`}
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
        <div className="border-t border-dashed border-line px-5 py-4 text-center">
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
    </section>
  );
}
