"use client";

import { useEffect, useState } from "react";
import { ApiError, obtenerProductos } from "../services/api";
import type { Producto } from "../types/producto";

export default function Home() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;

    async function cargarProductos() {
      try {
        const datos = await obtenerProductos<Producto>();
        if (activo) {
          setProductos(datos);
          setError("");
        }
      } catch (err) {
        if (!activo) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "No fue posible cargar los productos.",
        );
      } finally {
        if (activo) setCargando(false);
      }
    }

    cargarProductos();
    return () => {
      activo = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-12 text-zinc-900">
      <section className="mx-auto w-full max-w-5xl">
        <header className="mb-8">
          <p className="text-sm font-medium text-zinc-500">TecReview</p>
          <h1 className="text-3xl font-bold">Productos tecnológicos</h1>
          <p className="mt-2 text-zinc-600">
            Productos obtenidos desde el backend de Spring Boot.
          </p>
        </header>

        {cargando && (
          <p className="rounded-lg bg-white p-6 shadow-sm">Cargando productos...</p>
        )}

        {!cargando && error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-800">
            <p className="font-semibold">No se pudieron cargar los productos.</p>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        )}

        {!cargando && !error && productos.length === 0 && (
          <p className="rounded-lg bg-white p-6 shadow-sm">No hay productos disponibles.</p>
        )}

        {!cargando && !error && productos.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {productos.map((producto) => (
              <article key={producto.idProducto} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold">{producto.nombre}</h2>
                {producto.descripcion && (
                  <p className="mt-2 text-sm text-zinc-600">{producto.descripcion}</p>
                )}
                {producto.precioReferencia !== null && (
                  <p className="mt-4 font-medium">
                    Precio de referencia: $\{producto.precioReferencia}
                  </p>
                )}
                <div className="mt-4 flex gap-2 text-xs text-zinc-500">
                  <span>Categoría: \{producto.idCategoria}</span>
                  <span>Marca: \{producto.idMarca}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
