"use client";

import { useEffect, useMemo, useState } from "react";
import { esAdministrador, type UsuarioSesion } from "@/types/producto";
import {
  crearResena,
  editarResena,
  eliminarResena,
  type ResenaResponse,
} from "@/services/api";
import {
  agregarResenaCreada,
  aplicarResenaEditada,
  contieneLenguajeNoPermitido,
  MENSAJE_LENGUAJE_NO_PERMITIDO,
  esResenaPublica,
  MENSAJE_RESENA_EDITADA_EN_REVISION,
  MENSAJE_RESENA_EN_REVISION,
  analizarComentario,
} from "@/data/resenas";
import { CLASE_FOCO } from "@/components/ui/foco";
import AvisoTerminosResena from "@/components/ui/AvisoTerminosResena";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import ReportarResenaModal from "@/app/resenas/ReportarResenaModal";

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

/**
 * Fase 5 (H-16): la autoría se decide solo por el id del usuario. Comparar por
 * nombre visible mostraba «Editar» en reseñas de otra persona con el mismo
 * nombre. Si la sesión no trae id, la reseña no se trata como propia (el
 * backend sigue siendo la autoridad y rechaza ediciones ajenas).
 */
function verificarEsAutor(
  usuario: UsuarioSesion | null,
  resena: ResenaResponse,
): boolean {
  if (!usuario || resena.idUsuario == null) return false;
  if (usuario.idUsuario != null) {
    return Number(usuario.idUsuario) === Number(resena.idUsuario);
  }
  return Boolean(usuario.id) && String(resena.idUsuario) === String(usuario.id);
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
  const [resenasPrevias, setResenasPrevias] = useState<ResenaResponse[]>(resenas);

  if (resenas !== resenasPrevias) {
    setResenasPrevias(resenas);
    setResenasLocales(resenas);
  }
  const [texto, setTexto] = useState("");
  const [puntuacion, setPuntuacion] = useState<number | null>(null);
  const [hoverPuntuacion, setHoverPuntuacion] = useState<number>(0);
  const [filtro, setFiltro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState("");
  const [exito, setExito] = useState("");
  const [resenaAReportar, setResenaAReportar] = useState<number | null>(null);
  const [resenasReportadas, setResenasReportadas] = useState<Set<number>>(
    () => new Set(),
  );

  // Aviso preventivo (TEC-98): informa mientras se escribe, sin borrar texto.
  const riesgoComentario = useMemo(
    () => analizarComentario(texto).riesgo,
    [texto],
  );

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
        MENSAJE_LENGUAJE_NO_PERMITIDO,
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
      setResenasLocales((previas) => agregarResenaCreada(previas, nueva));
      if (esResenaPublica(nueva)) {
        setExito("Tu opinión fue publicada.");
        onResenaCreada(nueva);
      } else {
        setExito(MENSAJE_RESENA_EN_REVISION);
      }
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
        MENSAJE_LENGUAJE_NO_PERMITIDO,
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
      setResenasLocales((previas) => aplicarResenaEditada(previas, actualizada));
      if (esResenaPublica(actualizada)) {
        onResenaEditada?.(actualizada);
        setExito("Tu opinión fue actualizada correctamente.");
      } else {
        // Ya no es pública: el padre debe retirarla igual que una eliminada.
        onResenaEliminada?.(actualizada.idResena);
        setExito(MENSAJE_RESENA_EDITADA_EN_REVISION);
      }
      onActualizarStats?.();
      setIdResenaEnEdicion(null);
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
            className="text-lg font-medium tracking-normal text-ink"
          >
            Opiniones de la comunidad
          </h2>
          <p className="mt-1 text-sm text-subtle">
            Experiencias escritas por usuarios registrados sobre este producto.
          </p>
        </div>
        <p className="text-sm font-medium text-subtle">
          {resenasLocales.length}{" "}
          {resenasLocales.length === 1 ? "opinión" : "opiniones"}
        </p>
      </div>

      <form
        onSubmit={manejarEnvio}
        className="rounded-card border border-line bg-paper p-5 "
      >
        <label
          htmlFor="nueva-opinion"
          className="block text-sm font-medium text-ink"
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
          className="mt-2 min-h-24 w-full resize-y rounded-input border-0 border-b border-ink bg-transparent px-0 py-3 text-sm text-ink placeholder:text-text-muted focus-visible:outline-2 focus-visible:outline-brand-blue"
        />
        <AvisoTerminosResena riesgo={riesgoComentario} className="mt-2" />

        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs font-medium text-subtle">
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
                  className={`cursor-pointer rounded-card p-0.5 text-base leading-none transition-transform hover:scale-110 ${CLASE_FOCO}`}
                >
                  <span
                    aria-hidden="true"
                    className={
                      activa
                        ? "text-star"
                        : "text-subtle dark:text-subtle"
                    }
                  >
                    {activa ? "★" : "☆"}
                  </span>
                </button>
              );
            })}
          </div>
          {puntuacion && (
            <span className="text-xs font-medium text-ink">
              {puntuacion} / 5
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-subtle">
            {usuario
              ? `Publicarás como ${usuario.nombre}.`
              : "Necesitas iniciar sesión para publicar."}
          </span>
          <Button
            type="submit"
            disabled={enviando}
            className="text-sm"
          >
            {enviando ? "Publicando…" : "Publicar opinión"}
          </Button>
        </div>

        {errorEnvio && (
          <p role="alert" className="mt-3 text-sm text-status-error">
            {errorEnvio}
          </p>
        )}
        {exito && (
          <p
            role="status"
            className="mt-3 text-sm font-medium text-positive"
          >
            {exito}
          </p>
        )}
      </form>

      <div>
        <label
          htmlFor="filtrar-opiniones"
          className="mb-1.5 block text-xs font-medium uppercase tracking-normal text-subtle"
        >
          Filtrar opiniones
        </label>
        <Input
          id="filtrar-opiniones"
          type="search"
          value={filtro}
          onChange={(evento) => setFiltro(evento.target.value)}
          placeholder="Buscar por comentario o autor…"
          className="text-sm"
        />
      </div>

      {cargando ? (
        <p role="status" className="text-sm text-subtle">
          Cargando opiniones…
        </p>
      ) : error ? (
        <div
          role="alert"
          className="rounded-card border border-status-error bg-paper p-4"
        >
          <p className="text-sm font-medium text-status-error">
            No pudimos cargar las opiniones
          </p>
          <p className="mt-1 text-sm text-status-error">{error}</p>
          <button
            type="button"
            onClick={onReintentar}
            className="mt-3 cursor-pointer rounded-card border border-status-error bg-paper px-3 py-1.5 text-xs font-medium text-status-error transition-colors hover:bg-paper"
          >
            Reintentar opiniones
          </button>
        </div>
      ) : resenasFiltradas.length === 0 ? (
        <p
          role="status"
          className="rounded-card border border-dashed border-line bg-paper p-6 text-center text-sm text-subtle"
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
                className="rounded-card border border-line bg-paper p-4 "
              >
                {estaEnEdicion ? (
                  <form onSubmit={manejarGuardarEdicion} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-ink">
                        Editando tu opinión
                      </span>
                      <time
                        dateTime={resena.fechaCreacion}
                        className="text-xs text-subtle"
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
                        className="min-h-24 w-full resize-y rounded-input border-0 border-b border-ink bg-transparent px-0 py-3 text-sm text-ink placeholder:text-text-muted focus-visible:outline-2 focus-visible:outline-brand-blue"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-subtle">
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
                              className={`cursor-pointer rounded-card p-0.5 text-base leading-none transition-transform hover:scale-110 ${CLASE_FOCO}`}
                            >
                              <span
                                aria-hidden="true"
                                className={
                                  activa
                                    ? "text-star"
                                    : "text-subtle dark:text-subtle"
                                }
                              >
                                {activa ? "★" : "☆"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      {puntuacionEdicion && (
                        <span className="text-xs font-medium text-ink">
                          {puntuacionEdicion} / 5
                        </span>
                      )}
                    </div>

                    {errorEdicion && (
                      <p role="alert" className="text-xs text-status-error">
                        {errorEdicion}
                      </p>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Button
                        variant="secondary"
                        type="button"
                        onClick={cancelarEdicion}
                        disabled={guardandoEdicion}
                        className="text-xs"
                      >
                        Cancelar
                      </Button>
                      <Button
                        variant="primary"
                        type="submit"
                        disabled={guardandoEdicion}
                        className="text-xs"
                      >
                        {guardandoEdicion ? "Guardando…" : "Guardar"}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-ink">
                          @{resena.nombreUsuario}
                        </p>
                        {resena.puntuacion && (
                          <span
                            className="flex items-center text-xs text-star"
                            aria-label={`${resena.puntuacion} de 5 estrellas`}
                          >
                            {"★".repeat(resena.puntuacion)}
                          </span>
                        )}
                      </div>
                      <time
                        dateTime={resena.fechaCreacion}
                        className="text-xs text-subtle"
                      >
                        {formatearFecha(resena.fechaCreacion)}
                      </time>
                    </div>
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink">
                      {resena.comentario}
                    </p>

                    {(puedeEditar || puedeEliminar) && (
                      <div className="mt-3 flex items-center justify-end gap-2 border-t border-dotted border-line pt-2">
                        {puedeEditar && (
                          <button
                            type="button"
                            onClick={() => iniciarEdicion(resena)}
                            aria-label="Editar reseña"
                            className={`cursor-pointer rounded-card px-2.5 py-1 text-xs font-medium text-subtle transition-colors hover:bg-canvas hover:text-brand-blue ${CLASE_FOCO}`}
                          >
                            Editar
                          </button>
                        )}
                        {puedeEliminar && (
                          <button
                            type="button"
                            onClick={() => abrirEliminacion(resena.idResena)}
                            aria-label="Eliminar reseña"
                            className={`cursor-pointer rounded-card px-2.5 py-1 text-xs font-medium text-subtle transition-colors hover:bg-paper hover:text-status-error dark:hover:bg-paper ${CLASE_FOCO}`}
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    )}

                    {!esAutor && (
                      <div className="mt-2 flex justify-end">
                        {resenasReportadas.has(resena.idResena) ? (
                          <span className="text-[11px] text-subtle">
                            Reporte enviado
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              if (!usuario) {
                                onPedirLogin();
                                return;
                              }
                              setResenaAReportar(resena.idResena);
                            }}
                            aria-label="Reportar reseña"
                            className={`cursor-pointer rounded-card border border-line px-2.5 py-1 text-[11px] font-medium text-subtle transition-colors hover:border-status-error hover:text-status-error ${CLASE_FOCO}`}
                          >
                            Reportar
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
            className="absolute inset-0 bg-inverse/50 backdrop-blur-sm"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Confirmar eliminación de reseña"
            className="relative w-full max-w-md rounded-card border border-line bg-paper p-5 "
          >
            <h3 className="text-base font-medium text-ink">
              ¿Deseas eliminar esta opinión?
            </h3>
            <p className="mt-1 text-sm text-subtle">
              Esta acción no se puede deshacer.
            </p>

            {errorEliminacion && (
              <p role="alert" className="mt-3 text-sm text-status-error">
                {errorEliminacion}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIdResenaAEliminar(null)}
                disabled={eliminando}
                className={`cursor-pointer rounded-card border border-line px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-50 ${CLASE_FOCO}`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => confirmarEliminacion(idResenaAEliminar)}
                disabled={eliminando}
                className={`min-h-11 cursor-pointer rounded-ghost border border-status-error bg-transparent px-5 py-3 text-sm font-medium uppercase text-status-error transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${CLASE_FOCO}`}
              >
                {eliminando ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {resenaAReportar !== null && (
        <ReportarResenaModal
          resenaId={resenaAReportar}
          abierto
          onCerrar={() => setResenaAReportar(null)}
          onReportado={(idResena) =>
            setResenasReportadas((previas) => new Set(previas).add(idResena))
          }
        />
      )}
    </section>
  );
}
