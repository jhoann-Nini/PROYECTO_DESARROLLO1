"use client";

import { useMemo, useState } from "react";
import type { UsuarioSesion } from "@/types/producto";
import { crearResena, type ResenaResponse } from "@/services/api";
import { contieneLenguajeNoPermitido } from "@/data/resenas";

interface OpinionesProductoProps {
  idProducto: number;
  nombreProducto: string;
  usuario: UsuarioSesion | null;
  resenas: ResenaResponse[];
  cargando: boolean;
  error: string | null;
  onReintentar: () => void;
  onResenaCreada: (resena: ResenaResponse) => void;
  onPedirLogin: () => void;
}

function formatearFecha(valor: string): string {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
  }).format(fecha);
}

export default function OpinionesProducto({
  idProducto,
  nombreProducto,
  usuario,
  resenas,
  cargando,
  error,
  onReintentar,
  onResenaCreada,
  onPedirLogin,
}: OpinionesProductoProps) {
  const [texto, setTexto] = useState("");
  const [filtro, setFiltro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState("");
  const [exito, setExito] = useState("");

  const resenasFiltradas = useMemo(() => {
    const termino = filtro.trim().toLowerCase();
    if (!termino) return resenas;

    return resenas.filter(
      (resena) =>
        resena.comentario.toLowerCase().includes(termino) ||
        resena.nombreUsuario.toLowerCase().includes(termino),
    );
  }, [resenas, filtro]);

  async function manejarEnvio(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (!usuario) {
      setErrorEnvio("Debes iniciar sesión para publicar una opinión.");
      onPedirLogin();
      return;
    }

    if (!texto.trim()) {
      setErrorEnvio("Por favor escribe tu opinión antes de publicar.");
      return;
    }

    if (contieneLenguajeNoPermitido(texto)) {
      setErrorEnvio(
        "El comentario contiene palabras no permitidas. Por favor mantén un lenguaje respetuoso.",
      );
      return;
    }

    setEnviando(true);
    setErrorEnvio("");
    setExito("");

    try {
      const nueva = await crearResena({
        idProducto,
        comentario: texto.trim(),
      });
      setTexto("");
      setExito("Tu opinión fue publicada.");
      onResenaCreada(nueva);
    } catch (err) {
      setErrorEnvio(
        err instanceof Error
          ? err.message
          : "No fue posible guardar tu opinión. Inténtalo de nuevo más tarde.",
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section aria-labelledby="titulo-opiniones" className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2
            id="titulo-opiniones"
            className="text-lg font-semibold tracking-tight text-[var(--color-ink)]"
          >
            Opiniones de la comunidad
          </h2>
          <p className="mt-1 text-sm text-[var(--color-subtle)]">
            Experiencias escritas por usuarios registrados sobre este producto.
          </p>
        </div>
        <p className="text-sm font-medium text-[var(--color-subtle)]">
          {resenas.length} {resenas.length === 1 ? "opinión" : "opiniones"}
        </p>
      </div>

      <form
        onSubmit={manejarEnvio}
        className="rounded-lg border border-[var(--color-hairline)] bg-[var(--color-paper)] p-5 shadow-[var(--shadow-paper)]"
      >
        <label
          htmlFor="nueva-opinion"
          className="block text-sm font-semibold text-[var(--color-ink)]"
        >
          Escribe tu opinión sobre {nombreProducto}
        </label>
        <textarea
          id="nueva-opinion"
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
          rows={4}
          maxLength={1000}
          placeholder="Cuenta tu experiencia con el producto…"
          className="mt-2 w-full resize-y rounded-lg border border-[var(--color-hairline)] bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-subtle)] focus:border-[var(--color-brand-blue)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-blue)]"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-[var(--color-subtle)]">
            {usuario
              ? `Publicarás como ${usuario.nombre}.`
              : "Necesitas iniciar sesión para publicar."}
          </span>
          <button
            type="submit"
            disabled={enviando}
            className="cursor-pointer rounded-md bg-[var(--color-brand-solid)] px-4 py-2 text-sm font-semibold text-[var(--color-on-solid)] transition-colors hover:bg-[var(--color-brand-solid)]/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {enviando ? "Publicando…" : "Publicar opinión"}
          </button>
        </div>

        {errorEnvio && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {errorEnvio}
          </p>
        )}
        {exito && (
          <p role="status" className="mt-3 text-sm font-medium text-[var(--color-positive)]">
            {exito}
          </p>
        )}
      </form>

      <div>
        <label
          htmlFor="filtrar-opiniones"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-subtle)]"
        >
          Filtrar opiniones
        </label>
        <input
          id="filtrar-opiniones"
          type="search"
          value={filtro}
          onChange={(evento) => setFiltro(evento.target.value)}
          placeholder="Buscar por comentario o autor…"
          className="w-full rounded-lg border border-[var(--color-hairline)] bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-subtle)] focus:border-[var(--color-brand-blue)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-blue)]"
        />
      </div>

      {cargando ? (
        <p role="status" className="text-sm text-[var(--color-subtle)]">
          Cargando opiniones…
        </p>
      ) : error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4"
        >
          <p className="text-sm font-semibold text-red-800">
            No pudimos cargar las opiniones
          </p>
          <p className="mt-1 text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={onReintentar}
            className="mt-3 cursor-pointer rounded-md border border-red-300 bg-[var(--color-paper)] px-3 py-1.5 text-xs font-semibold text-red-800 transition-colors hover:bg-red-100"
          >
            Reintentar opiniones
          </button>
        </div>
      ) : resenasFiltradas.length === 0 ? (
        <p
          role="status"
          className="rounded-lg border border-dashed border-[var(--color-hairline)] bg-[var(--color-paper)] p-6 text-center text-sm text-[var(--color-subtle)]"
        >
          {resenas.length === 0
            ? "Aún no hay opiniones para este producto."
            : "Ninguna opinión coincide con el filtro."}
        </p>
      ) : (
        <ul className="space-y-3">
          {resenasFiltradas.map((resena) => (
            <li
              key={resena.idResena}
              className="rounded-lg border border-[var(--color-hairline)] bg-[var(--color-paper)] p-4 shadow-[var(--shadow-paper)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[var(--color-ink)]">
                  @{resena.nombreUsuario}
                </p>
                <time
                  dateTime={resena.fechaCreacion}
                  className="text-xs text-[var(--color-subtle)]"
                >
                  {formatearFecha(resena.fechaCreacion)}
                </time>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[var(--color-ink)]">
                {resena.comentario}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
