"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
import {
  normalizarTexto,
  type ProductoViewModel,
} from "@/data/productoViewModel";
import {
  MAX_COMPARADOR,
  construirFilasComparacion,
  generarRecomendacion,
} from "@/data/comparador";
import { useComparador } from "@/hooks/useComparador";
import { CLASE_FOCO } from "@/components/ui/foco";

export default function ComparadorCliente() {
  const { ids, hidratado, agregar, quitar, limpiar } = useComparador();

  const [productos, setProductos] = useState<ProductoViewModel[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const [busqueda, setBusqueda] = useState("");
  const [soloDiferencias, setSoloDiferencias] = useState(false);
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
      .catch((err) => {
        if (!activo) return;
        setError(
          err instanceof Error
            ? err.message
            : "No fue posible cargar el catálogo para el comparador.",
        );
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [intento]);

  const seleccionados = useMemo(() => {
    const porId = new Map(
      productos.map((producto) => [producto.idProducto, producto]),
    );

    return ids
      .map((id) => porId.get(id))
      .filter((producto): producto is ProductoViewModel => Boolean(producto));
  }, [ids, productos]);

  const filas = useMemo(
    () => construirFilasComparacion(seleccionados),
    [seleccionados],
  );
  const filasVisibles = soloDiferencias
    ? filas.filter((fila) => fila.difiere)
    : filas;
  const recomendacion = useMemo(
    () => generarRecomendacion(seleccionados),
    [seleccionados],
  );

  const resultadosSelector = useMemo(() => {
    const termino = normalizarTexto(busqueda);
    const filtrados = termino
      ? productos.filter((producto) => producto.textoBusqueda.includes(termino))
      : productos;

    return filtrados.slice(0, 8);
  }, [productos, busqueda]);

  function agregarProducto(producto: ProductoViewModel) {
    const resultado = agregar(producto.idProducto);

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
      setAviso(`${producto.nombre} se agregó al comparador.`);
    }
  }

  function quitarProducto(producto: ProductoViewModel) {
    quitar(producto.idProducto);
    setAviso(`${producto.nombre} se quitó del comparador.`);
  }

  function vaciarComparador() {
    limpiar();
    setAviso("Se vació el comparador.");
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
            Cargando catálogo para el comparador…
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
            No pudimos cargar el catálogo
          </p>
          <p className="mt-2 text-sm text-red-800">{error}</p>
          <button
            type="button"
            onClick={() => {
              setCargando(true);
              setError(null);
              setIntento((valor) => valor + 1);
            }}
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
      <header className="mb-8 max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-subtle)]">
          Compara · Analiza · Decide
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--color-ink)] sm:text-3xl">
          Comparador de productos
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-subtle)]">
          Revisa hasta {MAX_COMPARADOR} productos lado a lado. Las diferencias se
          calculan solo con los datos registrados en el catálogo.
        </p>
      </header>

      <section
        aria-labelledby="titulo-selector"
        className="rounded-xl border border-[var(--color-hairline)] bg-[var(--color-paper)] p-5 shadow-[var(--shadow-paper)]"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2
              id="titulo-selector"
              className="text-lg font-semibold tracking-tight text-[var(--color-ink)]"
            >
              Agregar productos
            </h2>
            <p className="mt-1 text-sm text-[var(--color-subtle)]">
              Busca por nombre, marca o categoría y suma productos a la
              comparación.
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-[var(--color-canvas)] px-3 py-1 text-xs font-semibold text-[var(--color-subtle)]">
            {ids.length} de {MAX_COMPARADOR} seleccionados
          </span>
        </div>

        <label
          htmlFor="buscar-comparador"
          className="mt-4 block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-subtle)]"
        >
          Buscar productos para comparar
        </label>
        <input
          id="buscar-comparador"
          type="search"
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
          placeholder="Ej. Galaxy S25, Lenovo, laptops…"
          className={`mt-1.5 w-full rounded-lg border border-[var(--color-hairline)] bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-subtle)] focus:border-[var(--color-brand-blue)] ${CLASE_FOCO}`}
        />

        {ids.length >= MAX_COMPARADOR && (
          <p
            role="status"
            className="mt-3 rounded-md bg-[var(--color-star)]/10 px-3 py-2 text-sm font-medium text-[var(--color-ink)]"
          >
            El comparador admite hasta {MAX_COMPARADOR} productos. Quita uno
            para agregar otro.
          </p>
        )}

        <p
          role="status"
          aria-live="polite"
          className="mt-3 min-h-4 text-xs text-[var(--color-subtle)]"
        >
          {aviso}
        </p>

        {resultadosSelector.length > 0 ? (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {resultadosSelector.map((producto) => {
              const seleccionado = ids.includes(producto.idProducto);
              const lleno = ids.length >= MAX_COMPARADOR && !seleccionado;

              return (
                <li
                  key={producto.idProducto}
                  className="flex flex-col justify-between gap-3 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-3"
                >
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-semibold text-[var(--color-ink)]">
                      {producto.nombre}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-subtle)]">
                      {producto.marca} · {producto.categoriaEtiqueta}
                    </p>
                    <p className="mt-1 text-xs font-medium text-[var(--color-ink)]">
                      {producto.precioCOP > 0
                        ? producto.precioFormateado
                        : "Precio no registrado"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => agregarProducto(producto)}
                    disabled={!hidratado || seleccionado || lleno}
                    aria-label={
                      seleccionado
                        ? `${producto.nombre} ya está en el comparador`
                        : `Agregar ${producto.nombre} al comparador`
                    }
                    className={`cursor-pointer rounded-md border border-[var(--color-brand-blue)] px-3 py-1.5 text-xs font-semibold text-[var(--color-brand-blue)] transition-colors hover:bg-[var(--color-brand-solid)] hover:text-[var(--color-on-solid)] disabled:cursor-not-allowed disabled:border-[var(--color-hairline)] disabled:text-[var(--color-subtle)] disabled:hover:bg-transparent ${CLASE_FOCO}`}
                  >
                    {seleccionado
                      ? "En el comparador"
                      : lleno
                        ? "Límite alcanzado"
                        : "Agregar"}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p
            role="status"
            className="mt-3 rounded-lg border border-dashed border-[var(--color-hairline)] p-4 text-center text-sm text-[var(--color-subtle)]"
          >
            {productos.length === 0
              ? "No hay productos registrados en el catálogo."
              : "No encontramos productos que coincidan con la búsqueda."}
          </p>
        )}
      </section>

      <section aria-labelledby="titulo-comparacion" className="mt-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2
              id="titulo-comparacion"
              className="text-lg font-semibold tracking-tight text-[var(--color-ink)]"
            >
              Comparación
            </h2>
            <p className="mt-1 text-sm text-[var(--color-subtle)]">
              {seleccionados.length === 0
                ? "Tu comparación está vacía."
                : `${seleccionados.length} ${
                    seleccionados.length === 1 ? "producto" : "productos"
                  } en la comparación.`}
            </p>
          </div>

          {seleccionados.length > 0 && (
            <div className="flex flex-wrap items-center gap-4">
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-[var(--color-ink)]">
                <input
                  type="checkbox"
                  checked={soloDiferencias}
                  onChange={(evento) =>
                    setSoloDiferencias(evento.target.checked)
                  }
                  className={`h-4 w-4 rounded border-[var(--color-hairline)] accent-[var(--color-brand-blue)] ${CLASE_FOCO}`}
                />
                Solo diferencias
              </label>
              <button
                type="button"
                onClick={vaciarComparador}
                className={`cursor-pointer rounded-md border border-[var(--color-hairline)] bg-[var(--color-paper)] px-3 py-1.5 text-xs font-semibold text-[var(--color-subtle)] transition-colors hover:border-red-300 hover:text-red-700 ${CLASE_FOCO}`}
              >
                Vaciar comparador
              </button>
            </div>
          )}
        </div>

        {!hidratado ? (
          <p role="status" className="mt-4 text-sm text-[var(--color-subtle)]">
            Cargando tu comparador…
          </p>
        ) : seleccionados.length === 0 ? (
          <div
            role="status"
            className="mt-4 rounded-xl border border-dashed border-[var(--color-hairline)] bg-[var(--color-paper)] p-10 text-center"
          >
            <p className="text-sm font-semibold text-[var(--color-ink)]">
              Aún no has agregado productos al comparador.
            </p>
            <p className="mt-1 text-sm text-[var(--color-subtle)]">
              Usa el selector de arriba para elegir hasta {MAX_COMPARADOR}{" "}
              productos.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--color-hairline)] bg-[var(--color-paper)] shadow-[var(--shadow-paper)]">
              <table
                aria-label="Comparación de productos"
                className="w-full min-w-[640px] border-collapse text-left text-sm"
              >
                <caption className="sr-only">
                  Comparación de {seleccionados.length} productos por precio,
                  disponibilidad, marca, categoría y especificaciones.
                </caption>
                <thead>
                  <tr className="border-b border-[var(--color-hairline)] bg-[var(--color-canvas)]">
                    <th
                      scope="col"
                      className="w-40 p-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-subtle)]"
                    >
                      Característica
                    </th>
                    {seleccionados.map((producto) => (
                      <th
                        key={producto.idProducto}
                        scope="col"
                        className="min-w-44 p-3 align-top"
                      >
                        <Link
                          href={`/productos/${producto.idProducto}`}
                          className={`line-clamp-2 font-semibold text-[var(--color-ink)] transition-colors hover:text-[var(--color-brand-blue)] ${CLASE_FOCO}`}
                        >
                          {producto.nombre}
                        </Link>
                        <p className="mt-1 text-xs font-normal text-[var(--color-subtle)]">
                          {producto.marca}
                        </p>
                        <button
                          type="button"
                          onClick={() => quitarProducto(producto)}
                          aria-label={`Quitar ${producto.nombre} del comparador`}
                          className={`mt-2 cursor-pointer rounded-md border border-[var(--color-hairline)] px-2 py-1 text-[11px] font-semibold text-[var(--color-subtle)] transition-colors hover:border-red-300 hover:text-red-700 ${CLASE_FOCO}`}
                        >
                          Quitar
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filasVisibles.map((fila) => (
                    <tr
                      key={fila.clave}
                      className={`border-b border-[var(--color-hairline)] last:border-b-0 ${
                        fila.difiere ? "bg-[var(--color-star)]/5" : ""
                      }`}
                    >
                      <th
                        scope="row"
                        className="p-3 align-top text-xs font-semibold text-[var(--color-ink)]"
                      >
                        <span className="block">{fila.etiqueta}</span>
                        {fila.difiere && (
                          <span className="mt-1 inline-flex rounded-full bg-[var(--color-star)]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink)]">
                            Distinto
                          </span>
                        )}
                      </th>
                      {seleccionados.map((producto, indice) => {
                        const valor = fila.valores[indice];
                        return (
                          <td
                            key={producto.idProducto}
                            className="p-3 align-top text-[var(--color-ink)]"
                          >
                            {valor ?? (
                              <span className="text-[var(--color-subtle)]">
                                Sin dato
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filasVisibles.length === 0 && (
              <p
                role="status"
                className="mt-3 rounded-lg border border-dashed border-[var(--color-hairline)] p-4 text-center text-sm text-[var(--color-subtle)]"
              >
                No hay diferencias registradas entre estos productos.
              </p>
            )}

            {seleccionados.length >= 2 && (
              <section
                aria-labelledby="titulo-recomendacion"
                className="mt-6 rounded-xl border border-[var(--color-brand-blue)]/25 bg-[var(--color-brand-blue)]/5 p-5"
              >
                <h2
                  id="titulo-recomendacion"
                  className="text-lg font-semibold tracking-tight text-[var(--color-ink)]"
                >
                  Sugerencia del comparador
                </h2>

                <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink)]">
                  {recomendacion.idProducto !== null ? (
                    <>
                      Con los datos disponibles,{" "}
                      <strong>{recomendacion.nombre}</strong> es la opción que
                      mejor se ajusta a los criterios de esta comparación.
                    </>
                  ) : (
                    recomendacion.mensaje
                  )}
                </p>

                {recomendacion.motivos.length > 0 && (
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--color-subtle)]">
                    {recomendacion.motivos.map((motivo) => (
                      <li key={motivo}>{motivo}</li>
                    ))}
                  </ul>
                )}

                <p className="mt-3 text-xs leading-relaxed text-[var(--color-subtle)]">
                  Esta sugerencia es informativa y se basa solo en
                  disponibilidad, precio de referencia y cantidad de
                  especificaciones registradas. No es una calificación
                  editorial ni declara un ganador absoluto.
                </p>
              </section>
            )}
          </>
        )}
      </section>
    </main>
  );
}
