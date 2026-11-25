/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import ProductImagePlaceholder from "@/components/ProductImagePlaceholder";
import { CLASE_FOCO } from "@/components/ui/foco";
import type { ProductoViewModel } from "@/data/productoViewModel";

interface SugerenciasBusquedaProps {
  productos: ProductoViewModel[];
  onSeleccionar: (nombre: string) => void;
}

function ProductoSugerido({
  producto,
  onSeleccionar,
}: {
  producto: ProductoViewModel;
  onSeleccionar: (nombre: string) => void;
}) {
  const [errorImagen, setErrorImagen] = useState(false);
  const tieneImagen = Boolean(producto.imagen && !errorImagen);

  return (
    <li>
      <button
        type="button"
        onClick={() => onSeleccionar(producto.nombre)}
        aria-label={`Buscar ${producto.nombre}`}
        className={`flex w-full items-center gap-3 rounded-card px-2 py-2 text-left transition-colors hover:bg-canvas ${CLASE_FOCO}`}
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-card border border-hairline bg-paper p-1">
          {tieneImagen ? (
            <img
              src={producto.imagen ?? ""}
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
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-ink">
            {producto.nombre}
          </span>
          <span className="block truncate text-xs text-subtle">
            {producto.marca} · {producto.categoriaEtiqueta}
          </span>
        </span>
      </button>
    </li>
  );
}

export default function SugerenciasBusqueda({
  productos,
  onSeleccionar,
}: SugerenciasBusquedaProps) {
  if (productos.length === 0) return null;

  return (
    <section
      aria-label="Sugerencias del catálogo"
      className="mt-3 rounded-card border border-hairline bg-paper p-3"
    >
      <h2 className="px-2 pb-1 text-xs font-medium uppercase tracking-normal text-subtle">
        Sugerencias del catálogo
      </h2>
      <ul className="divide-y divide-dotted divide-line">
        {productos.slice(0, 5).map((producto) => (
          <ProductoSugerido
            key={producto.idProducto}
            producto={producto}
            onSeleccionar={onSeleccionar}
          />
        ))}
      </ul>
    </section>
  );
}
