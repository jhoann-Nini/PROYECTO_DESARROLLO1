"use client";

import { useEffect, useState } from "react";
import { obtenerProductos } from "@/services/api";
import Link from "next/link";
import { Producto } from "@/types/producto";
import { formatearCOP } from "@/data/specsHelper";

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
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 text-slate-900 dark:text-slate-100 transition-colors">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 dark:border-slate-800 mb-8 gap-4">
          <div>
            <span className="font-doto text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-widest">
              CATÁLOGO DE PRODUCTOS
            </span>
            <h1 className="font-doto text-3xl font-black uppercase tracking-wider text-slate-900 dark:text-white mt-1">
              Tec<span className="text-blue-700 dark:text-blue-400">Review</span> Explorador.
            </h1>
          </div>
          <Link
            href="/"
            className="font-doto uppercase tracking-wider inline-flex items-center gap-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-2xs transition-colors"
          >
            ← VOLVER AL INICIO
          </Link>
        </div>

        {cargando && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-600 dark:text-slate-400 shadow-sm">
            Consultando catálogo de productos en el servidor...
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 p-6 text-sm text-red-800 dark:text-red-300 shadow-sm">
            <p className="font-bold">Estado de conexión con el backend:</p>
            <p className="mt-1 text-xs">{error}</p>
          </div>
        )}

        {!cargando && !error && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{productos.length} productos registrados</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {productos.map((prod) => (
                <div
                  key={prod.idProducto}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm"
                >
                  <h3 className="font-bold text-slate-900 dark:text-white line-clamp-1">
                    {prod.nombre}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 line-clamp-2">
                    {prod.descripcion || "Sin descripción disponible."}
                  </p>
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-500">Precio</span>
                    <span className="text-sm font-bold text-blue-700 dark:text-blue-400">
                      {formatearCOP(prod.precioReferencia)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
