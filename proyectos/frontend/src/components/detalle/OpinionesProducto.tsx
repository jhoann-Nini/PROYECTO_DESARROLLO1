"use client";

import { useEffect, useMemo, useState } from "react";
import { esAdministrador, type UsuarioSesion } from "@/types/producto";
import {
  crearResena,
  editarResena,
  eliminarResena,
  type ResenaResponse,
} from "@/services/api";
import { contieneLenguajeNoPermitido } from "@/data/resenas";
import { CLASE_FOCO } from "@/components/ui/foco";

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
  onResenaEditada?: (resena: ResenaResponse) => void;
  onResenaEliminada?: (idResena: number) => void;
  onActualizarStats?: () => void;
}

function formatearFecha(valor: string): string {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
  }).format(fecha);
}

function verificarEsAutor(
  usuario: UsuarioSesion | null,
  resena: ResenaResponse,
): boolean {
  if (!usuario) return false;
  if (usuario.idUsuario != null && resena.idUsuario != null) {
    return Number(usuario.idUsuario) === Number(resena.idUsuario);
  }
  if (usuario.id && String(resena.idUsuario) === String(usuario.id)) {
    return true;
  }
  if (
    usuario.usuario &&
    resena.nombreUsuario &&
    usuario.usuario.trim().toLowerCase() === resena.nombreUsuario.trim().toLowerCase()
  ) {
    return true;
  }
  if (
    usuario.nombre &&
    resena.nombreUsuario &&
    usuario.nombre.trim().toLowerCase() === resena.nombreUsuario.trim().toLowerCase()
  ) {
    return true;
  }
  return false;
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
  onResenaEditada,
  onResenaEliminada,
  onActualizarStats,
}: OpinionesProductoProps) {
  const [resenasLocales, setResenasLocales] = useState<ResenaResponse[]>(resenas);
  const [texto, setTexto] = useState("");
  const [puntuacion, setPuntuacion] = useState<number | null>(null);
  const [hoverPuntuacion, setHoverPuntuacion] = useState<number>(0);
  const [filtro, setFiltro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState("");
  const [exito, setExito] = useState("");

  // Estado para edición en línea de reseñas propias
  const [idResenaEnEdicion, setIdResenaEnEdicion] = useState<number | null>(null);
  const [textoEdicion, setTextoEdicion] = useState("");
  const [puntuacionEdicion, setPuntuacionEdicion] = useState<number | null>(null);
  const [hoverPuntuacionEdicion, setHoverPuntuacionEdicion] = useState<number>(0);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [errorEdicion, setErrorEdicion] = useState("");

  // Estado para confirmación y eliminación de reseñas
  const [idResenaAEliminar, setIdResenaAEliminar] = useState<number | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminacion, setErrorEliminacion] = useState("");

  useEffect(() => {
    setResenasLocales(resenas);
  }, [resenas]);

  // Manejo de tecla Escape para cerrar el diálogo de confirmación de eliminación
  useEffect(() => {
    if (idResenaAEliminar === null) return;

    function manejarEscape(evento: KeyboardEvent) {
      if (evento.key === "Escape" && !eliminando) {
        setIdResenaAEliminar(null);
      }
    }

    window.addEventListener("keydown", manejarEscape);
    return () => window.removeEventListener("keydown", manejarEscape);
  }, [idResenaAEliminar, eliminando]);

  const resenasFiltradas = useMemo(() => {
    const termino = filtro.trim().toLowerCase();
    if (!termino) return resenasLocales;

    return resenasLocales.filter(
      (resena) =>
        resena.comentario.toLowerCase().includes(termino) ||
        resena.nombreUsuario.toLowerCase().includes(termino),
    );
  }, [resenasLocales, filtro]);

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
        ...(puntuacion !== null ? { puntuacion } : {}),
      });
      setTexto("");
      setPuntuacion(null);
      setHoverPuntuacion(0);
      setExito("Tu opinión fue publicada.");
      setResenasLocales((previas) => [
        nueva,
        ...previas.filter((r) => r.idResena !== nueva.idResena),
      ]);
      onResenaCreada(nueva);
      onActualizarStats?.();
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

  function iniciarEdicion(resena: ResenaResponse) {
    setIdResenaEnEdicion(resena.idResena);
    setTextoEdicion(resena.comentario);
    setPuntuacionEdicion(resena.puntuacion ?? null);
    setHoverPuntuacionEdicion(0);
    setErrorEdicion("");
    setErrorEnvio("");
    setExito("");
  }

  function cancelarEdicion() {
    if (guardandoEdicion) return;
    setIdResenaEnEdicion(null);
    setTextoEdicion("");
    setPuntuacionEdicion(null);
    setHoverPuntuacionEdicion(0);
    setErrorEdicion("");
  }

  async function manejarGuardarEdicion(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (idResenaEnEdicion === null) return;

    const comentarioLimpio = textoEdicion.trim();
    if (!comentarioLimpio) {
      setErrorEdicion("Por favor escribe tu opinión antes de guardar.");
      return;
    }

    if (contieneLenguajeNoPermitido(comentarioLimpio)) {
      setErrorEdicion(
        "El comentario contiene palabras no permitidas. Por favor mantén un lenguaje respetuoso.",
      );
      return;
    }

    if (comentarioLimpio.length > 1000) {
      setErrorEdicion("El comentario no puede superar los 1000 caracteres.");
      return;
    }

    setGuardandoEdicion(true);
    setErrorEdicion("");

    try {
      const actualizada = await editarResena(
        idResenaEnEdicion,
        comentarioLimpio,
        puntuacionEdicion,
      );
      setResenasLocales((previas) =>
        previas.map((r) =>
          r.idResena === actualizada.idResena ? actualizada : r,
        ),
      );
      onResenaEditada?.(actualizada);
      onActualizarStats?.();
      setIdResenaEnEdicion(null);
      setExito("Tu opinión fue actualizada correctamente.");
    } catch (err) {
      setErrorEdicion(
        err instanceof Error
          ? err.message
          : "No fue posible actualizar tu opinión. Inténtalo de nuevo más tarde.",
      );
    } finally {
      setGuardandoEdicion(false);
    }
  }

  function abrirEliminacion(idResena: number) {
    setIdResenaAEliminar(idResena);
    setErrorEliminacion("");
    setErrorEnvio("");
    setExito("");
  }

  async function confirmarEliminacion(idResena: number) {
    setEliminando(true);
    setErrorEliminacion("");

    try {
      await eliminarResena(idResena);
      setResenasLocales((previas) =>
        previas.filter((r) => r.idResena !== idResena),
      );
      onResenaEliminada?.(idResena);
      onActualizarStats?.();
      setIdResenaAEliminar(null);
      setExito("La opinión fue eliminada correctamente.");
    } catch (err) {
      setErrorEliminacion(
        err instanceof Error
          ? err.message
          : "No fue posible eliminar la opinión. Inténtalo de nuevo más tarde.",
      );
    } finally {
      setEliminando(false);
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
          {resenasLocales.length}{" "}
          {resenasLocales.length === 1 ? "opinión" : "opiniones"}
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

        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs font-medium text-[var(--color-subtle)]">
            Calificación:
          </span>
          <div
            role="group"
            aria-label="Calificación con estrellas"
            className="flex items-center gap-1"
          >
            {[1, 2, 3, 4, 5].map((estrella) => {
              const activa = (hoverPuntuacion || puntuacion || 0) >= estrella;
              return (
                <button
                  key={estrella}
                  type="button"
                  onClick={() => setPuntuacion(estrella)}
                  onMouseEnter={() => setHoverPuntuacion(estrella)}
                  onMouseLeave={() => setHoverPuntuacion(0)}
                  aria-label={`Calificar con ${estrella} ${estrella === 1 ? "estrella" : "estrellas"}`}
                  aria-pressed={puntuacion === estrella}
                  className={`cursor-pointer rounded p-0.5 text-base leading-none transition-transform hover:scale-110 ${CLASE_FOCO}`}
                >
                  <span
                    aria-hidden="true"
                    className={
                      activa
                        ? "text-[var(--color-star)]"
                        : "text-neutral-400 dark:text-neutral-500"
                    }
                  >
                    {activa ? "★" : "☆"}
                  </span>
                </button>
              );
            })}
          </div>
          {puntuacion && (
            <span className="text-xs font-semibold text-[var(--color-ink)]">
              {puntuacion} / 5
            </span>
          )}
        </div>

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
          <p
            role="status"
            className="mt-3 text-sm font-medium text-[var(--color-positive)]"
          >
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
          {resenasLocales.length === 0
            ? "Aún no hay opiniones para este producto."
            : "Ninguna opinión coincide con el filtro."}
        </p>
      ) : (
        <ul className="space-y-3" aria-label="Listado de opiniones del producto">
          {resenasFiltradas.map((resena) => {
            const esAutor = verificarEsAutor(usuario, resena);
            const esAdmin = esAdministrador(usuario);
            const puedeEditar = esAutor;
            const puedeEliminar = esAutor || esAdmin;
            const estaEnEdicion = idResenaEnEdicion === resena.idResena;

            return (
              <li
                key={resena.idResena}
                className="rounded-lg border border-[var(--color-hairline)] bg-[var(--color-paper)] p-4 shadow-[var(--shadow-paper)]"
              >
                {estaEnEdicion ? (
                  <form onSubmit={manejarGuardarEdicion} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[var(--color-ink)]">
                        Editando tu opinión
                      </span>
                      <time
                        dateTime={resena.fechaCreacion}
                        className="text-xs text-[var(--color-subtle)]"
                      >
                        {formatearFecha(resena.fechaCreacion)}
                      </time>
                    </div>

                    <div>
                      <label
                        htmlFor={`editar-comentario-${resena.idResena}`}
                        className="sr-only"
                      >
                        Editar comentario
                      </label>
                      <textarea
                        id={`editar-comentario-${resena.idResena}`}
                        value={textoEdicion}
                        onChange={(e) => setTextoEdicion(e.target.value)}
                        rows={4}
                        maxLength={1000}
                        placeholder="Cuenta tu experiencia con el producto…"
                        className="w-full resize-y rounded-lg border border-[var(--color-hairline)] bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-subtle)] focus:border-[var(--color-brand-blue)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-blue)]"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-[var(--color-subtle)]">
                        Calificación:
                      </span>
                      <div
                        role="group"
                        aria-label="Calificación con estrellas"
                        className="flex items-center gap-1"
                      >
                        {[1, 2, 3, 4, 5].map((estrella) => {
                          const activa =
                            (hoverPuntuacionEdicion || puntuacionEdicion || 0) >=
                            estrella;
                          return (
                            <button
                              key={estrella}
                              type="button"
                              onClick={() => setPuntuacionEdicion(estrella)}
                              onMouseEnter={() =>
                                setHoverPuntuacionEdicion(estrella)
                              }
                              onMouseLeave={() => setHoverPuntuacionEdicion(0)}
                              aria-label={`Calificar con ${estrella} ${estrella === 1 ? "estrella" : "estrellas"}`}
                              aria-pressed={puntuacionEdicion === estrella}
                              className={`cursor-pointer rounded p-0.5 text-base leading-none transition-transform hover:scale-110 ${CLASE_FOCO}`}
                            >
                              <span
                                aria-hidden="true"
                                className={
                                  activa
                                    ? "text-[var(--color-star)]"
                                    : "text-neutral-400 dark:text-neutral-500"
                                }
                              >
                                {activa ? "★" : "☆"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      {puntuacionEdicion && (
                        <span className="text-xs font-semibold text-[var(--color-ink)]">
                          {puntuacionEdicion} / 5
                        </span>
                      )}
                    </div>

                    {errorEdicion && (
                      <p role="alert" className="text-xs text-red-700">
                        {errorEdicion}
                      </p>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={cancelarEdicion}
                        disabled={guardandoEdicion}
                        className={`cursor-pointer rounded-md border border-[var(--color-hairline)] px-3 py-1.5 text-xs font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-canvas)] disabled:cursor-not-allowed disabled:opacity-50 ${CLASE_FOCO}`}
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={guardandoEdicion}
                        className={`cursor-pointer rounded-md bg-[var(--color-brand-solid)] px-3 py-1.5 text-xs font-semibold text-[var(--color-on-solid)] transition-colors hover:bg-[var(--color-brand-solid)]/90 disabled:cursor-not-allowed disabled:opacity-50 ${CLASE_FOCO}`}
                      >
                        {guardandoEdicion ? "Guardando…" : "Guardar"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-[var(--color-ink)]">
                          @{resena.nombreUsuario}
                        </p>
                        {resena.puntuacion && (
                          <span
                            className="flex items-center text-xs text-[var(--color-star)]"
                            aria-label={`${resena.puntuacion} de 5 estrellas`}
                          >
                            {"★".repeat(resena.puntuacion)}
                          </span>
                        )}
                      </div>
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

                    {(puedeEditar || puedeEliminar) && (
                      <div className="mt-3 flex items-center justify-end gap-2 border-t border-[var(--color-hairline)] pt-2">
                        {puedeEditar && (
                          <button
                            type="button"
                            onClick={() => iniciarEdicion(resena)}
                            aria-label="Editar reseña"
                            className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium text-[var(--color-subtle)] transition-colors hover:bg-[var(--color-canvas)] hover:text-[var(--color-brand-blue)] ${CLASE_FOCO}`}
                          >
                            Editar
                          </button>
                        )}
                        {puedeEliminar && (
                          <button
                            type="button"
                            onClick={() => abrirEliminacion(resena.idResena)}
                            aria-label="Eliminar reseña"
                            className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium text-[var(--color-subtle)] transition-colors hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30 ${CLASE_FOCO}`}
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Diálogo accesible de confirmación para eliminar opinión */}
      {idResenaAEliminar !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            aria-hidden="true"
            onClick={() => {
              if (!eliminando) setIdResenaAEliminar(null);
            }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Confirmar eliminación de reseña"
            className="relative w-full max-w-md rounded-xl border border-[var(--color-hairline)] bg-[var(--color-paper)] p-5 shadow-[var(--shadow-paper)]"
          >
            <h3 className="text-base font-semibold text-[var(--color-ink)]">
              ¿Deseas eliminar esta opinión?
            </h3>
            <p className="mt-1 text-sm text-[var(--color-subtle)]">
              Esta acción no se puede deshacer.
            </p>

            {errorEliminacion && (
              <p role="alert" className="mt-3 text-sm text-red-700">
                {errorEliminacion}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIdResenaAEliminar(null)}
                disabled={eliminando}
                className={`cursor-pointer rounded-md border border-[var(--color-hairline)] px-3 py-1.5 text-sm font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-canvas)] disabled:cursor-not-allowed disabled:opacity-50 ${CLASE_FOCO}`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => confirmarEliminacion(idResenaAEliminar)}
                disabled={eliminando}
                className={`cursor-pointer rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 ${CLASE_FOCO}`}
              >
                {eliminando ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
