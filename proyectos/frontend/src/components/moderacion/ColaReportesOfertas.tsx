"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type {
  AccionReporteOferta,
  EstadoReporte,
  ReporteOfertaModeracionResponse,
} from "@/types/moderacion";
import {
  ApiError,
  decidirReporteOferta,
  obtenerReportesOfertaModeracion,
} from "@/services/api";
import EstadoVacio from "@/components/ui/EstadoVacio";
import { CLASE_FOCO } from "@/components/ui/foco";

export const MENSAJE_JUSTIFICACION_RECHAZO_OFERTA =
  "La justificación es obligatoria para rechazar un reporte.";

const ETIQUETA_MOTIVO: Record<ReporteOfertaModeracionResponse["motivo"], string> = {
  precio_incorrecto: "Precio incorrecto",
  enlace_incorrecto: "Enlace incorrecto",
};

const ETIQUETA_ESTADO: Record<EstadoReporte, string> = {
  PENDIENTE: "Pendiente",
  EN_REVISION: "En revisión",
  ACEPTADO: "Aceptado",
  RECHAZADO: "Rechazado",
};

const CLASE_ESTADO: Record<EstadoReporte, string> = {
  PENDIENTE: "bg-surface-2 text-star",
  EN_REVISION: "bg-surface-2 text-ink",
  ACEPTADO: "bg-surface-2 text-ink",
  RECHAZADO: "bg-surface-2 text-subtle",
};

const FILTROS: { valor: EstadoReporte | ""; etiqueta: string }[] = [
  { valor: "", etiqueta: "Abiertos" },
  { valor: "PENDIENTE", etiqueta: "Pendientes" },
  { valor: "EN_REVISION", etiqueta: "En revisión" },
  { valor: "ACEPTADO", etiqueta: "Aceptados" },
  { valor: "RECHAZADO", etiqueta: "Rechazados" },
];

const formatoPrecio = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

function formatearFecha(valor: string): string {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(fecha);
}

function esAbierto(estado: EstadoReporte): boolean {
  return estado === "PENDIENTE" || estado === "EN_REVISION";
}

/**
 * Cola de reportes de precio y enlace incorrectos (Fase 2, H-05).
 * Cada decisión queda en el historial con el moderador, la fecha y la
 * justificación. Aceptar no cambia el precio: se corrige desde la
 * administración de establecimientos.
 */
/**
 * `onCambio` avisa al panel tras cada decisión para actualizar el contador de
 * pendientes.
 */
