"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { UsuarioSesion } from "@/types/producto";
import { esAdministrador, puedeModerar } from "@/types/producto";
import type {
  EstadoReporte,
  ResenaReportadaResponse,
} from "@/types/moderacion";
import {
  ApiError,
  obtenerResenasReportadas,
  ocultarResenaReportada,
  publicarResenaReportada,
  rechazarReportesResenaReportada,
} from "@/services/api";
import EstadoVacio from "@/components/ui/EstadoVacio";
import { CLASE_FOCO } from "@/components/ui/foco";

interface PanelModeracionModalProps {
  isOpen: boolean;
  onClose: () => void;
  usuarioSesion: UsuarioSesion | null;
}

type AccionModeracion = "ocultar" | "publicar" | "rechazar-reportes";

const OPCIONES_ESTADO: { valor: EstadoReporte | ""; etiqueta: string }[] = [
  { valor: "", etiqueta: "Todos los estados" },
  { valor: "PENDIENTE", etiqueta: "Pendiente" },
  { valor: "EN_REVISION", etiqueta: "En revisión" },
  { valor: "ACEPTADO", etiqueta: "Aceptado" },
  { valor: "RECHAZADO", etiqueta: "Rechazado" },
];

const ETIQUETAS_MOTIVO: Record<string, string> = {
  spam: "Spam",
  "lenguaje-ofensivo": "Lenguaje ofensivo",
  falso: "Información falsa",
  otro: "Otro",
};

function etiquetaEstado(estado: EstadoReporte): string {
  return (
    OPCIONES_ESTADO.find((opcion) => opcion.valor === estado)?.etiqueta ??
    estado
  );
}

function etiquetaMotivo(motivo: string): string {
  return ETIQUETAS_MOTIVO[motivo.toLowerCase()] ?? motivo;
}

function formatearFecha(valor: string): string {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(fecha);
}

