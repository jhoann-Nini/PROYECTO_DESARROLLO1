/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ApiError,
  obtenerCategorias,
  obtenerMarcas,
  obtenerProductoPorId,
  obtenerResenas,
  obtenerValoracionStats,
  type ResenaResponse,
  type ValoracionPublicaStats,
} from "@/services/api";
import type { CategoriaResponse, MarcaResponse, Producto } from "@/types/producto";
import { formatearCOP, normalizarFichaProducto } from "@/data/specsHelper";
import { useSesionTecReview } from "@/hooks/useSesionTecReview";
import AuthModal from "@/components/AuthModal";
import ProductImagePlaceholder from "@/components/ProductImagePlaceholder";
import RatingStars from "@/components/catalogo/RatingStars";
import EspecificacionesProducto from "@/components/detalle/EspecificacionesProducto";
import ValoracionProducto from "@/components/detalle/ValoracionProducto";
import OpinionesProducto from "@/components/detalle/OpinionesProducto";
import BotonComparador from "@/components/detalle/BotonComparador";
import BotonCompartir from "@/components/detalle/BotonCompartir";
import BotonFavorito from "@/components/favoritos/BotonFavorito";

interface DetalleProductoClienteProps {
  idProducto: number;
}

type PestanaDetalle = "especificaciones" | "opiniones";

function enriquecerProducto(
  producto: Producto,
  categorias: CategoriaResponse[],
  marcas: MarcaResponse[],
): Producto {
  return {
    ...producto,
    nombreCategoria:
      producto.nombreCategoria ||
      categorias.find(
        (categoria) => categoria.idCategoria === producto.idCategoria,
      )?.nombre,
    nombreMarca:
      producto.nombreMarca ||
      marcas.find((marca) => marca.idMarca === producto.idMarca)?.nombre,
  };
}

