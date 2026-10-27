"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  obtenerCategorias,
  obtenerMarcas,
  obtenerProductos,
} from "@/services/api";
import type {
  CategoriaResponse,
  MarcaResponse,
  Producto,
} from "@/types/producto";
import { construirCatalogo } from "@/data/catalogoApi";
import type { ProductoViewModel } from "@/data/productoViewModel";
import { useFavoritos } from "@/hooks/useFavoritos";
import TarjetaProducto from "@/components/catalogo/TarjetaProducto";

export default function FavoritosCliente() {
  const router = useRouter();
  const { ids, hidratado, limpiar } = useFavoritos();

  const [productos, setProductos] = useState<ProductoViewModel[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    let activo = true;

    Promise.all([
      obtenerProductos<Producto>(),
      obtenerCategorias(),
      obtenerMarcas(),
    ])
      .then(
        ([productosApi, categorias, marcas]: [
          Producto[],
          CategoriaResponse[],
          MarcaResponse[],
        ]) => {
          if (!activo) return;
          setProductos(
            construirCatalogo({
              productos: productosApi,
              categorias,
              marcas,
            }),
          );
        },
      )
      .catch((err: unknown) => {
        if (!activo) return;
        setError(
          err instanceof Error
            ? err.message
            : "No fue posible cargar tus favoritos.",
        );
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [intento]);

  const favoritos = useMemo(() => {
    const porId = new Map(
      productos.map((producto) => [producto.idProducto, producto]),
    );
    return ids
      .map((id) => porId.get(id))
      .filter((producto): producto is ProductoViewModel => Boolean(producto));
  }, [ids, productos]);

  const noDisponibles = Math.max(0, ids.length - favoritos.length);

  function reintentar() {
    setCargando(true);
    setError(null);
    setIntento((valor) => valor + 1);
  }

  function vaciarFavoritos() {
    limpiar();
    setAviso("Se vaciaron tus favoritos.");
  }

  if (cargando) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div
          role="status"
          aria-busy="true"
          className="flex flex-col items-center justify-center rounded-xl border border-[var(--color-hairline)] bg-[var(--color-paper)] p-12 text-center"
        >
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-[var(--color-hairline)] border-t-[var(--color-brand-blue)]" />
          <p className="mt-4 text-sm text-[var(--color-subtle)]">
            Cargando tus favoritos…
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-8 text-center"
        >
          <p className="text-lg font-semibold text-red-900">
            No pudimos cargar tus favoritos
          </p>
          <p className="mt-2 text-sm text-red-800">{error}</p>
          <button
            type="button"
            onClick={reintentar}
            className="mt-4 cursor-pointer rounded-md bg-[var(--color-brand-solid)] px-4 py-2 text-sm font-semibold text-[var(--color-on-solid)] transition-colors hover:bg-[var(--color-brand-solid)]/90"
          >
            Reintentar
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-subtle)]">
            Tu selección personal
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--color-ink)] sm:text-3xl">
            Favoritos
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-subtle)]">
            Los productos que guardas se conservan en este navegador. No
            necesitas iniciar sesión para consultarlos.
          </p>
        </div>

        {hidratado && ids.length > 0 && (
          <button
            type="button"
            onClick={vaciarFavoritos}
            className="self-start cursor-pointer rounded-md border border-[var(--color-hairline)] bg-[var(--color-paper)] px-3.5 py-2 text-xs font-semibold text-[var(--color-subtle)] transition-colors hover:border-red-300 hover:text-red-700 sm:self-auto"
          >
            Vaciar favoritos
          </button>
        )}
      </header>

      <p
        role="status"
        aria-live="polite"
        className="mb-4 min-h-4 text-xs text-[var(--color-subtle)]"
      >
        {aviso}
      </p>

      {!hidratado ? (
        <p role="status" className="text-sm text-[var(--color-subtle)]">
          Cargando tu lista de favoritos…
        </p>
      ) : favoritos.length === 0 ? (
        <div
          role="status"
          className="rounded-xl border border-dashed border-[var(--color-hairline)] bg-[var(--color-paper)] p-10 text-center"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="mx-auto h-10 w-10 text-[var(--color-subtle)]"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 20.25s-7.5-4.5-7.5-9.75A4.5 4.5 0 0 1 12 7.5a4.5 4.5 0 0 1 7.5 3c0 5.25-7.5 9.75-7.5 9.75Z"
            />
          </svg>
          <p className="mt-3 text-sm font-semibold text-[var(--color-ink)]">
            Aún no tienes productos favoritos.
          </p>
          <p className="mt-1 text-sm text-[var(--color-subtle)]">
            Usa el corazón en cualquier tarjeta o en la ficha de un producto
            para guardarlo aquí.
          </p>
          <Link
            href="/productos"
            className="mt-5 inline-flex rounded-md bg-[var(--color-brand-solid)] px-4 py-2 text-sm font-semibold text-[var(--color-on-solid)] transition-colors hover:bg-[var(--color-brand-solid)]/90"
          >
            Explorar catálogo
          </Link>
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-[var(--color-subtle)]">
            {favoritos.length} producto{favoritos.length === 1 ? "" : "s"} en
            favoritos.
          </p>

          {noDisponibles > 0 && (
            <p
              role="status"
              className="mb-4 rounded-md bg-[var(--color-star)]/10 px-3 py-2 text-sm text-[var(--color-ink)]"
            >
              {noDisponibles} producto{noDisponibles === 1 ? "" : "s"} guardado
              {noDisponibles === 1 ? "" : "s"} ya no aparece
              {noDisponibles === 1 ? "" : "n"} en el catálogo actual.
            </p>
          )}

          <section
            aria-label="Productos favoritos"
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          >
            {favoritos.map((producto) => (
              <TarjetaProducto
                key={producto.idProducto}
                producto={producto}
                onVerDetalle={(vista) =>
                  router.push(`/productos/${vista.idProducto}`)
                }
              />
            ))}
          </section>
        </>
      )}
    </main>
  );
}
