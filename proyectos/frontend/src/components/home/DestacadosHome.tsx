"use client";

import Link from "next/link";
import TarjetaProducto from "@/components/catalogo/TarjetaProducto";
import EstadoVacio from "@/components/ui/EstadoVacio";
import type { ProductoViewModel } from "@/data/productoViewModel";

export interface DestacadosHomeProps {
  productos: ProductoViewModel[];
  /** Productos activos registrados en el catálogo. No implica verificación. */
  totalRegistrados: number;
  totalMostrados: number;
  cargando: boolean;
  estadoBackend: "online" | "offline";
  onVerDetalle: (producto: ProductoViewModel) => void;
  error?: string | null;
  onReintentar?: () => void;
}

export default function DestacadosHome({
  productos,
  totalRegistrados,
  totalMostrados,
  cargando,
  estadoBackend,
  onVerDetalle,
  error = null,
  onReintentar,
}: DestacadosHomeProps) {
  return (
    <section
      id="seccion-destacados"
      aria-labelledby="seccion-destacados-titulo"
      className="scroll-mt-16"
    >
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2
            id="seccion-destacados-titulo"
            className="text-[28px] font-medium uppercase leading-none tracking-normal text-ink"
          >
            Productos destacados.
          </h2>
          <p className="mt-2 text-xs text-subtle">
            {totalRegistrados} productos registrados en el catálogo •{" "}
            {totalMostrados} mostrado{totalMostrados === 1 ? "" : "s"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {estadoBackend === "online" ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-subtle">
              <span
                className="h-2 w-2 rounded-full bg-positive"
                aria-hidden="true"
              />
              Servidor conectado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-subtle">
              <span
                className="h-2 w-2 rounded-full bg-star"
                aria-hidden="true"
              />
              Servidor no disponible
            </span>
          )}

          <Link
            href="/productos"
            className="inline-flex items-center gap-2 text-[12px] font-medium uppercase tracking-normal text-brand-blue transition-colors hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          >
            Ver catálogo completo
            <svg
              className="h-3.5 w-3.5"
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
          </Link>
        </div>
      </div>

      {cargando ? (
        <div
          className="flex flex-col items-center justify-center py-20"
          aria-live="polite"
          aria-busy="true"
        >
          <div
            className="h-10 w-10 animate-spin rounded-full border-2 border-hairline border-t-brand-blue"
            aria-hidden="true"
          />
          <p className="mt-4 text-sm text-subtle">
            Cargando catálogo de dispositivos...
          </p>
        </div>
      ) : error ? (
        <EstadoVacio
          tipo="error"
          titulo="No pudimos cargar los productos destacados"
          descripcion={error}
          accion={
            onReintentar
              ? {
                  etiqueta: "Reintentar",
                  onClick: onReintentar,
                }
              : undefined
          }
        />
      ) : productos.length > 0 ? (
        <div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
            {productos.map((producto) => (
              <TarjetaProducto
                key={`prod-${producto.idProducto}`}
                producto={producto}
                variante="inicio"
                posicionRanking={producto.posicionRanking}
                onVerDetalle={onVerDetalle}
              />
            ))}
          </div>

          <div className="mt-7 flex justify-center">
            <Link
              href="/productos"
              className="group inline-flex items-center gap-2 text-[12px] font-medium uppercase tracking-normal text-brand-blue transition-colors hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
            >
              Explorar todos los productos ({totalRegistrados})
              <svg
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
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
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-card border border-dashed border-hairline bg-paper p-8 text-center text-sm sm:p-12">
          <p className="text-subtle">
            No hay productos registrados en el catálogo en este momento.
          </p>
        </div>
      )}
    </section>
  );
}
