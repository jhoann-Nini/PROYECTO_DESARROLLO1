"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { obtenerProductos } from "@/services/api";
import { Producto } from "@/types/producto";
import { formatearCOP } from "@/data/specsHelper";
import GeometricBackground from "@/components/GeometricBackground";

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    obtenerProductos<Producto>()
      .then((datos) => {
        setProductos(datos);
      })
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : "No fue posible conectar con el catálogo de productos.",
        );
      })
      .finally(() => {
        setCargando(false);
      });
  }, []);

  return (
    <main className="relative min-h-screen overflow-x-clip px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <GeometricBackground tema="oscuro" />

      <div className="relative mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 border-b border-line/70 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-300">
              Catálogo de productos
            </span>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
              TecReview Explorador.
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">
              Consulta directa al catálogo del backend y sus precios de
              referencia.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-control border border-line bg-surface-1/80 px-4 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-blue-500/40 hover:text-white"
          >
            ← Volver al inicio
          </Link>
        </div>

        {cargando && (
          <div
            className="flex flex-col items-center justify-center rounded-card border border-line bg-surface-1/80 p-10 text-center"
            aria-live="polite"
            aria-busy="true"
          >
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-line border-t-blue-500" />
            <p className="mt-4 text-sm text-slate-500">
              Consultando catálogo de productos en el servidor...
            </p>
          </div>
        )}

        {error && (
          <div
            className="rounded-card border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200"
            role="alert"
          >
            <p className="font-semibold text-red-300">
              Estado de conexión con el backend:
            </p>
            <p className="mt-1 text-xs text-red-200/80">{error}</p>
          </div>
        )}

        {!cargando && !error && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{productos.length} productos registrados</span>
            </div>

            {productos.length > 0 ? (
              <div className="grid animate-fade-in gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {productos.map((prod) => (
                  <article
                    key={prod.idProducto}
                    className="group flex flex-col rounded-card border border-line bg-surface-1/80 p-5 transition-all duration-200 hover:border-blue-500/40 hover:bg-surface-1"
                  >
                    <h3 className="line-clamp-1 font-display text-base font-semibold tracking-[-0.01em] text-white transition-colors group-hover:text-blue-300">
                      {prod.nombre}
                    </h3>
                    <p className="mt-2 line-clamp-2 flex-1 text-xs leading-relaxed text-slate-400">
                      {prod.descripcion || "Sin descripción disponible."}
                    </p>
                    <div className="mt-4 flex items-center justify-between border-t border-line/70 pt-3">
                      <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
                        Precio
                      </span>
                      <span className="text-sm font-semibold tracking-tight text-emerald-400">
                        {formatearCOP(prod.precioReferencia)}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-card border border-dashed border-line bg-surface-1/50 p-10 text-center">
                <p className="font-semibold text-slate-200">
                  No hay productos registrados en el catálogo.
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Cuando el backend registre productos aparecerán aquí
                  automáticamente.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
