"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { MAX_COMPARADOR } from "@/data/comparador";
import { useComparador } from "@/hooks/useComparador";
import { obtenerProductos } from "@/services/api";
import type { Producto } from "@/types/producto";

interface BotonComparadorProps {
  idProducto: number;
  nombreProducto: string;
}

export default function BotonComparador({
  idProducto,
  nombreProducto,
}: BotonComparadorProps) {
  const [catalogo, setCatalogo] = useState<Producto[] | null>(null);
  const [errorCatalogo, setErrorCatalogo] = useState(false);
  const [intento, setIntento] = useState(0);
  const { ids, hidratado, validado, idCategoria, seleccionDepurada, agregar, quitar } = useComparador(catalogo);
  const [aviso, setAviso] = useState("");
  const idAviso = useId();

  useEffect(() => {
    let activo = true;
    obtenerProductos<Producto>()
      .then((productos) => {
        if (activo) setCatalogo(productos);
      })
      .catch(() => {
        if (activo) setErrorCatalogo(true);
      });
    return () => { activo = false; };
  }, [intento]);

  const yaSeleccionado = ids.includes(idProducto);
  const lleno = ids.length >= MAX_COMPARADOR;
  const producto = catalogo?.find((item) => item.idProducto === idProducto);
  const categoriaIncompatible = idCategoria !== null && producto?.idCategoria !== idCategoria;
  const categoriaValida = producto && Number.isInteger(producto.idCategoria) && producto.idCategoria > 0;
  const categoriaNombre = catalogo?.find((item) => item.idProducto === ids[0])?.nombreCategoria;
  const mensajeCategoria = `Solo puedes comparar productos de ${categoriaNombre || "la categoría del primer producto"}. Vacía el comparador para cambiar de categoría.`;

  function alternar() {
    if (yaSeleccionado) {
      quitar(idProducto);
      setAviso(`${nombreProducto} se quitó del comparador.`);
      return;
    }

    const resultado = agregar(idProducto);

    if (resultado.motivo === "categoria-incompatible") {
      setAviso(mensajeCategoria);
      return;
    }

    if (resultado.motivo === "lleno") {
      setAviso(
        `El comparador admite hasta ${MAX_COMPARADOR} productos. Quita uno para agregar otro.`,
      );
      return;
    }

    if (resultado.motivo === "duplicado") {
      setAviso("Este producto ya está en el comparador.");
      return;
    }

    if (resultado.agregado) {
      setAviso(`${nombreProducto} se agregó al comparador.`);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={alternar}
          disabled={!hidratado || (!yaSeleccionado && (!validado || categoriaIncompatible || !categoriaValida))}
          aria-describedby={idAviso}
          aria-pressed={yaSeleccionado}
          className={`cursor-pointer rounded-md px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
            yaSeleccionado
              ? "border border-[var(--color-brand-blue)] bg-[var(--color-paper)] text-[var(--color-brand-blue)] hover:bg-[var(--color-canvas)]"
              : "bg-[var(--color-brand-solid)] text-[var(--color-on-solid)] hover:bg-[var(--color-brand-solid)]/90"
          }`}
        >
          {!hidratado || (!validado && !errorCatalogo && !yaSeleccionado)
            ? "Cargando comparador…"
            : yaSeleccionado
              ? "Quitar del comparador"
              : lleno
                ? `Comparador lleno (${ids.length}/${MAX_COMPARADOR})`
                : "Agregar al comparador"}
        </button>

        <Link
          href="/comparador"
          className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-hairline)] bg-[var(--color-paper)] px-4 py-2.5 text-sm font-semibold text-[var(--color-ink)] transition-colors hover:border-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue)]"
        >
          Ver comparador
          {ids.length > 0 && (
            <span className="rounded-full bg-[var(--color-canvas)] px-2 py-0.5 text-xs font-semibold text-[var(--color-subtle)]">
              {ids.length}
            </span>
          )}
        </Link>
      </div>

      <p id={idAviso} role="status" aria-live="polite" className="min-h-4 text-xs text-[var(--color-subtle)]">
        {errorCatalogo
          ? "No pudimos validar la categoría del comparador. Tu selección se conserva."
          : validado && !yaSeleccionado && categoriaIncompatible
            ? mensajeCategoria
            : validado && !categoriaValida
              ? "Este producto no tiene una categoría válida en el catálogo para comparar."
              : aviso || (seleccionDepurada
                ? "Se depuró la selección guardada para comparar solo productos de la misma categoría."
                : "")}
      </p>
      {errorCatalogo && (
        <button
          type="button"
          onClick={() => {
            setErrorCatalogo(false);
            setIntento((valor) => valor + 1);
          }}
          className="cursor-pointer text-xs font-semibold text-[var(--color-brand-blue)] underline"
        >
          Reintentar comparador
        </button>
      )}
    </div>
  );
}