export default function ColaReportesOfertas({ onCambio }: { onCambio?: () => void } = {}) {
  const [filtro, setFiltro] = useState<EstadoReporte | "">("");
  const [reportes, setReportes] = useState<ReporteOfertaModeracionResponse[] | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const [justificaciones, setJustificaciones] = useState<Record<number, string>>({});
  const [errorJustificacion, setErrorJustificacion] = useState<number | null>(null);
  const [enCurso, setEnCurso] = useState<{ idReporte: number; accion: AccionReporteOferta } | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    obtenerReportesOfertaModeracion(filtro || undefined)
      .then((datos) => {
        if (!activo) return;
        // «Abiertos» muestra lo que aún requiere una decisión.
        setReportes(filtro === "" ? datos.filter((r) => esAbierto(r.estado)) : datos);
        setErrorCarga(null);
      })
      .catch((err: unknown) => {
        if (!activo) return;
        setErrorCarga(
          err instanceof Error ? err.message : "No fue posible cargar los reportes de ofertas.",
        );
      });
    return () => {
      activo = false;
    };
  }, [filtro, intento]);

  function cambiarFiltro(valor: EstadoReporte | "") {
    if (valor === filtro) return;
    setReportes(null);
    setFiltro(valor);
  }

  async function decidir(reporte: ReporteOfertaModeracionResponse, accion: AccionReporteOferta) {
    if (enCurso) return;
    const motivo = (justificaciones[reporte.idReporte] ?? "").trim();
    if (accion === "rechazar" && motivo === "") {
      setErrorJustificacion(reporte.idReporte);
      setMensajeExito(null);
      setErrorAccion(null);
      return;
    }

    setErrorJustificacion(null);
    setEnCurso({ idReporte: reporte.idReporte, accion });
    setMensajeExito(null);
    setErrorAccion(null);

    try {
      const actualizado = await decidirReporteOferta(reporte.idReporte, accion, motivo || undefined);
      setReportes((previos) => {
        if (!previos) return previos;
        const sigueVisible = filtro === "" ? esAbierto(actualizado.estado) : actualizado.estado === filtro;
        return sigueVisible
          ? previos.map((r) => (r.idReporte === actualizado.idReporte ? actualizado : r))
          : previos.filter((r) => r.idReporte !== actualizado.idReporte);
      });
      setJustificaciones((previas) => ({ ...previas, [reporte.idReporte]: "" }));
      const oferta = `${reporte.nombreProducto ?? "el producto"} en ${reporte.nombreEstablecimiento ?? "la tienda"}`;
      onCambio?.();
      setMensajeExito(
        accion === "en-revision"
          ? `Tomaste el reporte sobre ${oferta}.`
          : accion === "aceptar"
            ? `Reporte sobre ${oferta} aceptado. Recuerda corregir el dato de la oferta.`
            : `Reporte sobre ${oferta} rechazado.`,
      );
    } catch (err) {
      setErrorAccion(err instanceof ApiError ? err.message : "No fue posible registrar la decisión.");
    } finally {
      setEnCurso(null);
    }
  }

  const accionActual = (idReporte: number, accion: AccionReporteOferta) =>
    enCurso?.idReporte === idReporte && enCurso.accion === accion;

  return (
    <div>
      <p className="mt-3 rounded-card border border-line bg-canvas p-3 text-xs text-subtle">
        Usuarios registrados reportaron estas ofertas por un precio o un enlace incorrecto.
        Compara el reporte con el precio actual. Aceptar no cambia la oferta: corrígela desde la
        administración de establecimientos. Rechazar exige una justificación; cada paso queda
        registrado con tu usuario y la fecha.
      </p>

      <div role="group" aria-label="Filtrar reportes de ofertas por estado" className="mt-3 flex flex-wrap gap-1">
        {FILTROS.map((opcion) => (
          <button
            key={opcion.valor || "abiertos"}
            type="button"
            aria-pressed={filtro === opcion.valor}
            onClick={() => cambiarFiltro(opcion.valor)}
            className={`cursor-pointer rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
              filtro === opcion.valor
                ? "border-brand-solid bg-brand-solid text-on-solid"
                : "border-line text-subtle hover:text-ink"
            } ${CLASE_FOCO}`}
          >
            {opcion.etiqueta}
          </button>
        ))}
      </div>

      {mensajeExito && (
        <p role="status" className="mt-3 rounded-card border border-surface-border-strong bg-surface-2 p-3 text-xs text-ink">
          {mensajeExito}
        </p>
      )}

      {errorAccion && (
        <p role="alert" className="mt-3 rounded-card border border-status-error bg-paper p-3 text-xs text-status-error">
          {errorAccion}
        </p>
      )}

      <div className="mt-4">
        {errorCarga ? (
          <EstadoVacio
            tipo="error"
            titulo="No pudimos cargar los reportes de ofertas"
            descripcion={errorCarga}
            accion={{ etiqueta: "Reintentar", onClick: () => setIntento((valor) => valor + 1) }}
          />
        ) : reportes === null ? (
          <p role="status" aria-busy="true" className="py-10 text-center text-sm text-subtle">
            Cargando reportes de ofertas…
          </p>
        ) : reportes.length === 0 ? (
          <EstadoVacio
            titulo="No hay reportes de ofertas"
            descripcion={
              filtro === ""
                ? "No hay reportes de precio o enlace esperando una decisión."
                : "No hay reportes de ofertas con este estado."
            }
          />
        ) : (
          <ul className="space-y-4" aria-label="Reportes de ofertas">
            {reportes.map((reporte) => (
              <li
                key={reporte.idReporte}
                className="rounded-card border border-line bg-paper p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-medium text-ink">
                      <Link
                        href={`/productos/${reporte.idProducto}`}
                        className={`text-brand-blue hover:underline ${CLASE_FOCO}`}
                      >
                        {reporte.nombreProducto ?? `Producto #${reporte.idProducto}`}
                      </Link>
                      {" · "}
                      {reporte.nombreEstablecimiento ?? `Tienda #${reporte.idEstablecimiento}`}
                    </h3>
                    <p className="mt-1 text-xs text-subtle">
                      Reportado por {reporte.nombreUsuario ?? "Usuario"} · {formatearFecha(reporte.fechaCreacion)}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${CLASE_ESTADO[reporte.estado]}`}>
                    {ETIQUETA_ESTADO[reporte.estado]}
                  </span>
                </div>

                <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
                  <div>
                    <dt className="inline text-subtle">Motivo: </dt>
                    <dd className="inline font-medium text-ink">{ETIQUETA_MOTIVO[reporte.motivo] ?? reporte.motivo}</dd>
                  </div>
                  <div>
                    <dt className="inline text-subtle">Precio actual: </dt>
                    <dd className="inline font-medium text-ink">
                      {reporte.precioActual !== null ? formatoPrecio.format(reporte.precioActual) : "Sin precio registrado"}
                      {reporte.disponibilidadActual === false && " · No disponible"}
                    </dd>
                  </div>
                </dl>

                {reporte.descripcion && (
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink">
                    {reporte.descripcion}
                  </p>
                )}

                {reporte.historial.length > 0 && (
                  <ol className="mt-3 space-y-1 border-l-2 border-line pl-3" aria-label="Historial del reporte">
                    {reporte.historial.map((evento) => (
                      <li key={evento.idHistorial} className="text-[11px] text-subtle">
                        {ETIQUETA_ESTADO[evento.estadoNuevo]} por {evento.nombreModerador ?? "moderación"} ·{" "}
                        {formatearFecha(evento.fechaEvento)}
                        {evento.justificacion && ` — ${evento.justificacion}`}
                      </li>
                    ))}
                  </ol>
                )}

                {esAbierto(reporte.estado) && (
                  <div className="mt-3 border-t border-line pt-3">
                    <label
                      htmlFor={`justificacion-oferta-${reporte.idReporte}`}
                      className="block text-xs font-medium text-subtle"
                    >
                      Justificación
                      <textarea
                        id={`justificacion-oferta-${reporte.idReporte}`}
                        value={justificaciones[reporte.idReporte] ?? ""}
                        onChange={(evento) => {
                          const valor = evento.target.value;
                          setJustificaciones((previas) => ({ ...previas, [reporte.idReporte]: valor }));
                          if (errorJustificacion === reporte.idReporte && valor.trim() !== "") {
                            setErrorJustificacion(null);
                          }
                        }}
                        rows={2}
                        maxLength={2000}
                        className={`mt-1 block w-full rounded-card border border-line bg-paper px-3 py-1.5 text-sm text-ink focus:border-brand-blue ${CLASE_FOCO}`}
                      />
                    </label>
                    <p className="mt-1 text-[11px] text-subtle">
                      Obligatoria para rechazar; opcional para tomar o aceptar.
                    </p>

                    {errorJustificacion === reporte.idReporte && (
                      <p role="alert" className="mt-2 rounded-card border border-status-error bg-paper p-2 text-xs text-status-error">
                        {MENSAJE_JUSTIFICACION_RECHAZO_OFERTA}
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap gap-2">
                      {reporte.estado === "PENDIENTE" && (
                        <button
                          type="button"
                          onClick={() => decidir(reporte, "en-revision")}
                          disabled={enCurso !== null}
                          aria-label={`Tomar reporte ${reporte.idReporte}`}
                          className={`cursor-pointer rounded-card border border-line px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-brand-blue disabled:cursor-not-allowed disabled:opacity-50 ${CLASE_FOCO}`}
                        >
                          {accionActual(reporte.idReporte, "en-revision") ? "Tomando…" : "Tomar para revisar"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => decidir(reporte, "aceptar")}
                        disabled={enCurso !== null}
                        aria-label={`Aceptar reporte ${reporte.idReporte}`}
                        className={`cursor-pointer rounded-card border border-line px-3 py-1.5 text-xs font-medium text-brand-blue transition-colors hover:border-brand-blue disabled:cursor-not-allowed disabled:opacity-50 ${CLASE_FOCO}`}
                      >
                        {accionActual(reporte.idReporte, "aceptar") ? "Aceptando…" : "Aceptar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => decidir(reporte, "rechazar")}
                        disabled={enCurso !== null}
                        aria-label={`Rechazar reporte ${reporte.idReporte}`}
                        className={`cursor-pointer rounded-card border border-status-error px-3 py-1.5 text-xs font-medium text-status-error transition-colors hover:border-status-error hover:bg-paper disabled:cursor-not-allowed disabled:opacity-50 ${CLASE_FOCO}`}
                      >
                        {accionActual(reporte.idReporte, "rechazar") ? "Rechazando…" : "Rechazar"}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
