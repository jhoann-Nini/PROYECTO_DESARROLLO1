"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { MAX_COMPARADOR } from "@/data/comparador";
import { useComparador } from "@/hooks/useComparador";
import { obtenerProductos } from "@/services/api";
import type { Producto } from "@/types/producto";
import Button, { buttonClassName } from "@/components/ui/Button";

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
        <Button
          variant={yaSeleccionado ? "secondary" : "primary"}
          type="button"
          onClick={alternar}
          disabled={!hidratado || (!yaSeleccionado && (!validado || categoriaIncompatible || !categoriaValida))}
          aria-describedby={idAviso}
          aria-pressed={yaSeleccionado}
          className="text-sm disabled:opacity-60"
        >
          {!hidratado || (!validado && !errorCatalogo && !yaSeleccionado)
            ? "Cargando comparador…"
            : yaSeleccionado
              ? "Quitar del comparador"
              : lleno
                ? `Comparador lleno (${ids.length}/${MAX_COMPARADOR})`
                : "Agregar al comparador"}
        </Button>

        <Link
          href="/comparador"
          className={buttonClassName("secondary", "text-sm")}
        >
          Ver comparador
          {ids.length > 0 && (
            <span className="rounded-full bg-canvas px-2 py-0.5 text-xs font-medium text-subtle">
              {ids.length}
            </span>
          )}
        </Link>
      </div>

      <p id={idAviso} role="status" aria-live="polite" className="min-h-4 text-xs text-subtle">
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
          className="cursor-pointer text-xs font-medium text-brand-blue underline"
        >
          Reintentar comparador
        </button>
      )}
    </div>
  );
}
