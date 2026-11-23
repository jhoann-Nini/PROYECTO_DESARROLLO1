"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { UsuarioSesion } from "@/types/producto";
import { puedeModerar } from "@/types/producto";
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
import ColaRevisionAutomatica from "@/components/moderacion/ColaRevisionAutomatica";
import ColaReportesOfertas from "@/components/moderacion/ColaReportesOfertas";
import { atraparTabulacion, CLASE_FOCO } from "@/components/ui/foco";
import ContadorPendientes from "@/components/moderacion/ContadorPendientes";
import { useResumenPendientesModeracion } from "@/hooks/useResumenPendientesModeracion";

interface PanelModeracionModalProps {
  isOpen: boolean;
  onClose: () => void;
  usuarioSesion: UsuarioSesion | null;
}

type AccionModeracion = "ocultar" | "publicar" | "rechazar-reportes";
type PestanaModeracion = "reportes" | "revision" | "ofertas";

function puedeRechazarReportes(resena: ResenaReportadaResponse): boolean {
  return (
    resena.reportesPendientes === 0 &&
    resena.reportes.some((reporte) => reporte.estado === "EN_REVISION")
  );
}

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

const MENSAJE_JUSTIFICACION_OBLIGATORIA =
  "La justificación es obligatoria para ocultar o publicar esta reseña.";

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
  const abierto = isOpen && autorizado;

  const [pestana, setPestana] = useState<PestanaModeracion>("reportes");
  const { resumen, recargar: recargarResumen } = useResumenPendientesModeracion(abierto);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const [filtroEstado, setFiltroEstado] = useState<EstadoReporte | "">("");
  const [soloOcultas, setSoloOcultas] = useState(false);
  const [justificaciones, setJustificaciones] = useState<
    Record<number, string>
  >({});
  const [errorJustificacion, setErrorJustificacion] = useState<number | null>(
    null,
  );
  const [accionEnCurso, setAccionEnCurso] = useState<{
    idResena: number;
    tipo: AccionModeracion;
  } | null>(null);

  const tituloId = useId();
  const cerrarRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
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
    setJustificaciones({});
    setErrorJustificacion(null);
    setPestana("reportes");
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!abierto) return;

    const overflowPrevio = document.body.style.overflow;
    const activador = document.activeElement instanceof HTMLElement ? document.activeElement : null;
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
      activador?.focus();
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
    if (accionEnCurso) return;

    const motivo = (justificaciones[resena.idResena] ?? "").trim();
    if (tipo !== "rechazar-reportes" && motivo === "") {
      setErrorJustificacion(resena.idResena);
      setErrorAccion(null);
      setMensajeExito(null);
      return;
    }

    setErrorJustificacion(null);
    setAccionEnCurso({ idResena: resena.idResena, tipo });
    setErrorAccion(null);
    setMensajeExito(null);

    try {
      const actualizada =
        tipo === "ocultar"
          ? await ocultarResenaReportada(resena.idResena, motivo || undefined)
          : tipo === "publicar"
            ? await publicarResenaReportada(resena.idResena, motivo || undefined)
            : await rechazarReportesResenaReportada(
                resena.idResena,
                motivo || undefined,
              );

      setResultado((previo) =>
        previo && previo.clave === claveConsulta
          ? {
              clave: previo.clave,
              resenas: previo.resenas
                .map((item) => item.idResena === actualizada.idResena ? actualizada : item)
                .filter((item) =>
                  (!soloOcultas || item.ocultaPorReportes || item.ocultaPorModeracion) &&
                  (!filtroEstado || item.reportes.some((reporte) => reporte.estado === filtroEstado)),
                ),
            }
          : previo,
      );
      setJustificaciones((previas) => ({
        ...previas,
        [resena.idResena]: "",
      }));
      recargarResumen();
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
      ref={panelRef}
      onKeyDown={(evento) => atraparTabulacion(evento, panelRef.current)}
      role="dialog"
      aria-modal="true"
      aria-labelledby={tituloId}
       className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-[var(--color-inverse)]/45 p-2 sm:p-4 backdrop-blur-sm"
    >
       <div className="relative flex max-h-[96dvh] w-full max-w-5xl animate-scale-in flex-col rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-paper)] p-3 text-[var(--color-ink)] shadow-[var(--shadow-paper-hover)] sm:max-h-[92dvh] sm:p-6">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--color-hairline)] pb-4">
           <div className="min-w-0">
            <h2
              id={tituloId}
              className="text-lg font-semibold tracking-tight text-[var(--color-ink)]"
            >
              Moderación de reseñas
            </h2>
             <p className="mt-1 break-words text-xs text-[var(--color-subtle)]">
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
        <div
          role="tablist"
          aria-label="Colas de moderación"
          className="mt-3 flex shrink-0 gap-1 border-b border-[var(--color-hairline)]"
        >
          {([
            { id: "reportes", etiqueta: "Reseñas reportadas", pendientes: resumen?.reportesResenas },
            { id: "revision", etiqueta: "Revisión automática", pendientes: resumen?.revisionAutomatica },
            { id: "ofertas", etiqueta: "Reportes de ofertas", pendientes: resumen?.reportesOfertas },
          ] as const).map((opcion) => (
            <button
              key={opcion.id}
              type="button"
              role="tab"
              id={`${tituloId}-tab-${opcion.id}`}
              aria-selected={pestana === opcion.id}
              aria-controls={`${tituloId}-panel-${opcion.id}`}
              onClick={() => setPestana(opcion.id)}
              className={`-mb-px cursor-pointer border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${
                pestana === opcion.id
                  ? "border-[var(--color-brand-blue)] text-[var(--color-ink)]"
                  : "border-transparent text-[var(--color-subtle)] hover:text-[var(--color-ink)]"
              } ${CLASE_FOCO}`}
            >
              {opcion.etiqueta}
              <ContadorPendientes cantidad={opcion.pendientes} />
            </button>
          ))}
        </div>

        {pestana === "ofertas" ? (
          <div
            role="tabpanel"
            id={`${tituloId}-panel-ofertas`}
            aria-labelledby={`${tituloId}-tab-ofertas`}
            className="overflow-y-auto pr-1"
          >
            <ColaReportesOfertas onCambio={recargarResumen} />
          </div>
        ) : pestana === "revision" ? (
          <div
            role="tabpanel"
            id={`${tituloId}-panel-revision`}
            aria-labelledby={`${tituloId}-tab-revision`}
            className="overflow-y-auto pr-1"
          >
            <ColaRevisionAutomatica onCambio={recargarResumen} />
          </div>
        ) : (
        <div
          role="tabpanel"
          id={`${tituloId}-panel-reportes`}
          aria-labelledby={`${tituloId}-tab-reportes`}
          className="flex min-h-0 flex-col"
        >
        <p className="mt-3 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-3 text-xs text-[var(--color-subtle)]">
          Esta cola incluye solo reseñas reportadas. Los reportes de precios y enlaces están en la pestaña «Reportes de ofertas».
        </p>

        <div
          role="group"
          aria-label="Filtros de moderación"
          className="mt-4 flex flex-wrap items-end gap-4 border-b border-[var(--color-hairline)] pb-3"
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
               titulo={filtroEstado || soloOcultas ? "Ninguna reseña coincide con los filtros" : "No hay reseñas reportadas"}
               descripcion={filtroEstado || soloOcultas
                 ? "Prueba otro estado o desactiva el filtro de reseñas ocultas."
                 : "La consulta actual no devolvió reseñas reportadas; esto no confirma que todos los reportes estén resueltos."}
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
                        resena.ocultaPorModeracion
                          ? "bg-amber-100 text-amber-800"
                          : resena.ocultaPorReportes
                            ? "bg-red-100 text-red-800"
                            : "bg-[var(--color-positive)]/15 text-[var(--color-ink)]"
                      }`}
                    >
                      {resena.ocultaPorModeracion
                        ? "Oculta por moderación"
                        : resena.ocultaPorReportes
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

                  <div className="mt-3 border-t border-[var(--color-hairline)] pt-3">
                    <label
                      htmlFor={`justificacion-${resena.idResena}`}
                      className="block text-xs font-medium text-[var(--color-subtle)]"
                    >
                      Justificación
                      <textarea
                        id={`justificacion-${resena.idResena}`}
                        value={justificaciones[resena.idResena] ?? ""}
                        onChange={(evento) => {
                          const valor = evento.target.value;
                          setJustificaciones((previas) => ({
                            ...previas,
                            [resena.idResena]: valor,
                          }));
                          if (
                            errorJustificacion === resena.idResena &&
                            valor.trim() !== ""
                          ) {
                            setErrorJustificacion(null);
                          }
                        }}
                        rows={2}
                        maxLength={2000}
                        className={`mt-1 block w-full rounded-md border border-[var(--color-hairline)] bg-[var(--color-paper)] px-3 py-1.5 text-sm text-[var(--color-ink)] focus:border-[var(--color-brand-blue)] ${CLASE_FOCO}`}
                      />
                    </label>
                    <p className="mt-1 text-[11px] text-[var(--color-subtle)]">
                      Obligatoria para ocultar o publicar; opcional para
                      rechazar reportes.
                    </p>

                    {errorJustificacion === resena.idResena && (
                      <p
                        role="alert"
                        className="mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700"
                      >
                        {MENSAJE_JUSTIFICACION_OBLIGATORIA}
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap gap-2">
                      {resena.ocultaPorModeracion ? (
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
                          !puedeRechazarReportes(resena)
                        }
                        aria-label={`Rechazar reportes de ${resena.nombreAutor}`}
                        className={`cursor-pointer rounded-md border border-[var(--color-hairline)] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink)] transition-colors hover:border-[var(--color-brand-blue)] disabled:cursor-not-allowed disabled:opacity-50 ${CLASE_FOCO}`}
                      >
                        {accionActual(resena.idResena, "rechazar-reportes")
                          ? "Rechazando…"
                          : "Rechazar reportes"}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        </div>
        )}
      </div>
    </div>
  );
}
