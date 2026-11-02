"use client";

import Link from "next/link";
import TarjetaProducto from "@/components/catalogo/TarjetaProducto";
import { formatearCOP } from "@/data/specsHelper";
import type { ProductoViewModel } from "@/data/productoViewModel";

export interface DestacadosHomeProps {
  productos: ProductoViewModel[];
  totalVerificados: number;
  totalMostrados: number;
  cargando: boolean;
  estadoBackend: "online" | "offline";
  busqueda: string;
  filtroPresupuesto: boolean;
  presupuestoMax: number;
  limitePresupuestoCOP: number;
  onVerDetalle: (producto: ProductoViewModel) => void;
  onLimpiarBusqueda: () => void;
  onMostrarTodos: () => void;
}

export default function DestacadosHome({
  productos,
  totalVerificados,
  totalMostrados,
  cargando,
  estadoBackend,
  busqueda,
  filtroPresupuesto,
  presupuestoMax,
  limitePresupuestoCOP,
  onVerDetalle,
  onLimpiarBusqueda,
  onMostrarTodos,
}: DestacadosHomeProps) {
  return (
    <section
      id="seccion-destacados"
      aria-labelledby="seccion-destacados-titulo"
      className="mx-auto max-w-7xl scroll-mt-16 px-4 py-10 sm:px-6 lg:px-8"
    >
      <div className="mb-6 flex flex-col gap-4 border-b border-[var(--color-hairline)] pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h2
            id="seccion-destacados-titulo"
            className="text-xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-2xl"
          >
            Destacados para ti.
          </h2>
          <p className="mt-1 text-xs text-[var(--color-subtle)]">
            {totalVerificados} productos verificados en la plataforma •{" "}
            {totalMostrados} mostrado{totalMostrados === 1 ? "" : "s"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {filtroPresupuesto ? (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-brand-solid)]/30 bg-[var(--color-brand-solid)]/10 px-3 py-1 text-xs font-semibold text-[var(--color-ink)]">
              <span
                className="h-2 w-2 rounded-full bg-[var(--color-brand-solid)]"
                aria-hidden="true"
              />
              Presupuesto aplicado: {formatearCOP(limitePresupuestoCOP)}
            </span>
          ) : null}

          {estadoBackend === "online" ? (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-positive)]/30 bg-[var(--color-positive)]/10 px-3 py-1 text-xs font-semibold text-[var(--color-ink)]">
              <span
                className="h-2 w-2 rounded-full bg-[var(--color-positive)]"
                aria-hidden="true"
              />
              Servidor conectado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-star)]/30 bg-[var(--color-star)]/10 px-3 py-1 text-xs font-semibold text-[var(--color-ink)]">
              <span
                className="h-2 w-2 rounded-full bg-[var(--color-star)]"
                aria-hidden="true"
              />
              Modo local
            </span>
          )}

          <Link
            href="/productos"
            className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-brand-solid)] px-3.5 py-2 text-xs font-semibold text-[var(--color-on-solid)] shadow-[var(--shadow-paper)] transition-colors hover:bg-[var(--color-brand-solid)]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-blue)]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-canvas)]"
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
            className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--color-hairline)] border-t-[var(--color-brand-blue)]"
            aria-hidden="true"
          />
          <p className="mt-4 text-sm text-[var(--color-subtle)]">
            Cargando catálogo de dispositivos...
          </p>
        </div>
      ) : productos.length > 0 ? (
        <div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {productos.map((producto) => (
              <TarjetaProducto
                key={`prod-${producto.idProducto}`}
                producto={producto}
                posicionRanking={producto.posicionRanking}
                onVerDetalle={onVerDetalle}
                presupuesto={
                  producto.precioCOP > 0
                    ? producto.precioCOP <= limitePresupuestoCOP
                      ? "dentro"
                      : "fuera"
                    : null
                }
              />
            ))}
          </div>

          <div className="mt-8 flex justify-center">
            <Link
              href="/productos"
              className="group inline-flex items-center gap-2 rounded-lg bg-[var(--color-brand-solid)] px-5 py-3 text-sm font-semibold text-[var(--color-on-solid)] shadow-[var(--shadow-paper)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--color-brand-solid)]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-blue)]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-canvas)]"
            >
              Explorar todos los productos ({totalVerificados})
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
        <div className="rounded-lg border border-dashed border-[var(--color-hairline)] bg-[var(--color-paper)] p-8 text-center text-sm sm:p-12">
          {busqueda.trim() ? (
            <div className="space-y-3">
              <p className="text-base font-semibold text-[var(--color-ink)]">
                No encontramos productos con &ldquo;{busqueda.trim()}&rdquo;.
              </p>
              <p className="mx-auto max-w-md text-xs leading-relaxed text-[var(--color-subtle)]">
                Prueba con menos palabras, revisa la escritura o busca por marca,
                modelo o tipo de dispositivo (por ejemplo, Samsung, Asus o
                audífonos).
              </p>
              <button
                type="button"
                onClick={onLimpiarBusqueda}
                className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-[var(--color-brand-solid)] px-3.5 py-2 text-xs font-semibold text-[var(--color-on-solid)] transition-colors hover:bg-[var(--color-brand-solid)]/90"
              >
                Limpiar búsqueda
              </button>
            </div>
          ) : filtroPresupuesto ? (
            <div className="space-y-3">
              <p className="font-semibold text-[var(--color-ink)]">
                No hay productos registrados dentro del presupuesto de{" "}
                {formatearCOP(presupuestoMax)}.
              </p>
              <button
                type="button"
                onClick={onMostrarTodos}
                className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-[var(--color-brand-solid)] px-3.5 py-2 text-xs font-semibold text-[var(--color-on-solid)] transition-colors hover:bg-[var(--color-brand-solid)]/90"
              >
                Mostrar todos los productos
              </button>
            </div>
          ) : (
            <p className="text-[var(--color-subtle)]">
              No hay productos registrados en el catálogo en este momento.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
