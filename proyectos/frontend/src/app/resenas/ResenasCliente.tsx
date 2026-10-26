"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  crearResena,
  obtenerMejorValorados,
  obtenerProductos,
  obtenerResenas,
  type ResenaResponse,
} from "@/services/api";
import type {
  Producto,
  ProductoMejorValorado,
} from "@/types/producto";
import { normalizarTexto } from "@/data/productoViewModel";
import { contieneLenguajeNoPermitido } from "@/data/resenas";
import { useSesionTecReview } from "@/hooks/useSesionTecReview";
import AuthModal from "@/components/AuthModal";
import RatingStars from "@/components/catalogo/RatingStars";

type OrdenResenas = "recientes" | "antiguas";

function formatearFecha(valor: string): string {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
  }).format(fecha);
}

function inicialDe(nombre: string): string {
  return nombre.trim().charAt(0).toUpperCase() || "U";
}

export default function ResenasCliente() {
  const {
    usuario,
    cargando: cargandoSesion,
    establecerUsuario,
  } = useSesionTecReview();

  const [resenas, setResenas] = useState<ResenaResponse[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [mejorValorados, setMejorValorados] = useState<
    ProductoMejorValorado[]
  >([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  const [busqueda, setBusqueda] = useState("");
  const [filtroProducto, setFiltroProducto] = useState<number | "todas">(
    "todas",
  );
  const [orden, setOrden] = useState<OrdenResenas>("recientes");

  const [modalAuthAbierto, setModalAuthAbierto] = useState(false);
  const [comentario, setComentario] = useState("");
  const [idProductoComentario, setIdProductoComentario] = useState<number | "">(
    "",
  );
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState("");
  const [exito, setExito] = useState("");

  useEffect(() => {
    let activo = true;

    Promise.allSettled([
      obtenerResenas(),
      obtenerProductos<Producto>(),
      obtenerMejorValorados(5),
    ])
      .then(([resultadoResenas, resultadoProductos, resultadoRanking]) => {
        if (!activo) return;

        if (resultadoResenas.status === "fulfilled") {
          setResenas(resultadoResenas.value);
          setError(null);
        } else {
          setError(
            resultadoResenas.reason instanceof Error
              ? resultadoResenas.reason.message
              : "No fue posible cargar las reseñas de la comunidad.",
          );
        }

        if (resultadoProductos.status === "fulfilled") {
          setProductos(resultadoProductos.value);
        }

        if (resultadoRanking.status === "fulfilled") {
          setMejorValorados(resultadoRanking.value);
        }
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [intento]);

  const productosConResenas = useMemo(() => {
    const ids = new Set(resenas.map((resena) => resena.idProducto));
    return productos.filter((producto) => ids.has(producto.idProducto));
  }, [productos, resenas]);

  const resenasFiltradas = useMemo(() => {
    const termino = normalizarTexto(busqueda);

    const filtradas = resenas.filter((resena) => {
      if (
        filtroProducto !== "todas" &&
        resena.idProducto !== filtroProducto
      ) {
        return false;
      }

      if (!termino) return true;

      return (
        normalizarTexto(resena.comentario).includes(termino) ||
        normalizarTexto(resena.nombreUsuario ?? "").includes(termino) ||
        normalizarTexto(resena.nombreProducto ?? "").includes(termino)
      );
    });

    return [...filtradas].sort((a, b) => {
      const fechaA = new Date(a.fechaCreacion).getTime();
      const fechaB = new Date(b.fechaCreacion).getTime();
      const valorA = Number.isNaN(fechaA) ? 0 : fechaA;
      const valorB = Number.isNaN(fechaB) ? 0 : fechaB;
      return orden === "recientes" ? valorB - valorA : valorA - valorB;
    });
  }, [resenas, busqueda, filtroProducto, orden]);

  const totalProductos = useMemo(
    () => new Set(resenas.map((resena) => resena.idProducto)).size,
    [resenas],
  );
  const totalAutores = useMemo(
    () => new Set(resenas.map((resena) => resena.idUsuario)).size,
    [resenas],
  );

  function reintentar() {
    setCargando(true);
    setError(null);
    setIntento((valor) => valor + 1);
  }

  async function manejarEnvio(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErrorEnvio("");
    setExito("");

    if (!usuario) {
      setErrorEnvio("Debes iniciar sesión para publicar una reseña.");
      setModalAuthAbierto(true);
      return;
    }

    if (idProductoComentario === "") {
      setErrorEnvio("Selecciona el producto sobre el que quieres opinar.");
      return;
    }

    if (!comentario.trim()) {
      setErrorEnvio("Escribe tu opinión antes de publicar.");
      return;
    }

    if (contieneLenguajeNoPermitido(comentario)) {
      setErrorEnvio(
        "El comentario contiene palabras no permitidas. Mantén un lenguaje respetuoso.",
      );
      return;
    }

    setEnviando(true);

    try {
      const nueva = await crearResena({
        idProducto: Number(idProductoComentario),
        comentario: comentario.trim(),
      });

      setResenas((previas) => [
        nueva,
        ...previas.filter((resena) => resena.idResena !== nueva.idResena),
      ]);
      setComentario("");
      setExito("Tu reseña fue publicada.");
      setFiltroProducto("todas");
      setOrden("recientes");
    } catch (err) {
      setErrorEnvio(
        err instanceof Error
          ? err.message
          : "No fue posible guardar tu reseña. Inténtalo de nuevo más tarde.",
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-subtle)]">
          Experiencias reales
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--color-ink)] sm:text-3xl">
          Reseñas de la comunidad
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-subtle)]">
          Opiniones escritas por usuarios registrados. Las estrellas provienen
          de las valoraciones y se muestran por separado: una reseña no crea una
          valoración automáticamente.
        </p>
      </header>

      <dl className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          ["Reseñas publicadas", resenas.length],
          ["Productos reseñados", totalProductos],
          ["Autores", totalAutores],
        ].map(([etiqueta, valor]) => (
          <div
            key={String(etiqueta)}
            className="rounded-lg border border-[var(--color-hairline)] bg-[var(--color-paper)] p-4 shadow-[var(--shadow-paper)]"
          >
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-subtle)]">
              {etiqueta}
            </dt>
            <dd className="mt-1 text-2xl font-bold tracking-tight text-[var(--color-ink)]">
              {cargando ? "—" : valor}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="space-y-6">
          <section
            aria-labelledby="titulo-publicar-resena"
            className="rounded-xl border border-[var(--color-hairline)] bg-[var(--color-paper)] p-5 shadow-[var(--shadow-paper)]"
          >
            <h2
              id="titulo-publicar-resena"
              className="text-lg font-semibold tracking-tight text-[var(--color-ink)]"
            >
              Comparte tu experiencia
            </h2>
            <p className="mt-1 text-sm text-[var(--color-subtle)]">
              {usuario
                ? `Publicarás como ${usuario.nombre}.`
                : "Inicia sesión para publicar una reseña."}
            </p>

            <form onSubmit={manejarEnvio} className="mt-4 space-y-3">
              <div>
                <label
                  htmlFor="producto-resena"
                  className="block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-subtle)]"
                >
                  Producto de la reseña
                </label>
                <select
                  id="producto-resena"
                  value={idProductoComentario}
                  onChange={(evento) =>
                    setIdProductoComentario(
                      evento.target.value === ""
                        ? ""
                        : Number(evento.target.value),
                    )
                  }
                  className="mt-1 w-full rounded-md border border-[var(--color-hairline)] bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink)] focus:border-[var(--color-brand-blue)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-blue)]"
                >
                  <option value="">Selecciona un producto</option>
                  {productos.map((producto) => (
                    <option
                      key={producto.idProducto}
                      value={producto.idProducto}
                    >
                      {producto.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="comentario-resena"
                  className="block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-subtle)]"
                >
                  Tu reseña
                </label>
                <textarea
                  id="comentario-resena"
                  rows={3}
                  value={comentario}
                  onChange={(evento) => setComentario(evento.target.value)}
                  placeholder={
                    usuario
                      ? "¿Qué te pareció el producto? Comparte detalles útiles…"
                      : "Inicia sesión para escribir tu reseña…"
                  }
                  className="mt-1 w-full resize-y rounded-md border border-[var(--color-hairline)] bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-subtle)] focus:border-[var(--color-brand-blue)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-blue)]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={enviando || cargandoSesion}
                  className="cursor-pointer rounded-md bg-[var(--color-brand-solid)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-solid)]/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {enviando ? "Publicando…" : "Publicar reseña"}
                </button>

                {!usuario && !cargandoSesion && (
                  <button
                    type="button"
                    onClick={() => setModalAuthAbierto(true)}
                    className="cursor-pointer rounded-md border border-[var(--color-hairline)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition-colors hover:border-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue)]"
                  >
                    Iniciar sesión
                  </button>
                )}
              </div>

              {errorEnvio && (
                <p role="alert" className="text-sm text-red-700">
                  {errorEnvio}
                </p>
              )}
              {exito && (
                <p role="status" className="text-sm text-[var(--color-positive)]">
                  {exito}
                </p>
              )}
            </form>
          </section>

          <section aria-labelledby="titulo-listado-resenas">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2
                  id="titulo-listado-resenas"
                  className="text-lg font-semibold tracking-tight text-[var(--color-ink)]"
                >
                  Todas las reseñas
                </h2>
                <p className="mt-1 text-sm text-[var(--color-subtle)]">
                  {cargando
                    ? "Cargando reseñas…"
                    : `${resenasFiltradas.length} de ${resenas.length} reseñas.`}
                </p>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label
                    htmlFor="filtro-producto-resenas"
                    className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-subtle)]"
                  >
                    Filtrar por producto
                  </label>
                  <select
                    id="filtro-producto-resenas"
                    value={filtroProducto}
                    onChange={(evento) =>
                      setFiltroProducto(
                        evento.target.value === "todas"
                          ? "todas"
                          : Number(evento.target.value),
                      )
                    }
                    className="mt-1 rounded-md border border-[var(--color-hairline)] bg-[var(--color-paper)] px-3 py-1.5 text-xs text-[var(--color-ink)] focus:border-[var(--color-brand-blue)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-blue)]"
                  >
                    <option value="todas">Todos los productos</option>
                    {productosConResenas.map((producto) => (
                      <option
                        key={producto.idProducto}
                        value={producto.idProducto}
                      >
                        {producto.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="orden-resenas"
                    className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-subtle)]"
                  >
                    Orden
                  </label>
                  <select
                    id="orden-resenas"
                    value={orden}
                    onChange={(evento) =>
                      setOrden(evento.target.value as OrdenResenas)
                    }
                    className="mt-1 rounded-md border border-[var(--color-hairline)] bg-[var(--color-paper)] px-3 py-1.5 text-xs text-[var(--color-ink)] focus:border-[var(--color-brand-blue)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-blue)]"
                  >
                    <option value="recientes">Más recientes</option>
                    <option value="antiguas">Más antiguas</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-3">
              <label htmlFor="buscar-resenas" className="sr-only">
                Buscar reseñas por comentario, autor o producto
              </label>
              <input
                id="buscar-resenas"
                type="search"
                value={busqueda}
                onChange={(evento) => setBusqueda(evento.target.value)}
                placeholder="Buscar por comentario, autor o producto…"
                className="w-full rounded-md border border-[var(--color-hairline)] bg-[var(--color-paper)] px-4 py-2.5 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-subtle)] focus:border-[var(--color-brand-blue)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-blue)]"
              />
            </div>

            {cargando ? (
              <div
                role="status"
                aria-busy="true"
                className="mt-4 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-paper)] p-8 text-center text-sm text-[var(--color-subtle)]"
              >
                Cargando reseñas de la comunidad…
              </div>
            ) : error ? (
              <div
                role="alert"
                className="mt-4 rounded-lg border border-red-200 bg-red-50 p-6 text-center"
              >
                <p className="text-sm font-semibold text-red-900">
                  No pudimos cargar las reseñas
                </p>
                <p className="mt-1 text-sm text-red-800">{error}</p>
                <button
                  type="button"
                  onClick={reintentar}
                  className="mt-3 cursor-pointer rounded-md bg-[var(--color-brand-solid)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-solid)]/90"
                >
                  Reintentar
                </button>
              </div>
            ) : resenasFiltradas.length === 0 ? (
              <div
                role="status"
                className="mt-4 rounded-lg border border-dashed border-[var(--color-hairline)] bg-[var(--color-paper)] p-8 text-center"
              >
                <p className="text-sm font-semibold text-[var(--color-ink)]">
                  {resenas.length === 0
                    ? "Aún no hay reseñas registradas."
                    : "No encontramos reseñas con esos filtros."}
                </p>
                <p className="mt-1 text-sm text-[var(--color-subtle)]">
                  {resenas.length === 0
                    ? "Sé el primero en compartir tu experiencia con un producto."
                    : "Prueba con otra búsqueda o cambia el producto seleccionado."}
                </p>
              </div>
            ) : (
              <ul
                aria-label="Listado de reseñas"
                className="mt-4 space-y-3"
              >
                {resenasFiltradas.map((resena) => (
                  <li
                    key={resena.idResena}
                    className="rounded-lg border border-[var(--color-hairline)] bg-[var(--color-paper)] p-4 shadow-[var(--shadow-paper)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          aria-hidden="true"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-blue)]/10 text-sm font-bold text-[var(--color-brand-blue)]"
                        >
                          {inicialDe(resena.nombreUsuario ?? "")}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
                            {resena.nombreUsuario || "Usuario"}
                          </p>
                          <p className="text-xs text-[var(--color-subtle)]">
                            {formatearFecha(resena.fechaCreacion)}
                          </p>
                        </div>
                      </div>

                      {resena.idProducto > 0 && (
                        <Link
                          href={`/productos/${resena.idProducto}`}
                          className="max-w-full truncate rounded-md bg-[var(--color-canvas)] px-2.5 py-1 text-xs font-medium text-[var(--color-brand-blue)] transition-colors hover:bg-[var(--color-brand-blue)]/10"
                        >
                          {resena.nombreProducto || `Producto #${resena.idProducto}`}
                        </Link>
                      )}
                    </div>

                    <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-[var(--color-ink)]">
                      {resena.comentario}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <section
            aria-labelledby="titulo-mejor-valorados"
            className="rounded-xl border border-[var(--color-hairline)] bg-[var(--color-paper)] p-5 shadow-[var(--shadow-paper)]"
          >
            <h2
              id="titulo-mejor-valorados"
              className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--color-subtle)]"
            >
              Mejor valorados
            </h2>
            <p className="mt-1 text-xs text-[var(--color-subtle)]">
              Promedio real de valoraciones, independiente de las reseñas.
            </p>

            {mejorValorados.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--color-subtle)]">
                Todavía no hay valoraciones registradas.
              </p>
            ) : (
              <ol className="mt-3 space-y-3">
                {mejorValorados.map((producto) => (
                  <li key={producto.idProducto}>
                    <Link
                      href={`/productos/${producto.idProducto}`}
                      className="block rounded-md p-1 transition-colors hover:bg-[var(--color-canvas)]"
                    >
                      <span className="line-clamp-2 text-sm font-semibold text-[var(--color-ink)]">
                        {producto.nombre}
                      </span>
                      <span className="mt-1 block">
                        <RatingStars
                          rating={producto.promedioPuntuacion}
                          cantidadResenas={producto.cantidadValoraciones}
                          etiquetaCantidad="valoraciones"
                        />
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="rounded-xl border border-[var(--color-brand-blue)]/25 bg-[var(--color-brand-blue)]/5 p-5">
            <h2 className="text-sm font-semibold text-[var(--color-ink)]">
              ¿Quieres comparar antes de opinar?
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-[var(--color-subtle)]">
              Agrega hasta cuatro productos y revisa sus diferencias con datos
              del catálogo.
            </p>
            <Link
              href="/comparador"
              className="mt-3 inline-flex rounded-md bg-[var(--color-brand-solid)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-solid)]/90"
            >
              Ir al comparador
            </Link>
          </section>
        </aside>
      </div>

      <AuthModal
        isOpen={modalAuthAbierto}
        onClose={() => setModalAuthAbierto(false)}
        onLoginSuccess={(nuevoUsuario) => {
          establecerUsuario(nuevoUsuario);
          setModalAuthAbierto(false);
          setErrorEnvio("");
          setExito("Sesión iniciada. Ya puedes publicar tu reseña.");
        }}
      />
    </main>
  );
}
