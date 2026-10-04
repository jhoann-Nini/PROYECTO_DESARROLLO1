"use client";

import { useEffect, useState } from "react";
import { obtenerProductos } from "@/services/api";
import Link from "next/link";

export default function ProductosPage() {
  const [productos, setProductos] = useState<unknown>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    obtenerProductos()
      .then((datos) => {
        setProductos(datos);
      })
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : "Ocurrió un error inesperado al cargar los productos.",
        );
      })
      .finally(() => {
        setCargando(false);
      });
  }, []);

  return (
    <main className="min-h-screen bg-[#080808] p-6 text-[#f4f4f5] font-tech">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between pb-6 border-b border-zinc-800 mb-8">
          <div>
            <span className="font-mono text-xs text-[#d71920] font-bold">
              {"// RAW API INSPECTOR [/api/productos]"}
            </span>
            <h1 className="font-dot text-3xl font-bold tracking-wider text-white mt-1">
              NOTHING <span className="text-[#d71920]">DEBUGGER</span>
            </h1>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 font-mono text-xs font-bold text-zinc-300 hover:border-[#d71920] hover:text-white transition-all"
          >
            ← VOLVER AL PORTAL
          </Link>
        </div>

        {cargando && (
          <div className="rounded-xl border border-zinc-800 bg-[#121216] p-6 font-mono text-sm text-zinc-400">
            [SYS] Consultando backend en http://localhost:8080/api/productos...
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-[#d71920]/40 bg-[#1a0c0e] p-6 font-mono text-sm text-[#ff6b75]">
            <p className="font-bold text-[#ff2a35]">[ERROR_STATUS]: Conexión rechazada</p>
            <p className="mt-1 text-xs">{error}</p>
          </div>
        )}

        {!cargando && !error && (
          <div className="rounded-xl border border-zinc-800 bg-[#0c0c0f] p-4 shadow-2xl">
            <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest block mb-2">
              JSON PAYLOAD RESPONSE
            </span>
            <pre className="overflow-x-auto rounded-lg bg-black p-4 font-mono text-xs text-emerald-400">
              {JSON.stringify(productos, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}
