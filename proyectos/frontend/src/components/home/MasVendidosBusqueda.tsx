/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import ProductImagePlaceholder from "@/components/ProductImagePlaceholder";
import type { DispositivoKimovil } from "@/types/producto";

interface MasVendidosBusquedaProps {
  productos: DispositivoKimovil[];
  onSeleccionar: (nombre: string) => void;
}

function ProductoMasVendido({
  producto,
  onSeleccionar,
}: {
  producto: DispositivoKimovil;
  onSeleccionar: (nombre: string) => void;
}) {
  const [errorImagen, setErrorImagen] = useState(false);
  const tieneImagen = Boolean(producto.imagen?.trim() && !errorImagen);

  return (
    <li>
      <button
        type="button"
        onClick={() => onSeleccionar(producto.nombre)}
        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-[var(--color-canvas)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-blue)]"
      >
        <span
          className="w-7 shrink-0 text-center text-xs font-bold text-[var(--color-brand-blue)]"
          aria-label={`Puesto ${producto.ranking}`}
        >
          #{producto.ranking}
        </span>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[var(--color-hairline)] bg-[var(--color-paper)] p-1">
          {tieneImagen ? (
            <img
              src={producto.imagen}
              alt={`Foto de ${producto.nombre}`}
              onError={() => setErrorImagen(true)}
              className="h-full w-full object-contain"
              loading="lazy"
            />
          ) : (
            <ProductImagePlaceholder
              categoria={producto.categoria}
              marca={producto.marca}
              nombre={producto.nombre}
              tamano="sm"
              tema="claro"
            />
          )}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--color-ink)]">
          {producto.nombre}
        </span>
        <span className="shrink-0 text-xs font-semibold text-[var(--color-subtle)]">
          Nota {producto.puntuacion.toFixed(1)}/10
        </span>
      </button>
    </li>
  );
}

export default function MasVendidosBusqueda({
  productos,
  onSeleccionar,
}: MasVendidosBusquedaProps) {
  if (productos.length === 0) return null;

  return (
    <section
      aria-label="Más vendidos"
      className="mt-3 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-paper)] p-3 shadow-[var(--shadow-paper)]"
    >
      <h2 className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-subtle)]">
        Más vendidos
      </h2>
      <ol className="divide-y divide-[var(--color-hairline)]">
        {productos.slice(0, 5).map((producto) => (
          <ProductoMasVendido
            key={producto.id}
            producto={producto}
            onSeleccionar={onSeleccionar}
          />
        ))}
      </ol>
    </section>
  );
}