export default function PanelModeracionModal({
  isOpen,
  onClose,
  usuarioSesion,
}: PanelModeracionModalProps) {
  const autorizado = puedeModerar(usuarioSesion);
  const esAdmin = esAdministrador(usuarioSesion);
  const abierto = isOpen && autorizado;

  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const [filtroEstado, setFiltroEstado] = useState<EstadoReporte | "">("");
  const [soloOcultas, setSoloOcultas] = useState(false);
  const [accionEnCurso, setAccionEnCurso] = useState<{
    idResena: number;
    tipo: AccionModeracion;
  } | null>(null);

  const tituloId = useId();
  const cerrarRef = useRef<HTMLButtonElement>(null);
  const claveConsulta = `${filtroEstado}|${soloOcultas}|${intento}`;
  const [resultado, setResultado] = useState<{
    clave: string;
    resenas: ResenaReportadaResponse[];
  } | null>(null);
  const [errorConsulta, setErrorConsulta] = useState<{
    clave: string;
    mensaje: string;
  } | null>(null);

  const cargandoConsulta =
    abierto &&
    resultado?.clave !== claveConsulta &&
    errorConsulta?.clave !== claveConsulta;
  const errorCargaActual =
    errorConsulta?.clave === claveConsulta ? errorConsulta.mensaje : null;
  const resenasActuales =
    resultado?.clave === claveConsulta ? resultado.resenas : [];

  const cerrarPanel = useCallback(() => {
    setResultado(null);
    setErrorConsulta(null);
    setErrorAccion(null);
    setMensajeExito(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!abierto) return;

    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cerrarRef.current?.focus();

    function manejarEscape(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        evento.preventDefault();
        cerrarPanel();
      }
    }

    window.addEventListener("keydown", manejarEscape);

    return () => {
      document.body.style.overflow = overflowPrevio;
      window.removeEventListener("keydown", manejarEscape);
    };
  }, [abierto, cerrarPanel]);

  useEffect(() => {
    if (!abierto) return;

    let activo = true;

    obtenerResenasReportadas({
      estado: filtroEstado || undefined,
      oculta: soloOcultas ? true : undefined,
    })
      .then((datos) => {
        if (!activo) return;
        setResultado({ clave: claveConsulta, resenas: datos });
      })
      .catch((err: unknown) => {
        if (!activo) return;
        setErrorConsulta({
          clave: claveConsulta,
          mensaje:
            err instanceof Error
              ? err.message
              : "No fue posible cargar las reseñas reportadas.",
        });
      });

    return () => {
      activo = false;
    };
  }, [abierto, claveConsulta, filtroEstado, soloOcultas]);

  async function ejecutarAccion(
    resena: ResenaReportadaResponse,
    tipo: AccionModeracion,
  ) {
    if (!esAdmin || accionEnCurso) return;

    setAccionEnCurso({ idResena: resena.idResena, tipo });
    setErrorAccion(null);
    setMensajeExito(null);

    try {
      const actualizada =
        tipo === "ocultar"
          ? await ocultarResenaReportada(resena.idResena)
          : tipo === "publicar"
            ? await publicarResenaReportada(resena.idResena)
            : await rechazarReportesResenaReportada(resena.idResena);

      setResultado((previo) =>
        previo && previo.clave === claveConsulta
          ? {
              clave: previo.clave,
              resenas: previo.resenas.map((item) =>
                item.idResena === actualizada.idResena ? actualizada : item,
              ),
            }
          : previo,
      );
      setMensajeExito(
        tipo === "ocultar"
          ? `Reseña de ${resena.nombreAutor} ocultada.`
          : tipo === "publicar"
            ? `Reseña de ${resena.nombreAutor} publicada de nuevo.`
            : `Reportes de ${resena.nombreAutor} rechazados.`,
      );
    } catch (err) {
      setErrorAccion(
        err instanceof ApiError
          ? err.message
          : "No fue posible completar la acción de moderación.",
      );
    } finally {
      setAccionEnCurso(null);
    }
  }

  if (!abierto) return null;

  const accionActual = (idResena: number, tipo: AccionModeracion) =>
    accionEnCurso?.idResena === idResena && accionEnCurso.tipo === tipo;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={tituloId}
      className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-[var(--color-inverse)]/45 p-4 backdrop-blur-sm"
    >
      <div className="relative flex max-h-[92vh] w-full max-w-4xl animate-scale-in flex-col rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-paper)] p-6 text-[var(--color-ink)] shadow-[var(--shadow-paper-hover)]">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--color-hairline)] pb-4">
          <div>
            <h2
              id={tituloId}
              className="text-lg font-semibold tracking-tight text-[var(--color-ink)]"
            >
              Moderación de reseñas
            </h2>
            <p className="mt-1 text-xs text-[var(--color-subtle)]">
              Sesión: {usuarioSesion?.nombre} ({usuarioSesion?.email}) · Rol:{" "}
              {usuarioSesion?.rol}
            </p>
          </div>
          <button
            ref={cerrarRef}
            type="button"
            onClick={cerrarPanel}
            aria-label="Cerrar panel de moderación"
            className={`cursor-pointer rounded-lg border border-[var(--color-hairline)] px-2.5 py-1.5 text-xs text-[var(--color-subtle)] transition-colors hover:border-[var(--color-brand-blue)] hover:bg-[var(--color-canvas)] hover:text-[var(--color-ink)] ${CLASE_FOCO}`}
          >
            ✕ Cerrar
          </button>
        </div>

        {!esAdmin && (
          <p className="mt-3 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-3 text-xs text-[var(--color-subtle)]">
            Puedes consultar los reportes. Solo un administrador puede ocultar,
            publicar o rechazar reseñas.
          </p>
        )}

        <p
          role="note"
          className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"
        >
          Vista preparada: la API administrativa de moderación todavía no está
          implementada en el backend. La consulta y las acciones fallarán hasta
          que se publique el contrato.
        </p>

        <div
          role="group"
          aria-label="Filtros de moderación"
          className="mt-3 flex flex-wrap items-end gap-4 border-b border-[var(--color-hairline)] pb-3"
        >
          <label className="text-xs font-medium text-[var(--color-subtle)]">
            Estado del reporte
            <select
              value={filtroEstado}
              onChange={(evento) =>
                setFiltroEstado(evento.target.value as EstadoReporte | "")
              }
              className={`mt-1 block cursor-pointer rounded-md border border-[var(--color-hairline)] bg-[var(--color-paper)] px-3 py-1.5 text-sm text-[var(--color-ink)] focus:border-[var(--color-brand-blue)] ${CLASE_FOCO}`}
            >
              {OPCIONES_ESTADO.map((opcion) => (
                <option key={opcion.etiqueta} value={opcion.valor}>
                  {opcion.etiqueta}
                </option>
              ))}
            </select>
          </label>

          <label className="flex cursor-pointer items-center gap-2 pb-1 text-xs text-[var(--color-ink)]">
            <input
              type="checkbox"
              checked={soloOcultas}
              onChange={(evento) => setSoloOcultas(evento.target.checked)}
              className={`h-4 w-4 accent-[var(--color-brand-blue)] ${CLASE_FOCO}`}
            />
            Solo reseñas ocultas
          </label>
        </div>

        {mensajeExito && (
          <p
            role="status"
            className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800"
          >
            {mensajeExito}
          </p>
        )}

        {errorAccion && (
          <div
            role="alert"
            className="mt-3 flex items-start justify-between gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"
          >
            <p>{errorAccion}</p>
            <button
              type="button"
              onClick={() => setErrorAccion(null)}
              aria-label="Cerrar mensaje de error"
              className={`cursor-pointer rounded px-1 text-red-600 hover:text-red-800 ${CLASE_FOCO}`}
            >
              ✕
            </button>
          </div>
        )}

        <div className="mt-4 overflow-y-auto pr-1">
          {cargandoConsulta ? (
            <p
              role="status"
              aria-busy="true"
              className="py-10 text-center text-sm text-[var(--color-subtle)]"
            >
              Cargando reseñas reportadas…
            </p>
          ) : errorCargaActual ? (
            <EstadoVacio
              tipo="error"
              titulo="No pudimos cargar la cola de moderación"
              descripcion={errorCargaActual}
              accion={{
                etiqueta: "Reintentar",
                onClick: () => setIntento((valor) => valor + 1),
              }}
            />
          ) : resenasActuales.length === 0 ? (
            <EstadoVacio
              titulo="No hay reseñas reportadas"
              descripcion="No hay reportes que coincidan con los filtros seleccionados."
            />
          ) : (
            <ul className="space-y-4" aria-label="Reseñas reportadas">
              {resenasActuales.map((resena) => (
                <li
                  key={resena.idResena}
                  className="rounded-xl border border-[var(--color-hairline)] bg-[var(--color-paper)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--color-ink)]">
                        <Link
                          href={`/productos/${resena.idProducto}`}
                          className={`text-[var(--color-brand-blue)] hover:underline ${CLASE_FOCO}`}
                        >
                          {resena.nombreProducto}
                        </Link>
                      </h3>
                      <p className="mt-1 text-xs text-[var(--color-subtle)]">
                        Por {resena.nombreAutor} ·{" "}
                        {formatearFecha(resena.fechaCreacion)}
                        {typeof resena.puntuacion === "number" &&
                          ` · ${resena.puntuacion}/5`}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        resena.ocultaPorReportes
                          ? "bg-red-100 text-red-800"
                          : "bg-[var(--color-positive)]/15 text-[var(--color-ink)]"
                      }`}
                    >
                      {resena.ocultaPorReportes
                        ? "Oculta por reportes"
                        : "Visible"}
                    </span>
                  </div>

                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-[var(--color-ink)]">
                    {resena.comentario}
                  </p>

                  <p className="mt-2 text-xs text-[var(--color-subtle)]">
                    {resena.totalReportes}{" "}
                    {resena.totalReportes === 1 ? "reporte" : "reportes"} ·{" "}
                    {resena.reportesPendientes} pendientes
                  </p>

                  {resena.reportes.length > 0 && (
                    <details className="mt-3 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-3">
                      <summary
                        className={`cursor-pointer text-xs font-semibold text-[var(--color-ink)] ${CLASE_FOCO}`}
                      >
                        Ver reportes ({resena.reportes.length})
                      </summary>
                      <ul className="mt-2 space-y-2">
                        {resena.reportes.map((reporte) => (
                          <li
                            key={reporte.idReporte}
                            className="rounded-md border border-[var(--color-hairline)] bg-[var(--color-paper)] p-2.5 text-xs"
                          >
                            <p className="font-semibold text-[var(--color-ink)]">
                              {etiquetaMotivo(reporte.motivo)} ·{" "}
                              {etiquetaEstado(reporte.estado)}
                            </p>
                            <p className="mt-0.5 text-[var(--color-subtle)]">
                              Reportado por {reporte.nombreReportante} ·{" "}
                              {formatearFecha(reporte.fechaCreacion)}
                            </p>
                            {reporte.descripcion && (
                              <p className="mt-1 text-[var(--color-ink)]">
                                {reporte.descripcion}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}

                  {esAdmin && (
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--color-hairline)] pt-3">
                      {resena.ocultaPorReportes ? (
                        <button
                          type="button"
                          onClick={() => ejecutarAccion(resena, "publicar")}
                          disabled={accionEnCurso !== null}
                          aria-label={`Publicar reseña de ${resena.nombreAutor}`}
                          className={`cursor-pointer rounded-md border border-[var(--color-hairline)] px-3 py-1.5 text-xs font-semibold text-[var(--color-brand-blue)] transition-colors hover:border-[var(--color-brand-blue)] disabled:cursor-not-allowed disabled:opacity-50 ${CLASE_FOCO}`}
                        >
                          {accionActual(resena.idResena, "publicar")
                            ? "Publicando…"
                            : "Publicar reseña"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => ejecutarAccion(resena, "ocultar")}
                          disabled={accionEnCurso !== null}
                          aria-label={`Ocultar reseña de ${resena.nombreAutor}`}
                          className={`cursor-pointer rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:border-red-400 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 ${CLASE_FOCO}`}
                        >
                          {accionActual(resena.idResena, "ocultar")
                            ? "Ocultando…"
                            : "Ocultar reseña"}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          ejecutarAccion(resena, "rechazar-reportes")
                        }
                        disabled={
                          accionEnCurso !== null ||
                          resena.reportesPendientes === 0
                        }
                        aria-label={`Rechazar reportes de ${resena.nombreAutor}`}
                        className={`cursor-pointer rounded-md border border-[var(--color-hairline)] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink)] transition-colors hover:border-[var(--color-brand-blue)] disabled:cursor-not-allowed disabled:opacity-50 ${CLASE_FOCO}`}
                      >
                        {accionActual(resena.idResena, "rechazar-reportes")
                          ? "Rechazando…"
                          : "Rechazar reportes"}
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
