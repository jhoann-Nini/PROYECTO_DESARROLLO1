"use client";

import Link from "next/link";
import { useState } from "react";
import { MAX_COMPARADOR } from "@/data/comparador";
import { useComparador } from "@/hooks/useComparador";

interface BotonComparadorProps {
  idProducto: number;
  nombreProducto: string;
}

export default function BotonComparador({
  idProducto,
  nombreProducto,
}: BotonComparadorProps) {
  const { ids, hidratado, agregar, quitar } = useComparador();
  const [aviso, setAviso] = useState("");

  const yaSeleccionado = ids.includes(idProducto);
  const lleno = ids.length >= MAX_COMPARADOR;

  function alternar() {
    if (yaSeleccionado) {
      quitar(idProducto);
      setAviso(`${nombreProducto} se quitó del comparador.`);
      return;
    }

    const resultado = agregar(idProducto);

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

    setAviso(`${nombreProducto} se agregó al comparador.`);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={alternar}
          disabled={!hidratado}
          aria-pressed={yaSeleccionado}
          className={`cursor-pointer rounded-md px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-wait disabled:opacity-60 ${
            yaSeleccionado
              ? "border border-[var(--color-brand-blue)] bg-[var(--color-paper)] text-[var(--color-brand-blue)] hover:bg-[var(--color-canvas)]"
              : "bg-[var(--color-brand-solid)] text-[var(--color-on-solid)] hover:bg-[var(--color-brand-solid)]/90"
          }`}
        >
          {!hidratado
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

      <p role="status" aria-live="polite" className="min-h-4 text-xs text-[var(--color-subtle)]">
        {aviso}
      </p>
    </div>
  );
}