export default function DetalleProductoCliente({
  idProducto,
}: DetalleProductoClienteProps) {
  const {
    usuario,
    cargando: cargandoSesion,
    establecerUsuario,
  } = useSesionTecReview();

  const [producto, setProducto] = useState<Producto | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noEncontrado, setNoEncontrado] = useState(false);
  const [intento, setIntento] = useState(0);

  const [stats, setStats] = useState<ValoracionPublicaStats | null>(null);
  const [resenas, setResenas] = useState<ResenaResponse[]>([]);
  const [cargandoResenas, setCargandoResenas] = useState(true);
  const [errorResenas, setErrorResenas] = useState<string | null>(null);
  const [intentoResenas, setIntentoResenas] = useState(0);

  const [pestana, setPestana] = useState<PestanaDetalle>("especificaciones");
  const [modalAuthAbierto, setModalAuthAbierto] = useState(false);
  const [errorImagen, setErrorImagen] = useState(false);

  useEffect(() => {
    let activo = true;

    Promise.allSettled([
      obtenerProductoPorId(idProducto),
      obtenerCategorias(),
      obtenerMarcas(),
    ])
      .then(([resultadoProducto, resultadoCategorias, resultadoMarcas]) => {
        if (!activo) return;

        if (resultadoProducto.status === "rejected") {
          const motivo = resultadoProducto.reason;
          if (motivo instanceof ApiError && motivo.status === 404) {
            setNoEncontrado(true);
          } else {
            setError(
              motivo instanceof Error
                ? motivo.message
                : "No fue posible cargar el detalle del producto.",
            );
          }
          return;
        }

        const categorias =
          resultadoCategorias.status === "fulfilled"
            ? resultadoCategorias.value
            : [];
        const marcas =
          resultadoMarcas.status === "fulfilled" ? resultadoMarcas.value : [];

        setProducto(
          enriquecerProducto(resultadoProducto.value, categorias, marcas),
        );
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [idProducto, intento]);

  useEffect(() => {
    let activo = true;

    Promise.allSettled([
      obtenerValoracionStats(idProducto),
      obtenerResenas(idProducto),
    ])
      .then(([resultadoStats, resultadoResenas]) => {
        if (!activo) return;

        setStats(
          resultadoStats.status === "fulfilled" ? resultadoStats.value : null,
        );

        if (resultadoResenas.status === "fulfilled") {
          setResenas(resultadoResenas.value);
        } else {
          setResenas([]);
          setErrorResenas(
            resultadoResenas.reason instanceof Error
              ? resultadoResenas.reason.message
              : "No fue posible cargar las opiniones del producto.",
          );
        }
      })
      .finally(() => {
        if (activo) setCargandoResenas(false);
      });

    return () => {
      activo = false;
    };
  }, [idProducto, intentoResenas]);

  const refrescarStats = useCallback(async () => {
    try {
      const actualizadas = await obtenerValoracionStats(idProducto);
      setStats(actualizadas);
    } catch {
      // Mantener las estadísticas previas si la consulta falla.
    }
  }, [idProducto]);

  const reintentarProducto = useCallback(() => {
    setCargando(true);
    setError(null);
    setNoEncontrado(false);
    setProducto(null);
    setErrorImagen(false);
    setIntento((valor) => valor + 1);
  }, []);

  const reintentarResenas = useCallback(() => {
    setCargandoResenas(true);
    setErrorResenas(null);
    setIntentoResenas((valor) => valor + 1);
  }, []);

  const ficha = useMemo(
    () => (producto ? normalizarFichaProducto(producto) : null),
    [producto],
  );

  const precio =
    producto?.precioReferencia && producto.precioReferencia > 0
      ? formatearCOP(producto.precioReferencia)
      : "Consultar disponibilidad";

  const abrirAuth = useCallback(() => setModalAuthAbierto(true), []);

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
            Cargando detalle del producto…
          </p>
        </div>
      </main>
    );
  }

  if (noEncontrado) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-dashed border-[var(--color-hairline)] bg-[var(--color-paper)] p-10 text-center">
          <p className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
            Producto no encontrado
          </p>
          <p className="mt-2 text-sm text-[var(--color-subtle)]">
            El producto solicitado no existe o ya no está disponible en el
            catálogo.
          </p>
          <Link
            href="/productos"
            className="mt-5 inline-flex rounded-md bg-[var(--color-brand-solid)] px-4 py-2 text-sm font-semibold text-[var(--color-on-solid)] transition-colors hover:bg-[var(--color-brand-solid)]/90"
          >
            Volver al catálogo
          </Link>
        </div>
      </main>
    );
  }

  if (error || !producto || !ficha) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-8 text-center"
        >
          <p className="text-lg font-semibold text-red-900">
            No pudimos cargar el producto
          </p>
          <p className="mt-2 text-sm text-red-800">
            {error ?? "El producto no tiene datos para mostrar."}
          </p>
          <button
            type="button"
            onClick={reintentarProducto}
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
      <nav
        aria-label="Migas de pan"
        className="mb-6 flex flex-wrap items-center gap-2 text-xs text-[var(--color-subtle)]"
      >
        <Link href="/" className="transition-colors hover:text-[var(--color-brand-blue)]">
          Inicio
        </Link>
        <span aria-hidden="true">/</span>
        <Link
          href="/productos"
          className="transition-colors hover:text-[var(--color-brand-blue)]"
        >
          Productos
        </Link>
        <span aria-hidden="true">/</span>
        <span className="font-medium text-[var(--color-ink)]">
          {producto.nombre}
        </span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <div className="overflow-hidden rounded-xl border border-[var(--color-hairline)] bg-[var(--color-paper)] p-5 shadow-[var(--shadow-paper)]">
          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-[var(--color-canvas)] p-6">
            {producto.imagen && !errorImagen ? (
              <img
                src={producto.imagen}
                alt={`Fotografía de ${producto.nombre}`}
                onError={() => setErrorImagen(true)}
                className="h-full w-full object-contain"
              />
            ) : (
              <ProductImagePlaceholder
                categoria={producto.nombreCategoria ?? producto.idCategoria}
                marca={ficha.marca}
                nombre={producto.nombre}
                tamano="lg"
                tema="claro"
              />
            )}
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-[var(--color-brand-blue)]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-brand-blue)]">
              {ficha.categoriaEtiqueta}
            </span>
            <span
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${
                producto.estado
                  ? "bg-[var(--color-positive)]/15 text-[var(--color-ink)]"
                  : "bg-[var(--color-hairline)] text-[var(--color-subtle)]"
              }`}
            >
              {producto.estado ? "Disponible" : "No disponible"}
            </span>
          </div>

          <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-[var(--color-ink)] sm:text-4xl">
            {producto.nombre}
          </h1>

          <p className="mt-2 text-sm font-medium text-[var(--color-subtle)]">
            {ficha.marca}
            <span aria-hidden="true"> · </span>
            {ficha.categoriaEtiqueta}
          </p>

          <div className="mt-4">
            <RatingStars
              rating={stats?.promedioPuntuacion ?? null}
              cantidadResenas={stats?.cantidadValoraciones ?? null}
              etiquetaCantidad="opiniones"
              tamano="md"
            />
          </div>

          <p className="mt-5 text-3xl font-bold tracking-tight text-[var(--color-ink)]">
            {precio}
          </p>

          {producto.descripcion && (
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--color-subtle)]">
              {producto.descripcion}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-start gap-3">
            <BotonComparador
              idProducto={producto.idProducto}
              nombreProducto={producto.nombre}
            />
            <BotonFavorito
              idProducto={producto.idProducto}
              nombreProducto={producto.nombre}
            />
            <BotonCompartir titulo={producto.nombre} />
          </div>

          <dl className="mt-6 grid gap-3 border-t border-[var(--color-hairline)] pt-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-subtle)]">
                Categoría
              </dt>
              <dd className="mt-1 font-medium text-[var(--color-ink)]">
                {producto.nombreCategoria ?? ficha.categoriaEtiqueta}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-subtle)]">
                Marca
              </dt>
              <dd className="mt-1 font-medium text-[var(--color-ink)]">
                {ficha.marca}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-10">
        <div
          role="tablist"
          aria-label="Información del producto"
          className="flex flex-wrap gap-2 border-b border-[var(--color-hairline)]"
        >
          <button
            type="button"
            role="tab"
            id="tab-especificaciones"
            aria-selected={pestana === "especificaciones"}
            aria-controls="panel-especificaciones"
            onClick={() => setPestana("especificaciones")}
            className={`cursor-pointer rounded-t-md px-4 py-2.5 text-sm font-semibold transition-colors ${
              pestana === "especificaciones"
                ? "border-b-2 border-[var(--color-brand-blue)] text-[var(--color-brand-blue)]"
                : "text-[var(--color-subtle)] hover:text-[var(--color-ink)]"
            }`}
          >
            Especificaciones
          </button>
          <button
            type="button"
            role="tab"
            id="tab-opiniones"
            aria-selected={pestana === "opiniones"}
            aria-controls="panel-opiniones"
            onClick={() => setPestana("opiniones")}
            className={`cursor-pointer rounded-t-md px-4 py-2.5 text-sm font-semibold transition-colors ${
              pestana === "opiniones"
                ? "border-b-2 border-[var(--color-brand-blue)] text-[var(--color-brand-blue)]"
                : "text-[var(--color-subtle)] hover:text-[var(--color-ink)]"
            }`}
          >
            Opiniones ({resenas.length})
          </button>
        </div>

        <div
          role="tabpanel"
          id="panel-especificaciones"
          aria-labelledby="tab-especificaciones"
          hidden={pestana !== "especificaciones"}
          className="pt-6"
        >
          <EspecificacionesProducto producto={producto} />
        </div>

        <div
          role="tabpanel"
          id="panel-opiniones"
          aria-labelledby="tab-opiniones"
          hidden={pestana !== "opiniones"}
          className="space-y-5 pt-6"
        >
          <ValoracionProducto
            idProducto={producto.idProducto}
            usuario={usuario}
            cargandoSesion={cargandoSesion}
            stats={stats}
            onPedirLogin={abrirAuth}
            onActualizarStats={refrescarStats}
          />

          <OpinionesProducto
            idProducto={producto.idProducto}
            nombreProducto={producto.nombre}
            usuario={usuario}
            resenas={resenas}
            cargando={cargandoResenas}
            error={errorResenas}
            onReintentar={reintentarResenas}
            onResenaCreada={(nueva) =>
              setResenas((previas) => [
                nueva,
                ...previas.filter(
                  (resena) => resena.idResena !== nueva.idResena,
                ),
              ])
            }
            onPedirLogin={abrirAuth}
          />
        </div>
      </div>

      <AuthModal
        isOpen={modalAuthAbierto}
        onClose={() => setModalAuthAbierto(false)}
        onLoginSuccess={(nuevoUsuario) => {
          establecerUsuario(nuevoUsuario);
          setModalAuthAbierto(false);
        }}
      />
    </main>
  );
}
