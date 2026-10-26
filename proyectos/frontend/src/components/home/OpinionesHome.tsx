"use client";

import type { FormEvent } from "react";
import type { ResenaResponse } from "@/services/api";
import type { Producto, UsuarioSesion } from "@/types/producto";

export interface OpinionesHomeProps {
  usuario: UsuarioSesion | null;
  resenas: ResenaResponse[];
  resenasFiltradas: ResenaResponse[];
  cargando: boolean;
  filtro: string;
  onCambiarFiltro: (valor: string) => void;
  onActualizar: () => void;
  comentario: string;
  onCambiarComentario: (valor: string) => void;
  idProducto: number | "";
  onCambiarProducto: (id: number) => void;
  productos: Producto[];
  enviando: boolean;
  error: string | null;
  onPublicar: (evento: FormEvent<HTMLFormElement>) => void;
  onPedirLogin: () => void;
}

export default function OpinionesHome({
  usuario,
  resenas,
  resenasFiltradas,
  cargando,
  filtro,
  onCambiarFiltro,
  onActualizar,
  comentario,
  onCambiarComentario,
  idProducto,
  onCambiarProducto,
  productos,
  enviando,
  error,
  onPublicar,
  onPedirLogin,
}: OpinionesHomeProps) {
  return (
    <section
      aria-labelledby="seccion-opiniones"
      className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
    >
      <div className="rounded-lg border border-[var(--color-hairline)] bg-[var(--color-paper)] p-5 shadow-[var(--shadow-paper)] sm:p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2
              id="seccion-opiniones"
              className="flex items-center gap-2 text-xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-2xl"
            >
              <span className="text-[var(--color-brand-blue)]">/</span>{" "}
              Opiniones de la comunidad ({resenas.length}).
            </h2>
            <p className="mt-1 text-sm text-[var(--color-subtle)]">
              Comparte tu experiencia, dudas o recomendaciones sobre
              dispositivos con otros usuarios.
            </p>
          </div>
          <button
            type="button"
            onClick={onActualizar}
            disabled={cargando}
            className="self-start cursor-pointer rounded-md border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-3.5 py-2 text-xs font-semibold text-[var(--color-ink)] transition-colors hover:border-[var(--color-brand-blue)]/40 hover:text-[var(--color-brand-blue)] disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
            title="Actualizar listado de opiniones desde el servidor"
          >
            {cargando ? "Actualizando..." : "Actualizar"}
          </button>
        </div>

        <div className="mb-6">
          <label htmlFor="input-filtro-opiniones" className="sr-only">
            Filtrar opiniones de la comunidad
          </label>
          <input
            id="input-filtro-opiniones"
            type="search"
            value={filtro}
            onChange={(evento) => onCambiarFiltro(evento.target.value)}
            placeholder="Buscar por comentario, autor o producto..."
            className="w-full rounded-md border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-4 py-2.5 text-xs text-[var(--color-ink)] transition-colors placeholder:text-[var(--color-subtle)] focus:border-[var(--color-brand-blue)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-blue)]/30 sm:max-w-md"
          />
        </div>

        {!usuario && (
          <div className="mb-6 flex flex-col items-center justify-between gap-3 rounded-md border border-[var(--color-brand-blue)]/25 bg-[var(--color-brand-blue)]/10 p-4 text-xs sm:flex-row">
            <p className="text-[var(--color-ink)]">
              <span className="font-semibold">
                ¿Tienes experiencia con algún dispositivo?
              </span>{" "}
              Inicia sesión con tu cuenta para publicar una opinión verificada.
            </p>
            <button
              type="button"
              onClick={onPedirLogin}
              className="shrink-0 cursor-pointer rounded-md bg-[var(--color-brand-blue)] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-brand-blue)]/90"
            >
              Identificarse para opinar
            </button>
          </div>
        )}

        <form onSubmit={onPublicar} className="mb-8">
          <label htmlFor="input-comentario" className="sr-only">
            Escribe tu opinión
          </label>
          <div className="flex flex-col gap-3">
            {productos.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-subtle)]">
                <label htmlFor="select-producto-comentario" className="font-medium">
                  Dispositivo a reseñar:
                </label>
                <select
                  id="select-producto-comentario"
                  value={idProducto}
                  onChange={(evento) =>
                    onCambiarProducto(Number(evento.target.value))
                  }
                  className="rounded-md border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-3 py-1.5 text-xs text-[var(--color-ink)] transition-colors focus:border-[var(--color-brand-blue)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-blue)]/30"
                >
                  {productos.map((producto) => (
                    <option key={producto.idProducto} value={producto.idProducto}>
                      Dispositivo: {producto.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="input-comentario"
                type="text"
                value={comentario}
                onChange={(evento) => onCambiarComentario(evento.target.value)}
                placeholder={
                  usuario
                    ? `Comentar como ${usuario.nombre}...`
                    : "Inicia sesión para publicar tu opinión aquí..."
                }
                className="flex-1 rounded-md border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-4 py-3 text-sm text-[var(--color-ink)] transition-colors placeholder:text-[var(--color-subtle)] focus:border-[var(--color-brand-blue)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-blue)]/30"
              />
              <button
                type="submit"
                disabled={enviando}
                className="cursor-pointer rounded-md bg-[var(--color-brand-blue)] px-6 py-3 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-brand-blue)]/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {enviando ? "Publicando..." : "Publicar opinión"}
              </button>
            </div>
          </div>
          {error && (
            <p className="mt-2 text-xs text-[var(--color-ink)]" role="alert">
              ⚠️ {error}
            </p>
          )}
        </form>

        {cargando && resenas.length === 0 ? (
          <div className="py-8 text-center text-xs text-[var(--color-subtle)]">
            Cargando opiniones de la comunidad...
          </div>
        ) : resenasFiltradas.length > 0 ? (
          <div className="space-y-3">
            {resenasFiltradas.map((resena) => (
              <div
                key={resena.idResena}
                className="rounded-md border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-4 text-xs transition-colors hover:border-[var(--color-brand-blue)]/30"
              >
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-[var(--color-subtle)]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-[var(--color-brand-blue)]">
                      @{resena.nombreUsuario || "Usuario"}
                    </span>
                    {resena.nombreProducto && (
                      <span className="rounded-md border border-[var(--color-hairline)] bg-[var(--color-paper)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-subtle)]">
                        {resena.nombreProducto}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px]">
                    {new Date(resena.fechaCreacion).toLocaleDateString("es-CO")}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-[var(--color-ink)]">
                  {resena.comentario}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-[var(--color-hairline)] bg-[var(--color-canvas)] p-8 text-center text-xs text-[var(--color-subtle)]">
            {filtro.trim()
              ? `No se encontraron opiniones que coincidan con "${filtro}".`
              : "Aún no hay opiniones registradas. ¡Sé el primero en compartir tu experiencia!"}
          </div>
        )}
      </div>
    </section>
  );
}
